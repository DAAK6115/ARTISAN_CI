from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from services.models import Service


class ServiceMarketplaceTests(APITestCase):
    def setUp(self):
        self.artisan = CustomUser.objects.create_user(
            email='artisan5@example.com',
            username='artisan5',
            password='StrongPass123!',
            role='artisan',
        )
        self.service = Service.objects.create(
            artisan=self.artisan,
            titre='Réparation ordinateur portable',
            description='Diagnostic et réparation matérielle.',
            prix=25000,
            categorie='services_numeriques',
            mode_tarification='fixe',
            duree_minutes=60,
            mode_intervention='les_deux',
        )

    def test_service_detail_is_public_read_only(self):
        response = self.client.get(reverse('service-detail', args=[self.service.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['titre'], self.service.titre)

    def test_list_can_filter_by_artisan_and_category(self):
        response = self.client.get(
            reverse('service-list-create'),
            {'artisan': self.artisan.username, 'categorie': 'services_numeriques'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.service.pk)

    def test_invalid_price_range_is_rejected(self):
        response = self.client.get(
            reverse('service-list-create'),
            {'min_prix': '50000', 'max_prix': '10000'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
