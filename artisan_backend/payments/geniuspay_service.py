import hashlib
import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from notifications.models import Notification
from .models import Payment, PaymentAttempt, PaymentGatewayEvent


GENIUSPAY_STATUS_MAP = {
    'paid': 'paid',
    'completed': 'paid',
    'success': 'paid',
    'successful': 'paid',
    'pending': 'pending',
    'processing': 'processing',
    'failed': 'failed',
    'failure': 'failed',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'expired': 'expired',
    'refunded': 'refunded',
}

GATEWAY_METHOD_MAP = {
    'wave': 'wave',
    'orange_money': 'orange_money',
    'orange': 'orange_money',
    'mtn_momo': 'mtn_money',
    'mtn_money': 'mtn_money',
    'mtn': 'mtn_money',
    'moov_money': 'moov_money',
    'moov': 'moov_money',
}


def _sdk():
    try:
        from geniuspay import GeniusPayClient
        return GeniusPayClient()
    except ImportError as exc:
        raise ValidationError(
            'Le SDK GeniusPay n’est pas installé. Exécutez pip install geniuspay==1.2.2.'
        ) from exc


def _json_safe(value):
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, (list, str, int, float, bool)):
        return value
    if hasattr(value, 'to_dict'):
        try:
            return value.to_dict()
        except Exception:
            pass
    if hasattr(value, '__dict__'):
        return {
            str(k): _json_safe(v)
            for k, v in value.__dict__.items()
            if not str(k).startswith('_')
        }
    return {'value': str(value)}


def _event_payload(raw_event):
    payload = _json_safe(raw_event)
    return payload if isinstance(payload, dict) else {'value': payload}


def _event_id(raw_event, event_type, reference):
    payload = _event_payload(raw_event)
    explicit = payload.get('id') or payload.get('event_id')
    if explicit:
        return str(explicit)[:120]
    digest_source = json.dumps(payload, sort_keys=True, default=str)
    digest = hashlib.sha256(f'{event_type}|{reference}|{digest_source}'.encode()).hexdigest()[:40]
    return f'generated-{digest}'


def _transaction_value(transaction, key, fallback=None):
    value = getattr(transaction, key, None)
    if value not in (None, ''):
        return value
    if isinstance(transaction, dict):
        return transaction.get(key, fallback)
    return fallback


def _metadata(transaction, raw_event=None):
    value = _transaction_value(transaction, 'metadata', None)
    if isinstance(value, dict):
        return value
    payload = _event_payload(raw_event)
    data = payload.get('data') if isinstance(payload.get('data'), dict) else {}
    candidate = data.get('metadata')
    return candidate if isinstance(candidate, dict) else {}


