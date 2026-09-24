from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from .models import Portfolio
from .serializers import PortfolioSerializer


class PortfolioDiscoveryTests(APITestCase):
    def test_public_list_includes_profile_without_gps_when_location_not_requested(self):
        artisan = CustomUser.objects.create_user(
            email='portfolio5@example.com',
            username='portfolio5',
            password='StrongPass123!',
            role='artisan',
        )
        Portfolio.objects.create(
            artisan=artisan,
            bio='Menuisier à Abidjan',
            localisation='Cocody',
            visible=True,
        )

        response = self.client.get(reverse('portfolio-map'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['artisan_nom'], artisan.username)


class PortfolioLocationAndPhoneValidationTests(APITestCase):
    def setUp(self):
        self.artisan = CustomUser.objects.create_user(
            email='gps-phone@example.com',
            username='gpsphone',
            password='StrongPass123!',
            role='artisan',
        )
        self.portfolio = Portfolio.objects.create(artisan=self.artisan)

    def test_high_precision_gps_is_rounded_to_model_precision(self):
        serializer = PortfolioSerializer(
            self.portfolio,
            data={
                'latitude': 5.398830123456789,
                'longitude': -3.956508987654321,
            },
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.portfolio.refresh_from_db()

        self.assertEqual(self.portfolio.latitude, Decimal('5.398830'))
        self.assertEqual(self.portfolio.longitude, Decimal('-3.956509'))

    def test_ivory_coast_whatsapp_number_is_accepted_and_normalized(self):
        serializer = PortfolioSerializer(
            self.portfolio,
            data={'whatsapp': '+225 01 40 93 75 04'},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        self.assertEqual(updated.whatsapp, '+2250140937504')

    def test_other_international_numbers_are_accepted(self):
        for raw, expected in [
            ('+33 6 12 34 56 78', '+33612345678'),
            ('00 1 415 555 2671', '+14155552671'),
        ]:
            serializer = PortfolioSerializer(
                self.portfolio,
                data={'whatsapp': raw},
                partial=True,
            )
            self.assertTrue(serializer.is_valid(), serializer.errors)
            updated = serializer.save()
            self.assertEqual(updated.whatsapp, expected)

    def test_local_number_without_country_code_is_rejected(self):
        serializer = PortfolioSerializer(
            self.portfolio,
            data={'whatsapp': '0140937504'},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('whatsapp', serializer.errors)
