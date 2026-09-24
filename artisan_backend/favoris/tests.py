from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from services.models import Service
from .models import Favorite


class FavoriteApiTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(
            email='client5@example.com',
            username='client5',
            password='StrongPass123!',
            role='client',
        )
        self.artisan = CustomUser.objects.create_user(
            email='artisan-fav@example.com',
            username='artisan-fav',
            password='StrongPass123!',
            role='artisan',
        )
        self.service = Service.objects.create(
            artisan=self.artisan,
            titre='Coiffure à domicile',
            description='Prestation de coiffure.',
            prix=10000,
            categorie='coiffure_esthetique',
        )

    def test_client_can_toggle_and_receive_nested_service(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(reverse('toggle-favorite', args=[self.service.pk]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Favorite.objects.filter(client=self.client_user, service=self.service).exists())

        response = self.client.get(reverse('mes-favoris'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['service']['id'], self.service.pk)

    def test_artisan_cannot_use_client_favorites(self):
        self.client.force_authenticate(self.artisan)
        response = self.client.post(reverse('toggle-favorite', args=[self.service.pk]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
