import logging
from datetime import date

from django.core.mail import send_mail
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

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
