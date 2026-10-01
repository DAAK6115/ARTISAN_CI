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


class ServiceInterventionZoneTests(APITestCase):
    def setUp(self):
        self.artisan = CustomUser.objects.create_user(
            email='zone-artisan@example.com',
            username='zone-artisan',
            password='StrongPass123!',
            role='artisan',
        )
        self.client.force_authenticate(self.artisan)

    def test_radius_zone_requires_radius(self):
        response = self.client.post(reverse('service-list-create'), {
            'titre': 'Dépannage à domicile',
            'description': 'Intervention chez le client.',
            'prix': '10000',
            'categorie': 'btp',
            'mode_tarification': 'fixe',
            'duree_minutes': 60,
            'delai_reservation_heures': 2,
            'mode_intervention': 'chez_client',
            'zone_intervention_type': 'rayon',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rayon_intervention_km', response.data)

    def test_travel_time_zone_is_saved_and_exposed(self):
        response = self.client.post(reverse('service-list-create'), {
            'titre': 'Installation à domicile',
            'description': 'Déplacement limité en temps.',
            'prix': '15000',
            'categorie': 'electronique',
            'mode_tarification': 'fixe',
            'duree_minutes': 60,
            'delai_reservation_heures': 2,
            'mode_intervention': 'les_deux',
            'zone_intervention_type': 'temps_trajet',
            'temps_intervention_max_minutes': 30,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['zone_intervention_type'], 'temps_trajet')
        self.assertEqual(response.data['temps_intervention_max_minutes'], 30)
        self.assertEqual(response.data['zone_intervention_type_label'], 'Temps de trajet maximum')

    def test_workshop_service_clears_home_zone_fields(self):
        response = self.client.post(reverse('service-list-create'), {
            'titre': 'Réparation en atelier',
            'description': 'Prestation uniquement en atelier.',
            'prix': '12000',
            'categorie': 'electronique',
            'mode_tarification': 'fixe',
            'duree_minutes': 60,
            'delai_reservation_heures': 2,
            'mode_intervention': 'atelier',
            'zone_intervention_type': 'rayon',
            'rayon_intervention_km': 25,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['zone_intervention_type'], 'sans_limite')
        self.assertIsNone(response.data['rayon_intervention_km'])
