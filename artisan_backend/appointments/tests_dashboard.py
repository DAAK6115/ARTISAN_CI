from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from notifications.models import Notification
from payments.models import Payment
from portfolio.models import Portfolio
from reviews.models import Review
from services.models import Service
from .models import Appointment


class ArtisanDashboardSummaryTests(APITestCase):
    def setUp(self):
        self.artisan = CustomUser.objects.create_user(
            email='artisan-dashboard@example.com',
            username='artisan_dashboard',
            password='StrongPass123!',
            role='artisan',
        )
        self.other_artisan = CustomUser.objects.create_user(
            email='other-artisan@example.com',
            username='other_artisan',
            password='StrongPass123!',
            role='artisan',
        )
        self.client_user = CustomUser.objects.create_user(
            email='client-dashboard@example.com',
            username='client_dashboard',
            password='StrongPass123!',
            role='client',
        )
        self.service = Service.objects.create(
            artisan=self.artisan,
            titre='Réparation test',
            description='Service de test',
            prix=Decimal('25000'),
            categorie='services_numeriques',
        )
        self.other_service = Service.objects.create(
            artisan=self.other_artisan,
            titre='Autre service',
            description='Ne doit pas apparaître',
            prix=Decimal('99000'),
            categorie='services_numeriques',
        )

        now = timezone.now()
        self.pending = Appointment.objects.create(
            client=self.client_user,
            service=self.service,
            date_rdv=now + timedelta(days=2),
            statut='en_attente',
        )
        self.completed = Appointment.objects.create(
            client=self.client_user,
            service=self.service,
            date_rdv=now - timedelta(days=2),
            statut='effectue',
            completed_at=now - timedelta(days=2),
            client_confirmed_at=now - timedelta(days=1),
        )
        self.other_appointment = Appointment.objects.create(
            client=self.client_user,
            service=self.other_service,
            date_rdv=now - timedelta(days=1),
            statut='effectue',
            completed_at=now - timedelta(days=1),
        )

        Payment.objects.create(
            client=self.client_user,
            service=self.service,
            appointment=self.completed,
            montant_initial=Decimal('25000'),
            reduction=Decimal('0'),
            montant=Decimal('25000'),
            statut='paid',
            methode_paiement='cash',
            declared_by=self.artisan,
            declared_at=now,
            paid_at=now,
        )
        Payment.objects.create(
            client=self.client_user,
            service=self.other_service,
            appointment=self.other_appointment,
            montant_initial=Decimal('99000'),
            reduction=Decimal('0'),
            montant=Decimal('99000'),
            statut='paid',
            methode_paiement='cash',
            declared_by=self.other_artisan,
            declared_at=now,
            paid_at=now,
        )
        Review.objects.create(
            client=self.client_user,
            service=self.service,
            rendez_vous=self.completed,
            note=5,
            commentaire='Très bon travail',
        )
        Notification.objects.create(
            destinataire=self.artisan,
            titre='Test',
            message='Notification non lue',
        )

    def test_dashboard_only_uses_authenticated_artisan_data(self):
        self.client.force_authenticate(self.artisan)
        response = self.client.get('/api/appointments/artisan-dashboard/')
        self.assertEqual(response.status_code, 200)
        metrics = response.data['metrics']
        self.assertEqual(Decimal(str(metrics['revenue_total'])), Decimal('25000'))
        self.assertEqual(metrics['pending_requests'], 1)
        self.assertEqual(metrics['clients'], 1)
        self.assertEqual(metrics['active_services'], 1)
        self.assertEqual(metrics['reviews_count'], 1)
        self.assertEqual(metrics['unread_notifications'], 1)


    def test_dashboard_accepts_null_optional_portfolio_fields(self):
        Portfolio.objects.create(
            artisan=self.artisan,
            bio='',
            localisation=None,
            whatsapp=None,
        )
        self.client.force_authenticate(self.artisan)
        response = self.client.get('/api/appointments/artisan-dashboard/')
        self.assertEqual(response.status_code, 200)
        checks = response.data['artisan']['profile_checks']
        self.assertFalse(checks['bio'])
        self.assertFalse(checks['localisation'])
        self.assertFalse(checks['contact'])

    def test_client_cannot_open_artisan_dashboard(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.get('/api/appointments/artisan-dashboard/')
        self.assertEqual(response.status_code, 403)

    def test_artisan_clients_only_returns_related_clients(self):
        unrelated_client = CustomUser.objects.create_user(
            email='unrelated@example.com',
            username='unrelated_client',
            password='StrongPass123!',
            role='client',
        )
        self.client.force_authenticate(self.artisan)
        response = self.client.get('/api/appointments/artisan-clients/')
        self.assertEqual(response.status_code, 200)
        usernames = {row['username'] for row in response.data}
        self.assertIn(self.client_user.username, usernames)
        self.assertNotIn(unrelated_client.username, usernames)
        row = next(item for item in response.data if item['username'] == self.client_user.username)
        self.assertEqual(row['appointments_count'], 2)
        self.assertEqual(Decimal(str(row['paid_total'])), Decimal('25000'))
