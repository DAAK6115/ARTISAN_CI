from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import CustomUser
from notifications.models import Notification
from .models import (
    Appointment,
    AppointmentStatusHistory,
    ArtisanAvailability,
    ArtisanTimeOff,
)


ACTIVE_BOOKING_STATUSES = {
    'en_attente',
    'accepte',
    'confirme',
    'en_route',
    'en_cours',
    'termine',
}

TERMINAL_STATUSES = {
    'effectue',
    'refuse',
    'annule_client',
    'annule_artisan',
    'annule',
}

ARTISAN_TRANSITIONS = {
    'en_attente': {'accepte', 'refuse'},
    'accepte': {'confirme', 'annule_artisan'},
    'confirme': {'en_route', 'annule_artisan'},
    'en_route': {'en_cours', 'annule_artisan'},
    'en_cours': {'termine'},
}

CLIENT_TRANSITIONS = {
    'en_attente': {'annule_client'},
    'accepte': {'annule_client'},
    'confirme': {'annule_client'},
    'termine': {'effectue'},
}

STATUS_NOTIFICATION_MESSAGES = {
    'accepte': ('Rendez-vous accepté', 'Votre demande de rendez-vous a été acceptée.'),
    'confirme': ('Rendez-vous confirmé', 'Votre rendez-vous est maintenant confirmé.'),
    'en_route': ('Artisan en route', 'Votre artisan indique être en route.'),
    'en_cours': ('Prestation démarrée', 'Votre prestation a commencé.'),
    'termine': (
        'Prestation terminée',
        'L’artisan a terminé la prestation. Le règlement sera déclaré séparément par l’artisan, puis vous pourrez confirmer la clôture.',
    ),
    'effectue': ('Rendez-vous clôturé', 'La prestation a été confirmée et clôturée.'),
    'refuse': ('Rendez-vous refusé', 'L’artisan ne peut pas accepter cette demande.'),
    'annule_client': ('Rendez-vous annulé', 'Le client a annulé le rendez-vous.'),
    'annule_artisan': ('Rendez-vous annulé', 'L’artisan a annulé le rendez-vous.'),
}


def appointment_end_for_service(service, start):
    return start + timedelta(minutes=service.duree_minutes)


def _local_interval_for_availability(day, availability):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(
        datetime.combine(day, availability.heure_debut),
        timezone=tz,
    )
    end = timezone.make_aware(
        datetime.combine(day, availability.heure_fin),
        timezone=tz,
    )
    return start, end


def _validate_weekly_availability(service, start, end):
    local_start = timezone.localtime(start)
    local_end = timezone.localtime(end)

    if local_start.date() != local_end.date():
        raise ValidationError('Le rendez-vous ne peut pas dépasser minuit.')

    windows = ArtisanAvailability.objects.filter(
        artisan=service.artisan,
        jour_semaine=local_start.weekday(),
        actif=True,
    )

    for window in windows:
        window_start, window_end = _local_interval_for_availability(
            local_start.date(),
            window,
        )
        if start >= window_start and end <= window_end:
            return

    raise ValidationError("Ce créneau est en dehors des disponibilités de l'artisan.")


def _validate_time_off(service, start, end):
    blocked = ArtisanTimeOff.objects.filter(
        artisan=service.artisan,
        debut__lt=end,
        fin__gt=start,
    ).exists()
    if blocked:
        raise ValidationError("L'artisan est indisponible sur ce créneau.")


