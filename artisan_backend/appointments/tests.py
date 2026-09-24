from datetime import datetime, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from services.models import Service
from .models import Appointment, ArtisanAvailability, ArtisanTimeOff


class AppointmentSchedulingTests(APITestCase):
    def setUp(self):
        self.artisan = CustomUser.objects.create_user(
            email='artisan@example.com',
            username='artisan_test',
            password='StrongPass123!',
            role='artisan',
        )
        self.other_artisan = CustomUser.objects.create_user(
            email='artisan2@example.com',
            username='artisan_test_2',
            password='StrongPass123!',
            role='artisan',
        )
        self.client_user = CustomUser.objects.create_user(
            email='client@example.com',
            username='client_test',
            password='StrongPass123!',
            role='client',
        )
        self.other_client = CustomUser.objects.create_user(
            email='client2@example.com',
            username='client_test_2',
            password='StrongPass123!',
            role='client',
        )
        self.service = Service.objects.create(
            artisan=self.artisan,
            titre='Réparation test',
            description='Prestation de test',
            prix='10000.00',
            categorie='electronique',
            duree_minutes=60,
            delai_reservation_heures=0,
        )

        self.day = timezone.localdate() + timedelta(days=7)
        ArtisanAvailability.objects.create(
            artisan=self.artisan,
            jour_semaine=self.day.weekday(),
            heure_debut=time(8, 0),
            heure_fin=time(18, 0),
        )

    def aware_at(self, hour, minute=0):
        return timezone.make_aware(
            datetime.combine(self.day, time(hour, minute)),
            timezone.get_current_timezone(),
        )

    def create_appointment(self, user=None, hour=10, minute=0):
        self.client.force_authenticate(user=user or self.client_user)
        return self.client.post(
            '/api/appointments/create/',
            {
                'service': self.service.id,
                'date_rdv': self.aware_at(hour, minute).isoformat(),
                'commentaires': 'Test de réservation',
            },
            format='json',
        )

    def test_client_can_book_inside_artisan_availability(self):
        response = self.create_appointment()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        appointment = Appointment.objects.get()
        self.assertEqual(appointment.statut, 'en_attente')
        self.assertEqual(appointment.date_fin - appointment.date_rdv, timedelta(minutes=60))

    def test_booking_outside_availability_is_rejected(self):
        response = self.create_appointment(hour=19)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_overlapping_booking_is_rejected(self):
        first = self.create_appointment(hour=10)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.create_appointment(user=self.other_client, hour=10, minute=30)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Appointment.objects.count(), 1)

    def test_time_off_blocks_booking(self):
        ArtisanTimeOff.objects.create(
            artisan=self.artisan,
            debut=self.aware_at(9),
            fin=self.aware_at(12),
            motif='Indisponible',
        )
        response = self.create_appointment(hour=10)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_slots_exclude_busy_periods(self):
        first = self.create_appointment(hour=10)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.other_client)
        response = self.client.get(
            f'/api/appointments/creneaux/{self.service.id}/',
            {'date': self.day.isoformat()},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        starts = {slot['label'] for slot in response.data['slots']}
        self.assertNotIn('10:00', starts)
        self.assertNotIn('10:30', starts)
        self.assertIn('11:00', starts)

    def test_artisan_status_workflow_rejects_invalid_jump(self):
        response = self.create_appointment(hour=10)
        appointment_id = response.data['id']

        self.client.force_authenticate(user=self.artisan)
        accepted = self.client.patch(
            f'/api/appointments/{appointment_id}/changer-statut/',
            {'statut': 'accepte'},
            format='json',
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)

        invalid = self.client.patch(
            f'/api/appointments/{appointment_id}/changer-statut/',
            {'statut': 'en_cours'},
            format='json',
        )
        self.assertEqual(invalid.status_code, status.HTTP_403_FORBIDDEN)

    def test_complete_workflow_requires_client_final_confirmation(self):
        response = self.create_appointment(hour=10)
        appointment_id = response.data['id']
        self.client.force_authenticate(user=self.artisan)

        for new_status in ['accepte', 'confirme', 'en_route', 'en_cours', 'termine']:
            transition = self.client.patch(
                f'/api/appointments/{appointment_id}/changer-statut/',
                {'statut': new_status},
                format='json',
            )
            self.assertEqual(transition.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.client_user)
        confirmed = self.client.post(f'/api/appointments/confirmer/{appointment_id}/')
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertEqual(confirmed.data['statut'], 'effectue')

    def test_other_artisan_cannot_delete_schedule(self):
        availability = ArtisanAvailability.objects.get(artisan=self.artisan)
        self.client.force_authenticate(user=self.other_artisan)
        response = self.client.delete(
            f'/api/appointments/disponibilites/{availability.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
