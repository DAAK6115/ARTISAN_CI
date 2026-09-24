from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from services.models import Service
from appointments.models import Appointment
from .models import ChatBlock, Message
from .services import consume_websocket_ticket, issue_websocket_ticket


class ChatSecurityTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(email="client8@example.com", username="client8", password="StrongPass123!", role="client")
        self.other_client = CustomUser.objects.create_user(email="client9@example.com", username="client9", password="StrongPass123!", role="client")
        self.artisan = CustomUser.objects.create_user(email="artisan8@example.com", username="artisan8", password="StrongPass123!", role="artisan")
        self.service = Service.objects.create(artisan=self.artisan, titre="Test", description="Test", prix=1000, categorie="services_numeriques")

    def test_client_cannot_message_another_client(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post("/api/chat/messages/send/", {"receiver": self.other_client.id, "content": "Salut"})
        self.assertEqual(response.status_code, 403)

    def test_client_can_message_artisan(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post("/api/chat/messages/send/", {"receiver": self.artisan.id, "content": "Bonjour"})
        self.assertEqual(response.status_code, 201)

    def test_block_prevents_message(self):
        ChatBlock.objects.create(blocker=self.artisan, blocked=self.client_user)
        self.client.force_authenticate(self.client_user)
        response = self.client.post("/api/chat/messages/send/", {"receiver": self.artisan.id, "content": "Bonjour"})
        self.assertEqual(response.status_code, 403)

    def test_read_endpoint_only_marks_incoming_messages(self):
        incoming = Message.objects.create(sender=self.artisan, receiver=self.client_user, content="Reçu")
        outgoing = Message.objects.create(sender=self.client_user, receiver=self.artisan, content="Envoyé")
        self.client.force_authenticate(self.client_user)
        response = self.client.post(f"/api/chat/messages/{self.artisan.id}/read/")
        self.assertEqual(response.status_code, 200)
        incoming.refresh_from_db(); outgoing.refresh_from_db()
        self.assertTrue(incoming.is_read)
        self.assertFalse(outgoing.is_read)

    def test_websocket_ticket_is_one_time(self):
        raw = issue_websocket_ticket(self.client_user)
        first = consume_websocket_ticket(raw)
        second = consume_websocket_ticket(raw)
        self.assertEqual(first.id, self.client_user.id)
        self.assertIsNone(second)

    def test_foreign_message_cannot_be_edited_or_deleted(self):
        foreign = Message.objects.create(
            sender=self.artisan,
            receiver=self.other_client,
            content="Privé",
        )
        self.client.force_authenticate(self.client_user)

        edited = self.client.patch(
            f"/api/chat/messages/{foreign.id}/update/",
            {"content": "Tentative"},
            format="json",
        )
        deleted = self.client.delete(f"/api/chat/messages/{foreign.id}/delete/")
        marked = self.client.patch(f"/api/chat/messages/{foreign.id}/mark-as-read/")

        self.assertEqual(edited.status_code, 404)
        self.assertEqual(deleted.status_code, 404)
        self.assertEqual(marked.status_code, 404)

    def test_cannot_block_self(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(f"/api/chat/blocks/{self.client_user.id}/toggle/")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ChatBlock.objects.filter(blocker=self.client_user, blocked=self.client_user).exists())
