from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from .models import ClientAddress, CustomUser


CI = {
    "code": "CI",
    "name": "Côte d’Ivoire",
    "dial_code": "+225",
    "currency": "XOF",
    "flag": "🇨🇮",
}
FR = {
    "code": "FR",
    "name": "France",
    "dial_code": "+33",
    "currency": "EUR",
    "flag": "🇫🇷",
}


class Int2RegistrationPhoneTests(APITestCase):
    @patch("accounts.serializers.get_country", return_value=FR)
    def test_registration_stores_primary_phone_in_e164(self, _mocked):
        response = self.client.post(
            "/api/accounts/register/",
            {
                "email": "phone-primary@example.com",
                "username": "phone-primary",
                "password": "StrongPassword!2026",
                "role": "client",
                "country_code": "FR",
                "phone_number": "06 12 34 56 78",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = CustomUser.objects.get(email="phone-primary@example.com")
        self.assertEqual(user.phone_number, "+33612345678")
        self.assertIsNone(user.numero_momo)


class Int2ClientAddressTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="client-address@example.com",
            username="client-address",
            password="StrongPassword!2026",
            role="client",
            country_code="CI",
        )
        self.client.force_authenticate(self.user)

    @patch("accounts.address_serializers.get_country", return_value=CI)
    def test_first_address_becomes_default_and_syncs_legacy_primary_fields(self, _mocked):
        response = self.client.post(
            "/api/accounts/client/addresses/",
            {
                "label": "Maison",
                "address": "Cocody Angré, Abidjan",
                "city": "Abidjan",
                "country_code": "CI",
                "latitude": 5.387000,
                "longitude": -3.960000,
                "is_default": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(response.data["is_default"])

        self.user.refresh_from_db()
        self.assertEqual(self.user.primary_address, "Cocody Angré, Abidjan")
        self.assertEqual(str(self.user.primary_latitude), "5.387000")
        self.assertEqual(str(self.user.primary_longitude), "-3.960000")

    @patch("accounts.address_serializers.get_country", return_value=CI)
    def test_switching_default_address_keeps_only_one_default(self, _mocked):
        first = self.client.post(
            "/api/accounts/client/addresses/",
            {
                "label": "Maison",
                "address": "Angré, Abidjan",
                "country_code": "CI",
                "latitude": 5.390000,
                "longitude": -3.970000,
            },
            format="json",
        ).data
        second = self.client.post(
            "/api/accounts/client/addresses/",
            {
                "label": "Bureau",
                "address": "Plateau, Abidjan",
                "country_code": "CI",
                "latitude": 5.320000,
                "longitude": -4.020000,
            },
            format="json",
        ).data

        response = self.client.patch(
            f"/api/accounts/client/addresses/{second['id']}/",
            {"is_default": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.assertFalse(ClientAddress.objects.get(pk=first["id"]).is_default)
        self.assertTrue(ClientAddress.objects.get(pk=second["id"]).is_default)
        self.assertEqual(
            ClientAddress.objects.filter(user=self.user, is_default=True).count(),
            1,
        )

        self.user.refresh_from_db()
        self.assertEqual(self.user.primary_address, "Plateau, Abidjan")

    @patch("accounts.address_serializers.get_country", return_value=CI)
    def test_client_cannot_read_another_clients_address(self, _mocked):
        other = CustomUser.objects.create_user(
            email="other-client@example.com",
            username="other-client",
            password="StrongPassword!2026",
            role="client",
        )
        foreign = ClientAddress.objects.create(
            user=other,
            label="Maison",
            address="Adresse privée",
            country_code="CI",
            latitude=5.300000,
            longitude=-4.000000,
            is_default=True,
        )

        response = self.client.get(f"/api/accounts/client/addresses/{foreign.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_artisan_cannot_use_client_address_book(self):
        artisan = CustomUser.objects.create_user(
            email="artisan-address@example.com",
            username="artisan-address",
            password="StrongPassword!2026",
            role="artisan",
        )
        self.client.force_authenticate(artisan)
        response = self.client.get("/api/accounts/client/addresses/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
