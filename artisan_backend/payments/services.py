from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from appointments.models import Appointment
from notifications.models import Notification
from .models import Payment, Quote


DECLARABLE_APPOINTMENT_STATUSES = {'termine', 'effectue'}


def accepted_quote_for(appointment):
    return appointment.quotes.filter(status='accepted').order_by('-accepted_at', '-id').first()


def contract_total_for(appointment):
    """Retourne le montant contractuel à utiliser pour le règlement.

    - Prix fixe : prix de la prestation.
    - À partir de : un devis accepté est prioritaire ; sinon le prix affiché
      devient le montant minimum convenu. L'artisan ne peut donc pas facturer
      silencieusement plus sans devis accepté.
    - Sur devis : un devis accepté reste obligatoire.
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

        # Si un règlement a déjà été déclaré, son montant figé est la source
        # de vérité même si la prestation/devis est modifié plus tard.
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
                'can_declare': total is not None and (not payment or payment.statut != 'paid'),
            }
        )
    return rows


def declare_payment(*, artisan, appointment_id, payment_status, method=None, payment_reference='', notes=''):
    if payment_status not in {'paid', 'unpaid'}:
        raise ValidationError({'statut': 'Statut de paiement invalide.'})

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
            raise ValidationError(
                'Ce règlement est déjà déclaré comme payé. Une correction devra passer par l’administration.'
            )

        if payment_status == 'paid' and not method:
            raise ValidationError(
                {'methode_paiement': 'Indiquez comment le client vous a réglé.'}
            )

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

        payment.statut = payment_status
        payment.methode_paiement = method if payment_status == 'paid' else None
        payment.payment_reference = (payment_reference or '').strip()[:100] if payment_status == 'paid' else ''
        payment.declared_by = artisan
        payment.declared_at = timezone.now()
        payment.notes = (notes or '').strip()[:255]
        payment.paid_at = timezone.now() if payment_status == 'paid' else None
        payment.save()

        if payment_status == 'paid':
            title = 'Paiement confirmé par votre artisan'
            message = (
                f'{artisan.username} confirme avoir reçu {payment.montant} FCFA '
                f'pour {appointment.service.titre}.'
            )
        else:
            title = 'Paiement non reçu'
            message = (
                f'{artisan.username} indique que le règlement de '
                f'{appointment.service.titre} n’a pas encore été reçu.'
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
