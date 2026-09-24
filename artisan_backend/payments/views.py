from io import BytesIO

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import get_template
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from xhtml2pdf import pisa

from accounts.permissions import IsArtisan, IsClient
from appointments.domain import transition_appointment
from appointments.models import Appointment
from notifications.models import Notification
from .models import Payment, Quote
from .serializers import (
    PaymentDeclarationSerializer,
    PaymentSerializer,
    QuoteSerializer,
)
from .services import (
    contract_total_for,
    declare_payment,
    payment_workspace_for,
)


class ArtisanQuoteListCreateView(generics.ListCreateAPIView):
    serializer_class = QuoteSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return (
            Quote.objects.filter(artisan=self.request.user)
            .select_related('appointment__service', 'client')
            .prefetch_related('lines')
        )

    def get_serializer_context(self):
        return {'request': self.request}


class ClientQuoteListView(generics.ListAPIView):
    serializer_class = QuoteSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return (
            Quote.objects.filter(client=self.request.user)
            .exclude(status='draft')
            .select_related('appointment__service', 'artisan')
            .prefetch_related('lines')
        )

    def get_serializer_context(self):
        return {'request': self.request}


class QuoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = QuoteSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return Quote.objects.filter(artisan=self.request.user).prefetch_related('lines')

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_destroy(self, instance):
        if instance.status != 'draft':
            raise ValidationError('Seul un devis brouillon peut être supprimé.')
        instance.delete()


class SendQuoteView(APIView):
    permission_classes = [IsArtisan]

    def post(self, request, pk):
        with transaction.atomic():
            quote = get_object_or_404(
                Quote.objects.select_for_update().select_related('appointment__service', 'client'),
                pk=pk,
                artisan=request.user,
            )
            if quote.status != 'draft':
                raise ValidationError('Ce devis a déjà été envoyé.')

            quote.recalculate_totals()
            if quote.total <= 0:
                raise ValidationError('Le total du devis doit être supérieur à zéro.')
            if quote.valid_until and quote.valid_until <= timezone.now():
                raise ValidationError('La date de validité du devis est dépassée.')

            if quote.appointment.statut == 'en_attente':
                transition_appointment(
                    appointment_id=quote.appointment_id,
                    actor=request.user,
                    new_status='accepte',
                    note='Demande acceptée avec envoi d’un devis.',
                )
            elif quote.appointment.statut != 'accepte':
                raise ValidationError('Le rendez-vous ne permet plus l’envoi d’un devis.')

            quote.status = 'sent'
            quote.sent_at = timezone.now()
            quote.save(update_fields=['status', 'sent_at', 'updated_at'])

            Notification.objects.create(
                destinataire=quote.client,
                rendez_vous=quote.appointment,
                service=quote.appointment.service,
                titre='Nouveau devis',
                message=(
                    f'Vous avez reçu le devis {quote.reference} pour un montant '
                    f'de {quote.total} FCFA. Aucun paiement n’est demandé avant la prestation.'
                ),
                lien_redirection='/client/devis',
            )

        return Response(QuoteSerializer(quote, context={'request': request}).data)


class AcceptQuoteView(APIView):
    permission_classes = [IsClient]

    def post(self, request, pk):
        with transaction.atomic():
            quote = get_object_or_404(
                Quote.objects.select_for_update().select_related('appointment__service', 'artisan'),
                pk=pk,
                client=request.user,
            )
            if quote.status != 'sent':
                raise ValidationError('Ce devis ne peut plus être accepté.')
            if quote.is_expired:
                quote.status = 'expired'
                quote.save(update_fields=['status', 'updated_at'])
                raise ValidationError('Ce devis a expiré.')

            Quote.objects.filter(
                appointment=quote.appointment,
                status='accepted',
            ).exclude(pk=quote.pk).update(status='cancelled')

            quote.status = 'accepted'
            quote.accepted_at = timezone.now()
            quote.save(update_fields=['status', 'accepted_at', 'updated_at'])

            Notification.objects.create(
                destinataire=quote.artisan,
                rendez_vous=quote.appointment,
                service=quote.appointment.service,
                titre='Devis accepté',
                message=(
                    f'{request.user.username} a accepté le devis {quote.reference}. '
                    'Vous pouvez confirmer le rendez-vous. Le règlement sera déclaré après la prestation.'
                ),
                lien_redirection='/artisan/devis',
            )

        return Response(QuoteSerializer(quote, context={'request': request}).data)


class RejectQuoteView(APIView):
    permission_classes = [IsClient]

    def post(self, request, pk):
        quote = get_object_or_404(Quote, pk=pk, client=request.user)
        if quote.status != 'sent':
            raise ValidationError('Ce devis ne peut plus être refusé.')

        quote.status = 'rejected'
        quote.rejected_at = timezone.now()
        quote.save(update_fields=['status', 'rejected_at', 'updated_at'])

        Notification.objects.create(
            destinataire=quote.artisan,
            rendez_vous=quote.appointment,
            service=quote.appointment.service,
            titre='Devis refusé',
            message=f'{request.user.username} a refusé le devis {quote.reference}.',
            lien_redirection='/artisan/devis',
        )
        return Response(QuoteSerializer(quote, context={'request': request}).data)


class ClientPaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return (
            Payment.objects.filter(client=self.request.user)
            .select_related('service', 'appointment', 'quote', 'declared_by')
            .order_by('-updated_at')
        )


class ArtisanPaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        qs = (
            Payment.objects.filter(service__artisan=self.request.user)
            .select_related('client', 'service', 'appointment', 'quote', 'declared_by')
        )
        statut = self.request.query_params.get('statut')
        date = self.request.query_params.get('date')
        if statut:
            qs = qs.filter(statut=statut)
        if date:
            qs = qs.filter(declared_at__date=date)
        return qs.order_by('-updated_at')


class ArtisanPaymentWorkspaceView(APIView):
    permission_classes = [IsArtisan]

    def get(self, request):
        rows = payment_workspace_for(request.user)
        data = []
        for row in rows:
            payment = row['payment']
            data.append(
                {
                    'appointment_id': row['appointment_id'],
                    'client_username': row['client_username'],
                    'service_titre': row['service_titre'],
                    'appointment_status': row['appointment_status'],
                    'date_rdv': row['date_rdv'],
                    'completed_at': row['completed_at'],
                    'amount': row['amount'],
                    'quote_reference': row['quote_reference'],
                    'can_declare': row['can_declare'],
                    'payment': (
                        PaymentSerializer(payment, context={'request': request}).data
                        if payment else None
                    ),
                }
            )
        return Response(data)


class DeclarePaymentView(APIView):
    permission_classes = [IsArtisan]

    def post(self, request):
        serializer = PaymentDeclarationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = declare_payment(
            artisan=request.user,
            appointment_id=serializer.validated_data['appointment_id'],
            payment_status=serializer.validated_data['statut'],
            method=serializer.validated_data.get('methode_paiement'),
            payment_reference=serializer.validated_data.get('payment_reference', ''),
            notes=serializer.validated_data.get('notes', ''),
        )
        return Response(
            PaymentSerializer(payment, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class CompleteServiceWithPaymentView(APIView):
    permission_classes = [IsArtisan]

    def _appointment(self, request, appointment_id):
        return get_object_or_404(
            Appointment.objects.select_related('client', 'service', 'service__artisan'),
            pk=appointment_id,
            service__artisan=request.user,
        )

    def get(self, request, appointment_id):
        appointment = self._appointment(request, appointment_id)
        if appointment.statut != 'en_cours':
            raise ValidationError(
                'Les informations de règlement sont demandées uniquement au moment de terminer une prestation en cours.'
            )

        total, quote = contract_total_for(appointment)
        return Response(
            {
                'appointment_id': appointment.id,
                'client_username': appointment.client.username,
                'service_titre': appointment.service.titre,
                'montant': total,
                'currency': 'XOF',
                'quote_reference': quote.reference if quote else None,
                'payment_methods': [
                    {'value': value, 'label': label}
                    for value, label in Payment.METHOD_CHOICES
                ],
            }
        )

    def post(self, request, appointment_id):
        # Valider le formulaire avant toute transition d'état.
        payload = request.data.copy()
        payload['appointment_id'] = appointment_id
        serializer = PaymentDeclarationSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        # Le statut du rendez-vous et la déclaration de règlement sont atomiques :
        # si l'une des deux opérations échoue, rien n'est persisté.
        with transaction.atomic():
            appointment = self._appointment(request, appointment_id)
            if appointment.statut != 'en_cours':
                raise ValidationError('Cette prestation ne peut plus être terminée depuis son état actuel.')

            transition_appointment(
                appointment_id=appointment.id,
                actor=request.user,
                new_status='termine',
                note='Prestation terminée avec déclaration du statut de règlement.',
            )
            payment = declare_payment(
                artisan=request.user,
                appointment_id=appointment.id,
                payment_status=serializer.validated_data['statut'],
                method=serializer.validated_data.get('methode_paiement'),
                payment_reference=serializer.validated_data.get('payment_reference', ''),
                notes=serializer.validated_data.get('notes', ''),
            )

        return Response(
            {
                'message': 'Prestation terminée et informations de règlement enregistrées.',
                'appointment_status': 'termine',
                'payment': PaymentSerializer(payment, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )


class PaymentReceiptPDFView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all()
        return Payment.objects.filter(Q(client=user) | Q(service__artisan=user))

    def get(self, request, *args, **kwargs):
        payment = self.get_object()
        if payment.statut != 'paid':
            raise ValidationError(
                'Le reçu est disponible uniquement après confirmation du paiement par l’artisan.'
            )

        template = get_template('payments/receipt.html')
        html = template.render({'payment': payment})
        buffer = BytesIO()
        pisa_status = pisa.CreatePDF(html, dest=buffer)
        if pisa_status.err:
            raise ValidationError('Erreur lors de la génération du PDF.')

        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="recu_{payment.transaction_id}.pdf"'
        )
        return response