def _decimal(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _status(value):
    return GENIUSPAY_STATUS_MAP.get(str(value or '').strip().lower(), str(value or '').strip().lower() or 'pending')


def _gateway(value):
    raw = str(value or '').strip().lower()
    return GATEWAY_METHOD_MAP.get(raw, raw)


def _notify_status_change(payment, previous_status):
    if payment.statut == previous_status:
        return

    if payment.statut == 'paid':
        Notification.objects.create(
            destinataire=payment.client,
            rendez_vous=payment.appointment,
            service=payment.service,
            titre='Paiement confirmé',
            message=f'Votre paiement de {payment.montant} FCFA a été confirmé par GeniusPay.',
            lien_redirection='/client/paiements',
        )
        artisan = payment.service.artisan
        Notification.objects.create(
            destinataire=artisan,
            rendez_vous=payment.appointment,
            service=payment.service,
            titre='Paiement reçu',
            message=(
                f'Le paiement de {payment.client.username} pour {payment.service.titre} '
                f'a été confirmé via GeniusPay.'
            ),
            lien_redirection='/artisan/paiements',
        )
    elif payment.statut in {'failed', 'cancelled', 'expired'}:
        labels = {
            'failed': 'a échoué',
            'cancelled': 'a été annulé',
            'expired': 'a expiré',
        }
        Notification.objects.create(
            destinataire=payment.client,
            rendez_vous=payment.appointment,
            service=payment.service,
            titre='Paiement non finalisé',
            message=f'Le paiement de {payment.montant} FCFA {labels[payment.statut]}. Vous pouvez réessayer.',
            lien_redirection='/client/paiements',
        )
    elif payment.statut == 'refunded':
        Notification.objects.create(
            destinataire=payment.client,
            rendez_vous=payment.appointment,
            service=payment.service,
            titre='Paiement remboursé',
            message=f'Le paiement de {payment.montant} FCFA est indiqué comme remboursé par GeniusPay.',
            lien_redirection='/client/paiements',
        )


def reconcile_geniuspay_transaction(*, transaction, raw_event=None, event_type='payment.sync'):
    """Réconcilie une transaction GeniusPay avec le Payment ARTISAN_CI.

    Vérifie l'identifiant local, la référence fournisseur et le montant avant
    toute confirmation. L'opération est idempotente.
    """
    metadata = _metadata(transaction, raw_event)
    payment_id = metadata.get('payment_id') or metadata.get('artisan_payment_id')
    reference = str(
        _transaction_value(transaction, 'reference', '')
        or (_event_payload(raw_event).get('data') or {}).get('reference', '')
    ).strip()

    if not payment_id:
        # Fallback sûr : on accepte une résolution par référence uniquement si elle est déjà connue localement.
        if not reference:
            raise ValidationError('Événement GeniusPay sans identifiant de paiement ni référence.')
        payment = Payment.objects.filter(provider='geniuspay', provider_reference=reference).first()
        if not payment:
            raise ValidationError('Aucun paiement ARTISAN_CI ne correspond à cette transaction GeniusPay.')
        payment_id = payment.id

    with transaction_atomic():
        payment = (
            Payment.objects.select_for_update()
            .select_related('client', 'service__artisan', 'appointment')
            .get(pk=int(payment_id))
        )

        if payment.provider != 'geniuspay':
            raise ValidationError('Ce paiement n’est pas géré par GeniusPay.')
        if payment.provider_reference and reference and payment.provider_reference != reference:
            raise ValidationError('La référence GeniusPay ne correspond pas au paiement attendu.')

        amount = _decimal(
            _transaction_value(transaction, 'amount', None)
            or (_event_payload(raw_event).get('data') or {}).get('amount')
        )
        if amount is not None and amount != Decimal(payment.montant):
            raise ValidationError('Le montant GeniusPay ne correspond pas au montant ARTISAN_CI.')

        currency = str(
            _transaction_value(transaction, 'currency', '')
            or (_event_payload(raw_event).get('data') or {}).get('currency', '')
        ).strip().upper()
        if currency and currency != payment.currency.upper():
            raise ValidationError('La devise GeniusPay ne correspond pas au paiement ARTISAN_CI.')

        raw_status = (
            _transaction_value(transaction, 'status', '')
            or (_event_payload(raw_event).get('data') or {}).get('status', '')
        )
        status_value = _status(raw_status)
        gateway = _gateway(
            _transaction_value(transaction, 'gateway', '')
            or _transaction_value(transaction, 'payment_method', '')
            or (_event_payload(raw_event).get('data') or {}).get('payment_method', '')
        )

        if event_type.endswith('success'):
            status_value = 'paid'
        elif event_type.endswith('failed'):
            status_value = 'failed'
        elif event_type.endswith('cancelled'):
            status_value = 'cancelled'
        elif event_type.endswith('expired'):
            status_value = 'expired'
        elif event_type.endswith('refunded'):
            status_value = 'refunded'

        event_payload = _event_payload(raw_event)
        event_id = _event_id(raw_event, event_type, reference or payment.provider_reference)
        event, created = PaymentGatewayEvent.objects.get_or_create(
            event_id=event_id,
            defaults={
                'event_type': event_type,
                'provider_reference': reference or payment.provider_reference,
                'payload': event_payload,
            },
        )
        if not created and raw_event is not None:
            return payment

        previous_status = payment.statut
        payment.provider_reference = reference or payment.provider_reference
        payment.provider_status = str(raw_status or status_value)[:32]
        payment.statut = status_value if status_value in dict(Payment.STATUS_CHOICES) else 'pending'
        if gateway in dict(Payment.METHOD_CHOICES):
            payment.methode_paiement = gateway
        payment.payment_reference = payment.provider_reference
        payment.provider_payload = event_payload or payment.provider_payload

        now = timezone.now()
        if payment.statut == 'paid':
            payment.paid_at = payment.paid_at or now
            payment.confirmed_at = payment.confirmed_at or now
            payment.failed_at = None
        elif payment.statut in {'failed', 'cancelled', 'expired'}:
            payment.failed_at = now

        payment.save()

        if payment.provider_reference:
            attempt = PaymentAttempt.objects.filter(provider_reference=payment.provider_reference).first()
            if attempt:
                attempt.status = payment.provider_status or payment.statut
                attempt.gateway = gateway or attempt.gateway
                attempt.payload = event_payload or attempt.payload
                if payment.statut in {'paid', 'failed', 'cancelled', 'expired', 'refunded'}:
                    attempt.completed_at = attempt.completed_at or now
                attempt.save()

        _notify_status_change(payment, previous_status)
        return payment


def transaction_atomic():
    return db_transaction.atomic()


def initiate_checkout(*, payment, request_user):
    """Crée un checkout GeniusPay. Réutilise un checkout encore actif."""
    if payment.client_id != request_user.id:
        raise ValidationError('Ce paiement ne vous appartient pas.')
    if payment.statut == 'paid':
        raise ValidationError('Ce paiement est déjà confirmé.')

    active_attempt = payment.attempts.filter(status__in=['pending', 'processing']).order_by('-created_at').first()
    if active_attempt and active_attempt.checkout_url:
        return payment, active_attempt

    client = _sdk()
    mobile_base = str(getattr(settings, 'ARTISAN_MOBILE_URL', 'http://localhost:5173')).rstrip('/')
    success_url = f'{mobile_base}/client/paiements?geniuspay=success&payment_id={payment.id}'
    error_url = f'{mobile_base}/client/paiements?geniuspay=error&payment_id={payment.id}'

    customer = {
        'name': request_user.username,
        'email': request_user.email,
    }
    if getattr(request_user, 'numero_momo', None):
        customer['phone'] = request_user.numero_momo

    try:
        gp_payment = client.payments.create(
            amount=int(Decimal(payment.montant)),
            description=f'ARTISAN_CI - {payment.service.titre} - RDV #{payment.appointment_id}',
            customer=customer,
            success_url=success_url,
            error_url=error_url,
            metadata={
                'payment_id': payment.id,
                'appointment_id': payment.appointment_id,
                'transaction_id': payment.transaction_id,
            },
        )
    except Exception as exc:
        # Les classes d'erreur diffèrent selon la version du SDK : ne pas exposer les détails au client.
        payment.provider = 'geniuspay'
        payment.statut = 'failed'
        payment.provider_status = 'initiation_failed'
        payment.failed_at = timezone.now()
        payment.provider_payload = {'error_type': exc.__class__.__name__}
        payment.save(update_fields=[
            'provider', 'statut', 'provider_status', 'failed_at', 'provider_payload', 'updated_at'
        ])
        raise ValidationError('Impossible d’ouvrir le paiement GeniusPay pour le moment. Réessayez.') from exc

    reference = str(getattr(gp_payment, 'reference', '') or '').strip()
    checkout_url = str(getattr(gp_payment, 'checkout_url', '') or '').strip()
    status_value = str(getattr(gp_payment, 'status', '') or 'pending').strip().lower()
    gateway = _gateway(getattr(gp_payment, 'gateway', '') or '')

    if not reference or not checkout_url:
        raise ValidationError('Réponse GeniusPay incomplète : aucune URL de paiement disponible.')

    now = timezone.now()
    payment.provider = 'geniuspay'
    payment.provider_reference = reference
    payment.payment_reference = reference
    payment.provider_status = status_value
    payment.statut = _status(status_value)
    payment.checkout_url = checkout_url
    payment.initiated_at = now
    payment.failed_at = None
    if gateway in dict(Payment.METHOD_CHOICES):
        payment.methode_paiement = gateway
    payment.provider_payload = _json_safe(gp_payment)
    payment.save()

    attempt, _ = PaymentAttempt.objects.update_or_create(
        provider_reference=reference,
        defaults={
            'payment': payment,
            'status': status_value or 'pending',
            'gateway': gateway,
            'checkout_url': checkout_url,
            'payload': _json_safe(gp_payment),
        },
    )
    return payment, attempt


def retrieve_and_reconcile(payment):
    if payment.provider != 'geniuspay' or not payment.provider_reference:
        raise ValidationError('Aucune transaction GeniusPay à vérifier pour ce paiement.')
    client = _sdk()
    try:
        transaction_obj = client.payments.retrieve(payment.provider_reference)
    except Exception as exc:
        raise ValidationError('Impossible de vérifier ce paiement auprès de GeniusPay pour le moment.') from exc
    return reconcile_geniuspay_transaction(
        transaction=transaction_obj,
        raw_event=None,
        event_type='payment.sync',
    )