def _validate_existing_appointments(service, start, end, exclude_id=None):
    qs = Appointment.objects.filter(
        service__artisan=service.artisan,
        statut__in=ACTIVE_BOOKING_STATUSES,
        date_rdv__lt=end,
        date_fin__gt=start,
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    if qs.exists():
        raise ValidationError("Ce créneau vient d'être réservé. Choisissez-en un autre.")


def validate_booking_slot(service, start, *, exclude_id=None):
    if not service.is_active or not service.artisan.is_active:
        raise ValidationError("Cette prestation n'est pas disponible.")

    if timezone.is_naive(start):
        start = timezone.make_aware(start, timezone.get_current_timezone())

    minimum_start = timezone.now() + timedelta(hours=service.delai_reservation_heures)
    if start < minimum_start:
        raise ValidationError(
            f'Ce service doit être réservé au moins '
            f'{service.delai_reservation_heures} heure(s) à l’avance.'
        )

    end = appointment_end_for_service(service, start)
    _validate_weekly_availability(service, start, end)
    _validate_time_off(service, start, end)
    _validate_existing_appointments(service, start, end, exclude_id=exclude_id)
    return end


def create_appointment(*, serializer, client):
    service = serializer.validated_data['service']
    start = serializer.validated_data['date_rdv']

    with transaction.atomic():
        # Sur PostgreSQL, ce verrou sérialise les réservations concurrentes
        # visant le même artisan pendant la vérification du créneau.
        CustomUser.objects.select_for_update().get(pk=service.artisan_id)
        end = validate_booking_slot(service, start)
        appointment = serializer.save(
            client=client,
            date_fin=end,
            statut='en_attente',
        )
        AppointmentStatusHistory.objects.create(
            appointment=appointment,
            ancien_statut='',
            nouveau_statut='en_attente',
            changed_by=client,
            note='Création du rendez-vous',
        )
        Notification.objects.create(
            destinataire=service.artisan,
            rendez_vous=appointment,
            service=service,
            titre='Nouvelle demande de rendez-vous',
            message=(
                f'{client.username} souhaite réserver {service.titre} '
                f'le {timezone.localtime(start).strftime("%d/%m/%Y à %H:%M")}.'
            ),
            lien_redirection='/artisan/rdv',
        )
    return appointment


def allowed_transitions_for(appointment, user):
    if not user or not user.is_authenticated:
        return []
    if user.role == 'admin':
        return [value for value, _ in Appointment.STATUT_CHOICES]
    if user == appointment.service.artisan:
        return sorted(ARTISAN_TRANSITIONS.get(appointment.statut, set()))
    if user == appointment.client:
        return sorted(CLIENT_TRANSITIONS.get(appointment.statut, set()))
    return []


def _enforce_client_cancellation_policy(appointment):
    if appointment.date_rdv - timezone.now() < timedelta(days=3):
        raise ValidationError(
            'Vous ne pouvez plus annuler ce rendez-vous moins de 3 jours avant la date prévue.'
        )


def _notify_transition(appointment, actor, new_status):
    data = STATUS_NOTIFICATION_MESSAGES.get(new_status)
    if not data:
        return

    title, message = data
    if actor == appointment.client:
        recipient = appointment.service.artisan
        link = '/artisan/rdv'
    else:
        recipient = appointment.client
        link = '/client/rdvs'

    Notification.objects.create(
        destinataire=recipient,
        rendez_vous=appointment,
        service=appointment.service,
        titre=title,
        message=message,
        lien_redirection=link,
    )


def transition_appointment(*, appointment_id, actor, new_status, note=''):
    with transaction.atomic():
        appointment = (
            Appointment.objects.select_for_update()
            .select_related('client', 'service', 'service__artisan')
            .get(pk=appointment_id)
        )

        if actor.role != 'admin':
            allowed = set(allowed_transitions_for(appointment, actor))
            if new_status not in allowed:
                raise PermissionDenied('Transition de statut non autorisée.')

        if new_status not in dict(Appointment.STATUT_CHOICES):
            raise ValidationError('Statut invalide.')

        if new_status == 'annule_client':
            _enforce_client_cancellation_policy(appointment)

        old_status = appointment.statut
        now = timezone.now()
        appointment.statut = new_status

        if new_status == 'accepte':
            appointment.accepte_at = now
        elif new_status == 'en_cours':
            appointment.started_at = now
        elif new_status == 'termine':
            appointment.completed_at = now
        elif new_status == 'effectue':
            appointment.client_confirmed_at = now
        elif new_status in {'refuse', 'annule_client', 'annule_artisan'}:
            appointment.motif_annulation = (note or '').strip()[:255]

        appointment.save()
        AppointmentStatusHistory.objects.create(
            appointment=appointment,
            ancien_statut=old_status,
            nouveau_statut=new_status,
            changed_by=actor,
            note=(note or '').strip()[:255],
        )
        _notify_transition(appointment, actor, new_status)
        return appointment


def generate_available_slots(service, day, *, step_minutes=30):
    windows = ArtisanAvailability.objects.filter(
        artisan=service.artisan,
        jour_semaine=day.weekday(),
        actif=True,
    ).order_by('heure_debut')

    minimum_start = timezone.now() + timedelta(hours=service.delai_reservation_heures)
    duration = timedelta(minutes=service.duree_minutes)
    step = timedelta(minutes=step_minutes)
    slots = []

    for window in windows:
        current, window_end = _local_interval_for_availability(day, window)
        while current + duration <= window_end:
            end = current + duration
            if current >= minimum_start:
                blocked_by_time_off = ArtisanTimeOff.objects.filter(
                    artisan=service.artisan,
                    debut__lt=end,
                    fin__gt=current,
                ).exists()
                busy = Appointment.objects.filter(
                    service__artisan=service.artisan,
                    statut__in=ACTIVE_BOOKING_STATUSES,
                    date_rdv__lt=end,
                    date_fin__gt=current,
                ).exists()
                if not blocked_by_time_off and not busy:
                    slots.append(
                        {
                            'start': current.isoformat(),
                            'end': end.isoformat(),
                            'label': timezone.localtime(current).strftime('%H:%M'),
                        }
                    )
            current += step

    return slots
