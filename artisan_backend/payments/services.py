from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from appointments.models import Appointment
from notifications.models import Notification
from .models import Payment, Quote


DECLARABLE_APPOINTMENT_STATUSES = {'termine', 'effectue'}
MANUAL_PAYMENT_METHODS = {'cash', 'bank_transfer', 'other'}


def accepted_quote_for(appointment):
    return appointment.quotes.filter(status='accepted').order_by('-accepted_at', '-id').first()


def contract_total_for(appointment):
    """Retourne le montant contractuel à régler.

    - Prix fixe : prix de la prestation.
    - À partir de : devis accepté prioritaire, sinon prix minimum affiché.
    - Sur devis : devis accepté obligatoire.
    """
    quote = accepted_quote_for(appointment)
    if quote:
        total = quote.total
        if total is None or Decimal(total) <= 0:
            raise ValidationError('Le montant du devis accepté est invalide.')
        return Decimal(total), quote

    if appointment.service.mode_tarification == 'sur_devis':
        raise ValidationError(
            'Un devis accepté est requis pour déterminer le montant final de cette prestation.'
        )

    total = appointment.service.prix
    if total is None or Decimal(total) <= 0:
        raise ValidationError('Le montant de la prestation est invalide.')
    return Decimal(total), None


def current_payment_for(appointment):
    return appointment.payments.order_by('-updated_at', '-id').first()


def get_or_create_payment_for_appointment(appointment):
    total, quote = contract_total_for(appointment)
    payment = current_payment_for(appointment)
    if payment is None:
        payment = Payment.objects.create(
            client=appointment.client,
            service=appointment.service,
            appointment=appointment,
            quote=quote,
            montant_initial=total,
            reduction=Decimal('0'),
            montant=total,
            currency='XOF',
            statut='pending',
        )
    elif payment.statut != 'paid':
        payment.quote = quote
        payment.montant_initial = total
        payment.reduction = Decimal('0')
        payment.montant = total
        payment.currency = 'XOF'
        payment.save(update_fields=[
            'quote', 'montant_initial', 'reduction', 'montant', 'currency', 'updated_at'
        ])
    return payment, quote


def payment_workspace_for(artisan):
    appointments = (
        Appointment.objects.filter(
            service__artisan=artisan,
            statut__in=DECLARABLE_APPOINTMENT_STATUSES,
        )
        .select_related('client', 'service')
        .prefetch_related('quotes', 'payments')
        .order_by('-completed_at', '-date_rdv')
    )

    rows = []
    for appointment in appointments:
        payment = current_payment_for(appointment)
        try:
            total, quote = contract_total_for(appointment)
        except ValidationError:
            total, quote = None, None

        if payment is not None:
            total = payment.montant
            quote = payment.quote

        rows.append(
            {
                'appointment_id': appointment.id,
                'client_username': appointment.client.username,
                'service_titre': appointment.service.titre,
                'appointment_status': appointment.statut,
                'date_rdv': appointment.date_rdv,
                'completed_at': appointment.completed_at,
                'amount': total,
                'quote_reference': quote.reference if quote else None,
                'payment': payment,
                'can_declare': (
                    total is not None
                    and (not payment or payment.statut != 'paid')
                    and (not payment or payment.provider != 'geniuspay')
                ),
            }
        )
    return rows


def client_payment_workspace_for(client):
    appointments = (
        Appointment.objects.filter(
            client=client,
            statut__in=DECLARABLE_APPOINTMENT_STATUSES,
        )
        .select_related('client', 'service', 'service__artisan')
        .prefetch_related('quotes', 'payments')
        .order_by('-completed_at', '-date_rdv')
    )

    rows = []
    for appointment in appointments:
        payment = current_payment_for(appointment)
        error = ''
        try:
            total, quote = contract_total_for(appointment)
        except ValidationError as exc:
            total, quote = None, None
            detail = getattr(exc, 'detail', exc)
            error = str(detail[0] if isinstance(detail, list) and detail else detail)

        if payment is not None:
            total = payment.montant
            quote = payment.quote

        rows.append(
            {
                'appointment': appointment,
                'amount': total,
                'quote': quote,
                'payment': payment,
                'error': error,
                'can_pay': (
                    appointment.statut == 'termine'
                    and total is not None
                    and (not payment or payment.statut != 'paid')
                ),
            }
        )
    return rows


def declare_payment(*, artisan, appointment_id, payment_status, method=None, payment_reference='', notes=''):
    """Fallback manuel uniquement pour espèces/virement/autre.

    Les moyens Mobile Money doivent obligatoirement passer par GeniusPay.
    """
    if payment_status not in {'paid', 'unpaid'}:
        raise ValidationError({'statut': 'Statut de paiement invalide.'})

    if payment_status == 'paid' and method not in MANUAL_PAYMENT_METHODS:
        raise ValidationError({
            'methode_paiement': (
                'Wave, Orange Money, MTN Money et Moov Money doivent être réglés '
                'par le checkout GeniusPay côté client.'
            )
        })

    with transaction.atomic():
        appointment = (
            Appointment.objects.select_for_update()
            .select_related('client', 'service', 'service__artisan')
            .get(pk=appointment_id)
        )

        if appointment.service.artisan_id != artisan.id:
            raise PermissionDenied('Ce rendez-vous ne vous appartient pas.')

        if appointment.statut not in DECLARABLE_APPOINTMENT_STATUSES:
            raise ValidationError(
                'Le règlement ne peut être déclaré qu’après avoir marqué la prestation comme terminée.'
            )

        total, quote = contract_total_for(appointment)
        payment = current_payment_for(appointment)

        if payment and payment.statut == 'paid':
            raise ValidationError('Ce règlement est déjà confirmé comme payé.')
        if payment and payment.provider == 'geniuspay' and payment.statut in {'pending', 'processing'}:
            raise ValidationError(
                'Un paiement GeniusPay est déjà en cours. Attendez son résultat avant toute correction manuelle.'
            )

        if payment_status == 'paid' and not method:
            raise ValidationError({'methode_paiement': 'Indiquez comment le client vous a réglé.'})

        if payment is None:
            payment = Payment(
                client=appointment.client,
                service=appointment.service,
                appointment=appointment,
                quote=quote,
                montant_initial=total,
                reduction=Decimal('0'),
                montant=total,
            )
        else:
            payment.quote = quote
            payment.montant_initial = total
            payment.reduction = Decimal('0')
            payment.montant = total

        payment.provider = 'manual'
        payment.provider_status = ''
        payment.provider_reference = ''
        payment.checkout_url = ''
        payment.statut = payment_status
        payment.methode_paiement = method if payment_status == 'paid' else None
        payment.payment_reference = (payment_reference or '').strip()[:100] if payment_status == 'paid' else ''
        payment.declared_by = artisan
        payment.declared_at = timezone.now()
        payment.notes = (notes or '').strip()[:255]
        payment.paid_at = timezone.now() if payment_status == 'paid' else None
        payment.confirmed_at = payment.paid_at
        payment.save()

        title = 'Paiement manuel confirmé' if payment_status == 'paid' else 'Règlement en attente'
        message = (
            f'{artisan.username} confirme avoir reçu {payment.montant} FCFA pour {appointment.service.titre}.'
            if payment_status == 'paid'
            else f'Le règlement de {appointment.service.titre} est toujours en attente.'
        )
        Notification.objects.create(
            destinataire=appointment.client,
            rendez_vous=appointment,
            service=appointment.service,
            titre=title,
            message=message,
            lien_redirection='/client/paiements',
        )
        return payment
