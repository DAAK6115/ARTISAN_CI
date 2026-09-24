import logging
from datetime import timedelta

import openai
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsArtisan, IsClient
from notifications.models import Notification
from payments.models import Payment
from .models import Appointment
from .serializers import AppointmentSerializer

logger = logging.getLogger(__name__)


class CreateAppointmentView(generics.CreateAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsClient]

    def perform_create(self, serializer):
        service = serializer.validated_data.get("service")
        date_rdv = serializer.validated_data.get("date_rdv")

        if not service.is_active or not service.artisan.is_active:
            raise ValidationError("Cette prestation n'est pas disponible.")

        if date_rdv <= timezone.now():
            raise ValidationError("La date du rendez-vous doit être dans le futur.")

        same_time = Appointment.objects.filter(
            service__artisan=service.artisan,
            date_rdv=date_rdv,
            statut__in=["en_attente", "confirme"],
        )
        if same_time.exists():
            raise ValidationError(
                "L'artisan a déjà un rendez-vous à cette heure-là."
            )

        serializer.save(client=self.request.user)

        try:
            send_mail(
                subject="Nouveau rendez-vous",
                message=(
                    f"Un client a réservé : {service.titre}\n"
                    f"Date : {date_rdv}"
                ),
                from_email=None,
                recipient_list=[service.artisan.email],
                fail_silently=False,
            )
        except Exception:
            # La réservation reste valide même si l'email échoue.
            logger.exception("Échec d'envoi de l'email de nouveau rendez-vous.")


class MyAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return Appointment.objects.filter(client=self.request.user)


class ArtisanAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return Appointment.objects.filter(service__artisan=self.request.user)


class UpdateAppointmentStatusView(generics.UpdateAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def patch(self, request, *args, **kwargs):
        appointment = self.get_object()
        new_status = request.data.get("statut")

        if (
            request.user != appointment.client
            and request.user != appointment.service.artisan
            and request.user.role != "admin"
        ):
            return Response(
                {"error": "Non autorisé."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if new_status not in dict(Appointment.STATUT_CHOICES):
            return Response(
                {"error": "Statut invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == "annule" and request.user == appointment.client:
            if appointment.date_rdv - timezone.now() < timedelta(days=3):
                return Response(
                    {
                        "error": (
                            "Vous ne pouvez plus annuler ce rendez-vous "
                            "(moins de 3 jours)."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            appointment.statut = "annule"
            appointment.save(update_fields=["statut", "updated_at"])
            return Response({"message": "Rendez-vous annulé avec succès."})

        if (
            request.user != appointment.service.artisan
            and request.user.role != "admin"
        ):
            return Response(
                {"error": "Non autorisé."},
                status=status.HTTP_403_FORBIDDEN,
            )

        appointment.statut = new_status
        appointment.methode_paiement = (
            request.data.get("methode_paiement")
            or appointment.methode_paiement
        )

        try:
            appointment.note_client = int(
                request.data.get("note_client", appointment.note_client)
            )
        except (ValueError, TypeError):
            appointment.note_client = None

        try:
            appointment.rating = int(
                request.data.get("rating", appointment.rating)
            )
        except (ValueError, TypeError):
            appointment.rating = None

        try:
            appointment.montant = float(
                request.data.get("montant", appointment.montant)
            )
        except (ValueError, TypeError):
            appointment.montant = None

        if new_status == "effectue":
            try:
                send_mail(
                    subject="Merci pour votre rendez-vous",
                    message=(
                        f"Bonjour {appointment.client.username}, "
                        f"pensez à laisser un avis pour : {appointment.service.titre}"
                    ),
                    from_email=None,
                    recipient_list=[appointment.client.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception("Échec d'envoi de l'email de fin de prestation.")

            try:
                prompt = (
                    "Rédige un bref résumé professionnel de la prestation "
                    f"intitulée : '{appointment.service.titre}'"
                )
                completion = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                )
                appointment.resume = completion.choices[0].message["content"].strip()
            except Exception:
                logger.exception("Échec de génération du résumé de prestation.")

            Notification.objects.create(
                destinataire=appointment.client,
                titre="📝 Notez votre prestation",
                message=(
                    f"Merci d'avoir réservé {appointment.service.titre}. "
                    "Partagez votre avis avec une note et un commentaire !"
                ),
                lien_redirection=f"/client/avis/ajouter/{appointment.id}/",
            )

            try:
                payment = appointment.payment
                reduction_value = float(request.data.get("reduction", 0))
                payment.reduction = reduction_value
                payment.montant_initial = appointment.service.prix
                payment.montant = payment.montant_initial - reduction_value
                payment.methode_paiement = (
                    request.data.get("methode_paiement")
                    or payment.methode_paiement
                )
                payment.save()
            except Payment.DoesNotExist:
                logger.info(
                    "Aucun paiement lié au rendez-vous %s.",
                    appointment.pk,
                )
            except (TypeError, ValueError):
                return Response(
                    {"error": "Réduction invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        appointment.save()
        return Response({"message": f"Statut mis à jour : {new_status}"})


class ConfirmerAppointmentView(APIView):
    permission_classes = [IsClient]

    def post(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk, client=request.user)
        except Appointment.DoesNotExist:
            return Response(
                {"error": "Rendez-vous introuvable ou non autorisé."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if appointment.statut == "effectue":
            return Response(
                {"error": "Ce rendez-vous a déjà été confirmé comme effectué."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        methode = request.data.get("methode_paiement")
        if not methode:
            return Response(
                {"error": "La méthode de paiement est requise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.statut = "effectue"
        appointment.methode_paiement = methode
        appointment.note_client = request.data.get("note_client")
        appointment.commentaire_client = request.data.get("commentaire_client")
        appointment.save()

        return Response(
            {"message": "Rendez-vous confirmé avec succès."},
            status=status.HTTP_200_OK,
        )


class AppointmentDetailView(RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return Appointment.objects.select_related("service", "client")

        return Appointment.objects.select_related(
            "service",
            "client",
            "service__artisan",
        ).filter(
            Q(client=user) | Q(service__artisan=user)
        )
