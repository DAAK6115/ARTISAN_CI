from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomUser


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class SecurityAuthTests(APITestCase):
    def test_public_registration_rejects_admin_role(self):
        response = self.client.post(
            "/api/accounts/register/",
            {
                "email": "attacker@example.com",
                "username": "attacker",
                "password": "StrongPassword!2026",
                "role": "admin",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CustomUser.objects.filter(email="attacker@example.com").exists())

    def test_public_registration_rejects_weak_password(self):
        response = self.client.post(
            "/api/accounts/register/",
            {
                "email": "weak@example.com",
                "username": "weakuser",
                "password": "1234567890",
                "role": "client",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_user_cannot_login(self):
        user = CustomUser.objects.create_user(
            email="blocked@example.com",
            username="blocked",
            password="StrongPassword!2026",
            role="client",
        )
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = self.client.post(
            "/api/accounts/login/",
            {
                "email": "blocked@example.com",
                "password": "StrongPassword!2026",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", response.data)

    def test_password_reset_does_not_reveal_unknown_email(self):
        response = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": "unknown@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertNotIn("introuvable", str(response.data).lower())
    def test_logout_blacklists_refresh_token(self):
        user = CustomUser.objects.create_user(
            email="logout@example.com",
            username="logout-user",
            password="StrongPassword!2026",
            role="client",
        )
        login = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": "StrongPassword!2026"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        refresh = login.data["refresh"]

        logout = self.client.post(
            "/api/accounts/logout/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)

        reuse = self.client.post(
            "/api/accounts/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_refresh_token(self):
        user = CustomUser.objects.create_user(
            email="rotate@example.com",
            username="rotate-user",
            password="StrongPassword!2026",
            role="client",
        )
        login = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": "StrongPassword!2026"},
            format="json",
        )
        old_refresh = login.data["refresh"]

        refreshed = self.client.post(
            "/api/accounts/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(refreshed.status_code, status.HTTP_200_OK)
        self.assertIn("access", refreshed.data)
        self.assertIn("refresh", refreshed.data)
        self.assertNotEqual(refreshed.data["refresh"], old_refresh)

        old_token_reuse = self.client.post(
            "/api/accounts/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(
            old_token_reuse.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

