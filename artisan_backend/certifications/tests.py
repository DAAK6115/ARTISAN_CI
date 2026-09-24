from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from .models import Certification


class CertificationModerationTests(APITestCase):
    def setUp(self):
        self.artisan = CustomUser.objects.create_user(
            email="artisan-cert@example.com", username="artisan-cert",
            password="StrongPassword!2026", role="artisan",
        )
        self.admin = CustomUser.objects.create_user(
            email="admin-cert@example.com", username="admin-cert",
            password="StrongPassword!2026", role="admin", is_staff=True,
        )
        self.cert = Certification.objects.create(
            artisan=self.artisan, nom="Attestation", organisme="Centre",
            fichier=SimpleUploadedFile("attestation.pdf", b"%PDF-1.4 fake", content_type="application/pdf"),
        )

    def test_pending_certification_is_not_public(self):
        response = self.client.get(f"/api/certifications/artisan/{self.artisan.username}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_admin_can_verify_certification(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/certifications/admin/{self.cert.id}/review/",
            {"action": "verify", "note": "Document conforme"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cert.refresh_from_db()
        self.assertEqual(self.cert.status, "verified")
        self.assertEqual(self.cert.reviewed_by, self.admin)
