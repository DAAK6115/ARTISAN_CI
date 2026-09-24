import logging
from datetime import date, timedelta

from django.core.mail import send_mail
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from certifications.models import Certification
from notifications.models import Notification
from payments.models import Payment
from portfolio.models import Portfolio
from reviews.models import Review

from accounts.permissions import IsArtisan, IsClient
from services.models import Service
from .domain import (
    create_appointment,
    generate_available_slots,
    transition_appointment,
)
from .models import Appointment, ArtisanAvailability, ArtisanTimeOff
from .serializers import (
    AppointmentSerializer,
    ArtisanAvailabilitySerializer,
    ArtisanTimeOffSerializer,
)

logger = logging.getLogger(__name__)


class CreateAppointmentView(generics.CreateAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsClient]

    def perform_create(self, serializer):
        appointment = create_appointment(serializer=serializer, client=self.request.user)
        try:
            send_mail(
                subject='Nouvelle demande de rendez-vous',
                message=(
                    f'Un client souhaite réserver {appointment.service.titre}.\n'
                    f'Date : {appointment.date_rdv}'
                ),
                from_email=None,
                recipient_list=[appointment.service.artisan.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception('Échec d’envoi de l’email de nouveau rendez-vous.')


class MyAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return (
            Appointment.objects.filter(client=self.request.user)
            .select_related('service', 'service__artisan')
            .order_by('-date_rdv')
        )


class ArtisanAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return (
            Appointment.objects.filter(service__artisan=self.request.user)
            .select_related('service', 'client')
            .order_by('-date_rdv')
        )


class UpdateAppointmentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        new_status = request.data.get('statut')
        note = request.data.get('motif') or request.data.get('note') or ''
        if not new_status:
            return Response(
                {'error': 'Le nouveau statut est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = transition_appointment(
                appointment_id=pk,
                actor=request.user,
                new_status=new_status,
                note=note,
            )
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Rendez-vous introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AppointmentSerializer(
            appointment,
            context={'request': request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConfirmerAppointmentView(APIView):
    """Le client confirme que la prestation signalée comme terminée est bien finie."""

    permission_classes = [IsClient]

    def post(self, request, pk):
        try:
            appointment = transition_appointment(
                appointment_id=pk,
                actor=request.user,
                new_status='effectue',
                note='Confirmation de fin par le client',
            )
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Rendez-vous introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AppointmentSerializer(
            appointment,
            context={'request': request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppointmentDetailView(RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Appointment.objects.select_related('service', 'client', 'service__artisan')

        return Appointment.objects.select_related(
            'service',
            'client',
            'service__artisan',
        ).filter(Q(client=user) | Q(service__artisan=user))


class AvailableSlotsView(APIView):
    permission_classes = [IsClient]

    def get(self, request, service_id):
        raw_date = request.query_params.get('date', '')
        try:
            day = date.fromisoformat(raw_date)
        except ValueError:
            raise ValidationError({'date': 'Utilisez le format AAAA-MM-JJ.'})

        try:
            service = Service.objects.select_related('artisan').get(
                pk=service_id,
                is_active=True,
                artisan__is_active=True,
            )
        except Service.DoesNotExist:
            return Response(
                {'error': 'Prestation introuvable ou indisponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                'service_id': service.id,
                'date': raw_date,
                'duree_minutes': service.duree_minutes,
                'slots': generate_available_slots(service, day),
            }
        )


class ArtisanAvailabilityListCreateView(generics.ListCreateAPIView):
    serializer_class = ArtisanAvailabilitySerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return ArtisanAvailability.objects.filter(artisan=self.request.user)

    def perform_create(self, serializer):
        serializer.save(artisan=self.request.user)


class ArtisanAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ArtisanAvailabilitySerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return ArtisanAvailability.objects.filter(artisan=self.request.user)


class ArtisanTimeOffListCreateView(generics.ListCreateAPIView):
    serializer_class = ArtisanTimeOffSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return ArtisanTimeOff.objects.filter(artisan=self.request.user)

    def perform_create(self, serializer):
        serializer.save(artisan=self.request.user)


class ArtisanTimeOffDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ArtisanTimeOffSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return ArtisanTimeOff.objects.filter(artisan=self.request.user)


class ArtisanDashboardSummaryView(APIView):
    """Résumé métier de l'espace artisan, calculé uniquement sur ses propres données."""

    permission_classes = [IsArtisan]

    @staticmethod
    def _month_start(value):
        return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _previous_month_start(value):
        return (value - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def get(self, request):
        user = request.user
        now = timezone.now()
        month_start = self._month_start(now)
        previous_month_start = self._previous_month_start(month_start)
        week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

        appointments = Appointment.objects.filter(service__artisan=user)
        paid_payments = Payment.objects.filter(service__artisan=user, statut='paid')
        reviews = Review.objects.filter(service__artisan=user)
        services = Service.objects.filter(artisan=user)

        revenue_total = paid_payments.aggregate(total=Sum('montant'))['total'] or 0
        next_month_start = (month_start + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        revenue_month = paid_payments.filter(
            paid_at__gte=month_start,
            paid_at__lt=next_month_start,
        ).aggregate(total=Sum('montant'))['total'] or 0
        revenue_previous_month = paid_payments.filter(
            paid_at__gte=previous_month_start,
            paid_at__lt=month_start,
        ).aggregate(total=Sum('montant'))['total'] or 0

        month_delta = None
        if revenue_previous_month:
            month_delta = round(
                (float(revenue_month) - float(revenue_previous_month))
                / float(revenue_previous_month) * 100,
                1,
            )

        status_counts = {
            row['statut']: row['count']
            for row in appointments.values('statut').annotate(count=Count('id'))
        }

        completed_statuses = ['termine', 'effectue']
        cancelled_statuses = ['refuse', 'annule_client', 'annule_artisan', 'annule']
        active_statuses = ['accepte', 'confirme', 'en_route', 'en_cours', 'termine']

        responded = appointments.exclude(statut='en_attente')
        accepted_count = responded.exclude(statut__in=['refuse']).count()
        response_base = responded.count()
        acceptance_rate = round((accepted_count / response_base) * 100, 1) if response_base else None

        response_durations = []
        for created_at, accepte_at in appointments.exclude(accepte_at=None).values_list('created_at', 'accepte_at')[:300]:
            seconds = (accepte_at - created_at).total_seconds()
            if seconds >= 0:
                response_durations.append(seconds)
        average_response_minutes = (
            round(sum(response_durations) / len(response_durations) / 60)
            if response_durations else None
        )

        revenue_series = []
        cursor = month_start
        months = []
        for _ in range(6):
            months.append(cursor)
            cursor = self._previous_month_start(cursor)
        months.reverse()
        for start in months:
            end = (start + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            amount = paid_payments.filter(
                paid_at__gte=start,
                paid_at__lt=end,
            ).aggregate(total=Sum('montant'))['total'] or 0
            revenue_series.append({'month': start.date().isoformat(), 'amount': amount})

        upcoming_qs = appointments.filter(
            date_rdv__gte=now,
            statut__in=['en_attente', 'accepte', 'confirme', 'en_route', 'en_cours'],
        ).select_related('service', 'client').order_by('date_rdv')[:5]
        upcoming = AppointmentSerializer(upcoming_qs, many=True, context={'request': request}).data

        try:
            portfolio = Portfolio.objects.prefetch_related('realisations').get(artisan=user)
        except Portfolio.DoesNotExist:
            portfolio = None

        profile_checks = {
            'bio': bool(portfolio and (portfolio.bio or '').strip()),
            'localisation': bool(portfolio and (portfolio.localisation or '').strip()),
            'photo': bool(portfolio and portfolio.photo_couverture),
            'contact': bool(portfolio and (portfolio.whatsapp or '').strip()),
            'position': bool(portfolio and portfolio.latitude is not None and portfolio.longitude is not None),
            'service': services.filter(is_active=True).exists(),
            'portfolio': bool(portfolio and portfolio.realisations.exists()),
            'certification': Certification.objects.filter(artisan=user).exists(),
            'availability': ArtisanAvailability.objects.filter(artisan=user, actif=True).exists(),
        }
        profile_score = round(sum(profile_checks.values()) / len(profile_checks) * 100)

        return Response({
            'artisan': {
                'username': user.username,
                'profile_completion': profile_score,
                'profile_checks': profile_checks,
            },
            'metrics': {
                'revenue_month': revenue_month,
                'revenue_total': revenue_total,
                'revenue_month_delta': month_delta,
                'appointments_today': appointments.filter(date_rdv__date=now.date()).exclude(statut__in=cancelled_statuses).count(),
                'appointments_week': appointments.filter(date_rdv__gte=week_start).exclude(statut__in=cancelled_statuses).count(),
                'pending_requests': appointments.filter(statut='en_attente').count(),
                'active_jobs': appointments.filter(statut__in=active_statuses).count(),
                'completed_month': appointments.filter(completed_at__gte=month_start, statut__in=completed_statuses).count(),
                'unpaid_completed': Payment.objects.filter(service__artisan=user, statut='unpaid').count(),
                'active_services': services.filter(is_active=True).count(),
                'clients': appointments.values('client_id').distinct().count(),
                'rating_average': reviews.aggregate(avg=Avg('note'))['avg'],
                'reviews_count': reviews.count(),
                'acceptance_rate': acceptance_rate,
                'average_response_minutes': average_response_minutes,
                'unread_notifications': Notification.objects.filter(destinataire=user, lu=False).count(),
            },
            'appointment_statuses': status_counts,
            'revenue_series': revenue_series,
            'upcoming_appointments': upcoming,
        })


class ArtisanClientsView(APIView):
    """Liste synthétique des clients ayant réellement eu un rendez-vous avec l'artisan."""

    permission_classes = [IsArtisan]

    def get(self, request):
        appointments = list(
            Appointment.objects.filter(service__artisan=request.user)
            .select_related('client', 'service')
            .order_by('-date_rdv')
        )
        paid_totals = {
            row['client_id']: row['total'] or 0
            for row in Payment.objects.filter(
                service__artisan=request.user,
                statut='paid',
            ).values('client_id').annotate(total=Sum('montant'))
        }

        grouped = {}
        for appointment in appointments:
            client = appointment.client
            item = grouped.setdefault(client.id, {
                'id': client.id,
                'username': client.username,
                'appointments_count': 0,
                'completed_count': 0,
                'paid_total': paid_totals.get(client.id, 0),
                'last_appointment_at': appointment.date_rdv,
                'last_service': appointment.service.titre,
                'last_status': appointment.statut,
            })
            item['appointments_count'] += 1
            if appointment.statut in {'termine', 'effectue'}:
                item['completed_count'] += 1

        return Response(list(grouped.values()))
