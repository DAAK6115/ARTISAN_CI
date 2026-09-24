from datetime import timedelta

from django.core.mail import send_mail
from django.utils import timezone

from .models import Appointment


def send_rappel_rendezvous():
    now = timezone.now()
    target_time = now + timedelta(hours=1)

    rdvs = Appointment.objects.filter(
        date_rdv__range=(
            target_time - timedelta(minutes=1),
            target_time + timedelta(minutes=1),
        ),
        statut__in=['accepte', 'confirme'],
    ).select_related('client', 'service', 'service__artisan')

    for rdv in rdvs:
        send_mail(
            '⏰ Rappel : rendez-vous dans 1h',
            (
                f'Bonjour {rdv.client.username},\n'
                f'Vous avez un rendez-vous à {rdv.date_rdv} '
                f'pour {rdv.service.titre}'
            ),
            None,
            [rdv.client.email, rdv.service.artisan.email],
            fail_silently=True,
        )
