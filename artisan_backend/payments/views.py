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
from .geniuspay_service import initiate_checkout, retrieve_and_reconcile
from .models import Payment, Quote
from .serializers import PaymentDeclarationSerializer, PaymentSerializer, QuoteSerializer
from .services import (
    client_payment_workspace_for,
    contract_total_for,
    declare_payment,
    get_or_create_payment_for_appointment,
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

            Quote.objects.filter(appointment=quote.appointment, status='accepted').exclude(pk=quote.pk).update(status='cancelled')
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
                    'Vous pouvez confirmer le rendez-vous. Le paiement sera effectué après la prestation via ARTISAN_CI.'
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
            .select_related('service', 'service__artisan', 'appointment', 'quote', 'declared_by')
            .prefetch_related('attempts')
            .order_by('-updated_at')
        )


class ClientPaymentWorkspaceView(APIView):
    permission_classes = [IsClient]

    def get(self, request):
        rows = []
        for row in client_payment_workspace_for(request.user):
            appointment = row['appointment']
            payment = row['payment']
            rows.append({
                'appointment_id': appointment.id,
                'service_titre': appointment.service.titre,
                'artisan_username': appointment.service.artisan.username,
                'appointment_status': appointment.statut,
                'completed_at': appointment.completed_at,
                'amount': row['amount'],
                'quote_reference': row['quote'].reference if row['quote'] else None,
                'can_pay': row['can_pay'],
                'error': row['error'],
                'payment': PaymentSerializer(payment, context={'request': request}).data if payment else None,
            })
        return Response(rows)


class InitiateGeniusPayPaymentView(APIView):
    permission_classes = [IsClient]

    def post(self, request, appointment_id):
        appointment = get_object_or_404(
            Appointment.objects.select_related('client', 'service', 'service__artisan'),
            pk=appointment_id,
            client=request.user,
        )
        if appointment.statut != 'termine':
            raise ValidationError('Le paiement est disponible uniquement après la fin de la prestation.')

        payment, _ = get_or_create_payment_for_appointment(appointment)
        if payment.montant < 200:
            raise ValidationError('Le montant minimum accepté par GeniusPay est de 200 FCFA.')

        payment, attempt = initiate_checkout(payment=payment, request_user=request.user)
        return Response({
            'payment': PaymentSerializer(payment, context={'request': request}).data,
            'checkout_url': attempt.checkout_url,
            'provider_reference': attempt.provider_reference,
        }, status=status.HTTP_200_OK)


class SyncGeniusPayPaymentView(APIView):
    permission_classes = [IsClient]

    def post(self, request, pk):
        payment = get_object_or_404(
            Payment.objects.select_related('client', 'service__artisan', 'appointment'),
            pk=pk,
            client=request.user,
            provider='geniuspay',
        )
        payment = retrieve_and_reconcile(payment)
        return Response(PaymentSerializer(payment, context={'request': request}).data)


class ArtisanPaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        qs = (
            Payment.objects.filter(service__artisan=self.request.user)
            .select_related('client', 'service', 'appointment', 'quote', 'declared_by')
            .prefetch_related('attempts')
        )
        statut = self.request.query_params.get('statut')
        date = self.request.query_params.get('date')
        if statut:
            qs = qs.filter(statut=statut)
        if date:
            qs = qs.filter(updated_at__date=date)
        return qs.order_by('-updated_at')


class ArtisanPaymentWorkspaceView(APIView):
    permission_classes = [IsArtisan]

    def get(self, request):
        rows = []
        for row in payment_workspace_for(request.user):
            payment = row['payment']
            rows.append({
                'appointment_id': row['appointment_id'],
                'client_username': row['client_username'],
                'service_titre': row['service_titre'],
                'appointment_status': row['appointment_status'],
                'date_rdv': row['date_rdv'],
                'completed_at': row['completed_at'],
                'amount': row['amount'],
                'quote_reference': row['quote_reference'],
                'can_declare': row['can_declare'],
                'payment': PaymentSerializer(payment, context={'request': request}).data if payment else None,
            })
        return Response(rows)


class DeclarePaymentView(APIView):
    """Fallback manuel pour espèces, virement bancaire ou autre moyen non-Mobile-Money."""
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
        return Response(PaymentSerializer(payment, context={'request': request}).data)


class CompleteServiceWithPaymentView(APIView):
    """Clôture le travail côté artisan sans lui permettre de déclarer un Mobile Money.

    Le client reçoit ensuite l'action de paiement GeniusPay.
    """
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
            raise ValidationError('Cette prestation n’est pas en cours.')
        total, quote = contract_total_for(appointment)
        return Response({
            'appointment_id': appointment.id,
            'client_username': appointment.client.username,
            'service_titre': appointment.service.titre,
            'montant': total,
            'currency': 'XOF',
            'quote_reference': quote.reference if quote else None,
        })

    def post(self, request, appointment_id):
        appointment = self._appointment(request, appointment_id)
        if appointment.statut != 'en_cours':
            raise ValidationError('Cette prestation ne peut plus être terminée depuis son état actuel.')

        total, quote = contract_total_for(appointment)
        appointment = transition_appointment(
            appointment_id=appointment.id,
            actor=request.user,
            new_status='termine',
            note='Prestation terminée. Paiement à effectuer par le client via ARTISAN_CI/GeniusPay.',
        )

        Notification.objects.create(
            destinataire=appointment.client,
            rendez_vous=appointment,
            service=appointment.service,
            titre='Paiement disponible',
            message=(
                f'La prestation {appointment.service.titre} est terminée. '
                f'Vous pouvez maintenant régler {total} FCFA via Wave, Orange Money, MTN Money ou Moov Money.'
            ),
            lien_redirection='/client/paiements',
        )
        return Response({
            'message': 'Prestation terminée. Le client peut maintenant payer via GeniusPay.',
            'appointment_status': 'termine',
            'amount': total,
            'currency': 'XOF',
            'quote_reference': quote.reference if quote else None,
        })


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
            raise ValidationError('Le reçu est disponible uniquement après confirmation du paiement.')

        template = get_template('payments/receipt.html')
        html = template.render({'payment': payment})
        buffer = BytesIO()
        pisa_status = pisa.CreatePDF(html, dest=buffer)
        if pisa_status.err:
            raise ValidationError('Erreur lors de la génération du PDF.')

        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="recu_{payment.transaction_id}.pdf"'
        return response
