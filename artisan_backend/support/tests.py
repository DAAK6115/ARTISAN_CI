from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from .models import Reclamation


class SupportWorkflowTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(
            email="support-client@example.com", username="support-client",
            password="StrongPassword!2026", role="client",
        )
        self.other = CustomUser.objects.create_user(
            email="support-other@example.com", username="support-other",
            password="StrongPassword!2026", role="client",
        )
        self.admin = CustomUser.objects.create_user(
            email="support-admin@example.com", username="support-admin",
            password="StrongPassword!2026", role="admin", is_staff=True,
        )

    def test_user_lists_only_own_tickets(self):
        Reclamation.objects.create(client=self.client_user, objet="Mon ticket", message="Description suffisamment longue")
        Reclamation.objects.create(client=self.other, objet="Autre ticket", message="Description suffisamment longue")
        self.client.force_authenticate(self.client_user)
        response = self.client.get("/api/support/mes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["objet"], "Mon ticket")

    def test_admin_can_answer_ticket(self):
        ticket = Reclamation.objects.create(client=self.client_user, objet="Question", message="Description suffisamment longue")
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/support/admin/{ticket.id}/",
            {"statut": "resolved", "priorite": "normal", "admin_response": "Problème résolu."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.statut, "resolved")
        self.assertEqual(ticket.assigned_to, self.admin)

    def test_user_cannot_self_assign_urgent_priority(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            "/api/support/envoyer/",
            {
                "objet": "Besoin d’aide",
                "message": "Description suffisamment longue pour le support.",
                "priorite": "urgent",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket = Reclamation.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.priorite, "normal")
