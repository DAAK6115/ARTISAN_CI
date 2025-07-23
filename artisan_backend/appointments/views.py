from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.core.mail import send_mail
from .models import Appointment
from payments.models import Payment
from .serializers import AppointmentSerializer
from rest_framework.views import APIView
from datetime import timedelta  # ⚠️ à remplacer par ta vraie clé
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from notifications.models import Notification
import openai

class CreateAppointmentView(generics.CreateAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        service = serializer.validated_data.get('service')
        date_rdv = serializer.validated_data.get('date_rdv')

        same_time = Appointment.objects.filter(
            service__artisan=service.artisan,
            date_rdv=date_rdv,
            statut__in=['en_attente', 'confirme']
        )
        if same_time.exists():
            raise ValidationError("L'artisan a déjà un rendez-vous à cette heure-là.")

        rdv = serializer.save(client=self.request.user)

        send_mail(
            subject="Nouveau rendez-vous",
            message=f"Un client a réservé : {service.titre} \nDate : {date_rdv}",
            from_email="noreply@tonsite.com",
            recipient_list=[service.artisan.email],
            fail_silently=True
        )


class MyAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(client=self.request.user)

class ArtisanAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(service__artisan=self.request.user)


class UpdateAppointmentStatusView(generics.UpdateAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def patch(self, request, *args, **kwargs):
        appointment = self.get_object()
        new_status = request.data.get('statut')

        if new_status not in dict(Appointment.STATUT_CHOICES):
            return Response({"error": "Statut invalide."}, status=400)

        # ✅ Cas d’annulation par le client
        if new_status == "annule" and request.user == appointment.client:
            if appointment.date_rdv - timezone.now() < timedelta(days=3):
                return Response(
                    {"error": "Vous ne pouvez plus annuler ce rendez-vous (moins de 3 jours)."},
                    status=403
                )
            appointment.statut = "annule"
            appointment.save()
            return Response({"message": "Rendez-vous annulé avec succès."})

        # 🔒 Seul l’artisan peut confirmer ou clôturer
        if request.user != appointment.service.artisan:
            return Response({"error": "Non autorisé."}, status=403)

        # 📦 Mise à jour des champs facultatifs (même si pas "effectue")
        appointment.statut = new_status
        appointment.methode_paiement = request.data.get('methode_paiement') or appointment.methode_paiement

        try:
            appointment.note_client = int(request.data.get('note_client', appointment.note_client))
        except (ValueError, TypeError):
            appointment.note_client = None

        try:
            appointment.rating = int(request.data.get('rating', appointment.rating))
        except (ValueError, TypeError):
            appointment.rating = None

        try:
            appointment.montant = float(request.data.get('montant', appointment.montant))
        except (ValueError, TypeError):
            appointment.montant = None

        # ✨ Si prestation effectuée
        if new_status == "effectue":
            # 🔔 Email de remerciement + notification + résumé
            try:
                send_mail(
                    subject="Merci pour votre rendez-vous",
                    message=f"Bonjour {appointment.client.username}, pensez à laisser un avis pour : {appointment.service.titre}",
                    from_email="noreply@tonsite.com",
                    recipient_list=[appointment.client.email],
                    fail_silently=True
                )

                prompt = f"Rédige un bref résumé professionnel de la prestation intitulée : '{appointment.service.titre}'"
                completion = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}]
                )
                summary = completion.choices[0].message['content'].strip()
                appointment.resume = summary

            except Exception as e:
                print(f"Erreur OpenAI : {e}")

            # 📩 Créer une notification pour inviter à noter
            Notification.objects.create(
                destinataire=appointment.client,
                titre="📝 Notez votre prestation",
                message=f"Merci d'avoir réservé {appointment.service.titre}. Partagez votre avis avec une note et un commentaire !",
                lien_redirection=f"/client/avis/ajouter/{appointment.id}/"
            )

            # 💳 Mise à jour du paiement lié
            try:
                payment = appointment.payment  # OneToOne
                reduction_value = float(request.data.get('reduction', 0))

                payment.reduction = reduction_value
                payment.montant_initial = appointment.service.prix
                payment.montant = payment.montant_initial - reduction_value
                payment.methode_paiement = request.data.get('methode_paiement') or payment.methode_paiement
                payment.save()

            except Exception as e:
                print(f"❌ Erreur lors de la mise à jour du paiement : {e}")

        # ✅ Sauvegarde finale
        appointment.save()
        return Response({"message": f"Statut mis à jour : {new_status}"})


    


class ConfirmerAppointmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk, client=request.user)
        except Appointment.DoesNotExist:
            return Response({"error": "Rendez-vous introuvable ou non autorisé."}, status=404)

        if appointment.statut == "effectue":
            return Response({"error": "Ce rendez-vous a déjà été confirmé comme effectué."}, status=400)

        note = request.data.get('note_client')
        commentaire = request.data.get('commentaire_client')
        methode = request.data.get('methode_paiement')

        if not methode:
            return Response({"error": "La méthode de paiement est requise."}, status=400)

        appointment.statut = "effectue"
        appointment.methode_paiement = methode
        appointment.note_client = note
        appointment.commentaire_client = commentaire
        appointment.save()

        return Response({"message": "Rendez-vous confirmé avec succès."}, status=200)

class AppointmentDetailView(RetrieveAPIView):
    queryset = Appointment.objects.select_related("service")  # ✅ CORRECTION ICI
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        print("🔐 Utilisateur dans la vue :", request.user)
        print("🔐 Authentifié ?", request.user.is_authenticated)
        return super().get(request, *args, **kwargs)
