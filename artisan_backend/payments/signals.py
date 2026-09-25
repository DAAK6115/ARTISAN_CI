import logging

from django.dispatch import receiver
from geniuspay import signals as gp_signals

from .geniuspay_service import reconcile_geniuspay_transaction

logger = logging.getLogger(__name__)


def _reconcile(event_type, transaction, raw_event):
    try:
        reconcile_geniuspay_transaction(
            transaction=transaction,
            raw_event=raw_event,
            event_type=event_type,
        )
    except Exception:
        # Le webhook GeniusPay est déjà authentifié par le SDK. Une erreur de
        # rapprochement doit être visible dans les logs sans fabriquer un succès.
        logger.exception('Échec de réconciliation GeniusPay (%s).', event_type)
        raise


@receiver(gp_signals.payment_success)
def on_payment_success(sender, transaction, raw_event, **kwargs):
    _reconcile('payment.success', transaction, raw_event)


@receiver(gp_signals.payment_failed)
def on_payment_failed(sender, transaction, raw_event, **kwargs):
    _reconcile('payment.failed', transaction, raw_event)


@receiver(gp_signals.payment_cancelled)
def on_payment_cancelled(sender, transaction, raw_event, **kwargs):
    _reconcile('payment.cancelled', transaction, raw_event)


@receiver(gp_signals.payment_expired)
def on_payment_expired(sender, transaction, raw_event, **kwargs):
    _reconcile('payment.expired', transaction, raw_event)


@receiver(gp_signals.payment_refunded)
def on_payment_refunded(sender, transaction, raw_event, **kwargs):
    _reconcile('payment.refunded', transaction, raw_event)
