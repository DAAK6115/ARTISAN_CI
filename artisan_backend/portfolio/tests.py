from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from .models import Portfolio


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
