from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from appointments.models import Appointment
from payments.models import Payment
from services.models import Service
from .models import AuditLog, Dispute, Report


class ModerationTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(
            email="mod-client@example.com", username="mod-client",
            password="StrongPassword!2026", role="client",
        )
        self.artisan = CustomUser.objects.create_user(
            email="mod-artisan@example.com", username="mod-artisan",
            password="StrongPassword!2026", role="artisan",
        )
        self.admin = CustomUser.objects.create_user(
            email="mod-admin@example.com", username="mod-admin",
            password="StrongPassword!2026", role="admin", is_staff=True,
        )
        self.service = Service.objects.create(
            artisan=self.artisan, titre="Service test", description="Description",
            prix=Decimal("10000"), categorie="services_numeriques",
        )
        start = timezone.now() + timedelta(days=1)
        self.appointment = Appointment.objects.create(
            client=self.client_user, service=self.service, date_rdv=start,
            date_fin=start + timedelta(hours=1), statut="termine",
        )
        self.payment = Payment.objects.create(
            client=self.client_user, service=self.service, appointment=self.appointment,
            montant_initial=Decimal("10000"), reduction=Decimal("0"), montant=Decimal("10000"),
            statut="paid", methode_paiement="cash", declared_by=self.artisan,
            declared_at=timezone.now(), paid_at=timezone.now(),
        )

    def test_client_can_contest_paid_declaration(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            f"/api/moderation/disputes/payment/{self.payment.id}/",
            {"reason": "Je n’ai pas réglé ce montant à cet artisan."}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Dispute.objects.filter(payment=self.payment, dispute_type="payment").exists())

    def test_artisan_cannot_use_admin_dashboard(self):
        self.client.force_authenticate(self.artisan)
        response = self.client.get("/api/moderation/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_verify_artisan_and_audit_is_recorded(self):
        self.artisan.verification_status = "pending"
        self.artisan.save(update_fields=["verification_status"])
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/moderation/admin/users/{self.artisan.id}/action/",
            {"action": "verify", "note": "Dossier contrôlé"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.artisan.refresh_from_db()
        self.assertEqual(self.artisan.verification_status, "verified")
        self.assertTrue(AuditLog.objects.filter(action="user_verify", target_id=self.artisan.id).exists())

    def test_user_cannot_report_self(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            "/api/moderation/reports/",
            {"target_user": self.client_user.id, "reason": "other", "description": "test"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Report.objects.exists())

    def test_duplicate_active_report_is_rejected(self):
        self.client.force_authenticate(self.client_user)
        payload = {
            "target_user": self.artisan.id,
            "reason": "spam",
            "description": "Signalement de contenu répétitif.",
        }
        first = self.client.post("/api/moderation/reports/", payload, format="json")
        second = self.client.post("/api/moderation/reports/", payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Report.objects.filter(reporter=self.client_user, target_user=self.artisan).count(), 1)
