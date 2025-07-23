from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Payment
from appointments.models import Appointment
from .serializers import PaymentSerializer
import uuid
from django.core.mail import send_mail
from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from io import BytesIO


class CreatePaymentView(generics.CreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        service = serializer.validated_data['service']
        montant = serializer.validated_data['montant']
        transaction_id = str(uuid.uuid4())

        # Crée le paiement
        paiement = serializer.save(
            client=self.request.user,
            statut='valide',
            transaction_id=transaction_id
        )

        # Crée automatiquement un rendez-vous lié
        appointment = Appointment.objects.create(
            client=self.request.user,
            service=service,
            date_rdv=self.request.data.get('date_rdv'),
            statut='confirme',
            commentaires=self.request.data.get('commentaires', '')
        )

        # Associe le rendez-vous au paiement
        paiement.appointment = appointment
        paiement.save()

        # Notification par email
        send_mail(
            subject="Paiement réussi et rendez-vous confirmé",
            message=f"Bonjour {self.request.user.username},\n\nVotre paiement pour '{service.titre}' a été validé.\nDate du rendez-vous : {appointment.date_rdv}.",
            from_email="noreply@tonsite.com",
            recipient_list=[self.request.user.email],
            fail_silently=True
        )


class ClientPaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(client=self.request.user).order_by('-date_paiement')


class ArtisanPaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.filter(service__artisan=self.request.user).order_by('-date_paiement')
        statut = self.request.query_params.get('statut')
        date = self.request.query_params.get('date')

        if statut:
            qs = qs.filter(statut=statut)
        if date:
            qs = qs.filter(date_paiement__date=date)

        return qs

class PaymentReceiptPDFView(generics.RetrieveAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        payment = self.get_object()

        # Vérifie si l'utilisateur a le droit de voir ce reçu
        if request.user != payment.client and request.user != payment.service.artisan:
            return Response({"error": "Non autorisé"}, status=403)

        # Montant final calculé
        montant_final = payment.montant_initial - payment.reduction if payment.reduction else payment.montant_initial

        # Chargement du template HTML
        template = get_template('payments/receipt.html')
        context = {
            "payment": payment,
            "montant_final": montant_final,
        }

        html = template.render(context)

        # Génération du PDF
        buffer = BytesIO()
        pisa_status = pisa.CreatePDF(html, dest=buffer)

        if pisa_status.err:
            return Response({"error": "Erreur lors de la génération du PDF."}, status=500)

        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="recu_{payment.id}.pdf"'
        return response



