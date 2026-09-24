from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from appointments.models import Appointment
from services.models import Service
from .models import Payment, Quote, QuoteLine


class ManualPostServicePaymentTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(
            email='client@example.com',
            username='client_test',
            password='StrongPass123!',
            role='client',
        )
        self.artisan = CustomUser.objects.create_user(
            email='artisan@example.com',
            username='artisan_test',
            password='StrongPass123!',
            role='artisan',
        )
        self.other_artisan = CustomUser.objects.create_user(
            email='other@example.com',
            username='other_artisan',
            password='StrongPass123!',
            role='artisan',
        )
        self.service = Service.objects.create(
            artisan=self.artisan,
            titre='Réparation test',
            description='Prestation de test',
            prix=Decimal('25000'),
            categorie='electronique',
            mode_tarification='fixe',
            duree_minutes=60,
            delai_reservation_heures=0,
            mode_intervention='chez_client',
        )
        start = timezone.now() + timedelta(days=1)
        self.appointment = Appointment.objects.create(
            client=self.client_user,
            service=self.service,
            date_rdv=start,
            date_fin=start + timedelta(hours=1),
            statut='confirme',
        )

    def test_payment_cannot_be_declared_before_service_is_completed(self):
        self.client.force_authenticate(self.artisan)
        response = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'paid',
                'methode_paiement': 'cash',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Payment.objects.exists())

    def test_only_appointment_artisan_can_declare_payment(self):
        self.appointment.statut = 'termine'
        self.appointment.completed_at = timezone.now()
        self.appointment.save(update_fields=['statut', 'completed_at', 'updated_at'])

        self.client.force_authenticate(self.other_artisan)
        response = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'paid',
                'methode_paiement': 'wave',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Payment.objects.exists())

    def test_artisan_can_mark_unpaid_then_paid_after_completion(self):
        self.appointment.statut = 'termine'
        self.appointment.completed_at = timezone.now()
        self.appointment.save(update_fields=['statut', 'completed_at', 'updated_at'])
        self.client.force_authenticate(self.artisan)

        unpaid = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'unpaid',
                'notes': 'Le client règlera plus tard.',
            },
            format='json',
        )
        self.assertEqual(unpaid.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(appointment=self.appointment)
        self.assertEqual(payment.statut, 'unpaid')
        self.assertIsNone(payment.methode_paiement)
        self.assertEqual(payment.montant, Decimal('25000'))

        paid = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'paid',
                'methode_paiement': 'orange_money',
            },
            format='json',
        )
        self.assertEqual(paid.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.statut, 'paid')
        self.assertEqual(payment.methode_paiement, 'orange_money')
        self.assertEqual(payment.declared_by, self.artisan)
        self.assertIsNotNone(payment.paid_at)

    def test_client_has_no_endpoint_to_declare_payment(self):
        self.appointment.statut = 'termine'
        self.appointment.completed_at = timezone.now()
        self.appointment.save(update_fields=['statut', 'completed_at', 'updated_at'])
        self.client.force_authenticate(self.client_user)

        response = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'paid',
                'methode_paiement': 'cash',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Payment.objects.exists())

    def test_paid_declaration_cannot_be_reversed_by_artisan(self):
        self.appointment.statut = 'termine'
        self.appointment.completed_at = timezone.now()
        self.appointment.save(update_fields=['statut', 'completed_at', 'updated_at'])
        self.client.force_authenticate(self.artisan)

        first = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'paid',
                'methode_paiement': 'cash',
            },
            format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': self.appointment.id,
                'statut': 'unpaid',
            },
            format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Payment.objects.get(appointment=self.appointment).statut, 'paid')

    def test_accepted_quote_total_is_used_for_quote_priced_service(self):
        quoted_service = Service.objects.create(
            artisan=self.artisan,
            titre='Chantier sur devis',
            description='Prestation sur devis',
            prix=Decimal('0'),
            categorie='btp',
            mode_tarification='sur_devis',
            duree_minutes=120,
            delai_reservation_heures=0,
            mode_intervention='chez_client',
        )
        start = timezone.now() + timedelta(days=2)
        appointment = Appointment.objects.create(
            client=self.client_user,
            service=quoted_service,
            date_rdv=start,
            date_fin=start + timedelta(hours=2),
            statut='termine',
            completed_at=timezone.now(),
        )
        quote = Quote.objects.create(
            appointment=appointment,
            artisan=self.artisan,
            client=self.client_user,
            status='accepted',
            subtotal=Decimal('60000'),
            discount_amount=Decimal('5000'),
            total=Decimal('55000'),
            accepted_at=timezone.now(),
        )
        QuoteLine.objects.create(
            quote=quote,
            description='Travaux',
            quantity=1,
            unit_price=Decimal('60000'),
        )

        self.client.force_authenticate(self.artisan)
        response = self.client.post(
            '/api/payments/declare/',
            {
                'appointment_id': appointment.id,
                'statut': 'paid',
                'methode_paiement': 'mtn_money',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(appointment=appointment)
        self.assertEqual(payment.montant, Decimal('55000'))
        self.assertEqual(payment.quote, quote)


    def test_completion_preview_and_atomic_payment_declaration(self):
        self.appointment.statut = 'en_cours'
        self.appointment.started_at = timezone.now()
        self.appointment.save(update_fields=['statut', 'started_at', 'updated_at'])
        self.client.force_authenticate(self.artisan)

        preview = self.client.get(
            f'/api/payments/complete-service/{self.appointment.id}/'
        )
        self.assertEqual(preview.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(preview.data['montant'])), Decimal('25000'))

        completed = self.client.post(
            f'/api/payments/complete-service/{self.appointment.id}/',
            {
                'statut': 'paid',
                'methode_paiement': 'wave',
                'payment_reference': 'WAVE-TEST-123',
                'notes': 'Réglé après la prestation.',
            },
            format='json',
        )
        self.assertEqual(completed.status_code, status.HTTP_200_OK)

        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.statut, 'termine')
        self.assertIsNotNone(self.appointment.completed_at)

        payment = Payment.objects.get(appointment=self.appointment)
        self.assertEqual(payment.statut, 'paid')
        self.assertEqual(payment.methode_paiement, 'wave')
        self.assertEqual(payment.payment_reference, 'WAVE-TEST-123')

    def test_invalid_payment_form_does_not_complete_service(self):
        self.appointment.statut = 'en_cours'
        self.appointment.started_at = timezone.now()
        self.appointment.save(update_fields=['statut', 'started_at', 'updated_at'])
        self.client.force_authenticate(self.artisan)

        response = self.client.post(
            f'/api/payments/complete-service/{self.appointment.id}/',
            {
                'statut': 'paid',
                # méthode volontairement absente
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.statut, 'en_cours')
        self.assertFalse(Payment.objects.filter(appointment=self.appointment).exists())
