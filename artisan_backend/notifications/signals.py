import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from chat.utils import send_ws_event
from .models import Notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def broadcast_notification(sender, instance, created, **kwargs):
    """Diffuse les nouvelles notifications aux sessions mobiles déjà connectées.

    La notification reste persistée en base : le WebSocket n'est qu'un accélérateur
    d'interface et n'est jamais la source de vérité.
    """
    if not created:
        return

    try:
        send_ws_event(
            instance.destinataire_id,
            {
                'type': 'notification',
                'notification_id': instance.pk,
                'title': instance.titre,
                'message': instance.message[:1000],
                'appointment_id': instance.rendez_vous_id,
                'service_id': instance.service_id,
            },
        )
    except Exception:
        # Une panne Redis/Channels ne doit jamais annuler l'opération métier qui
        # vient de créer la notification persistante.
        logger.exception('Échec de diffusion temps réel de la notification %s.', instance.pk)
