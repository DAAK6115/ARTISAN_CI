from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from services.models import Service
from reviews.models import Review
from appointments.models import ArtisanAvailability
from .models import Portfolio
from .serializers import PortfolioSerializer


class PortfolioDiscoveryTests(APITestCase):
    def _artisan(self, username, localisation, latitude=None, longitude=None):
        artisan = CustomUser.objects.create_user(
            email=f'{username}@example.com',
            username=username,
            password='StrongPass123!',
            role='artisan',
        )
        Portfolio.objects.create(
            artisan=artisan,
            bio=f'Profil de {username}',
            localisation=localisation,
            latitude=latitude,
            longitude=longitude,
            visible=True,
        )
        return artisan

    def _service(self, artisan, title, category, **extra):
        payload = {
            'artisan': artisan,
            'titre': title,
            'description': f'Prestation {title}',
            'prix': Decimal('10000'),
            'categorie': category,
            'is_active': True,
        }
        payload.update(extra)
        return Service.objects.create(**payload)

    def test_public_list_includes_profile_without_gps_when_location_not_requested(self):
        artisan = self._artisan('portfolio5', 'Cocody')

        response = self.client.get(reverse('portfolio-map'), {'scope': 'all'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], artisan.username)

    def test_categories_only_include_active_services_represented_in_current_zone(self):
        nearby_tailor = self._artisan('tailor-near', 'Cocody', Decimal('5.360000'), Decimal('-4.008000'))
        far_hairdresser = self._artisan('hair-far', 'Grand-Bassam', Decimal('5.200000'), Decimal('-3.730000'))
        self._service(nearby_tailor, 'Confection de tenues', 'couture_habillement')
        self._service(far_hairdresser, 'Tresses et coiffure', 'coiffure_esthetique')

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'nearby',
            'lat': '5.35995',
            'lng': '-4.00826',
            'radius': '5',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        values = {item['value'] for item in response.data['available_categories']}
        self.assertIn('couture_habillement', values)
        self.assertNotIn('coiffure_esthetique', values)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'tailor-near')

    def test_free_search_understands_trade_alias_but_returns_real_category(self):
        plumber = self._artisan('plumber', 'Yopougon', Decimal('5.340000'), Decimal('-4.090000'))
        self._service(plumber, 'Dépannage sanitaire', 'btp')

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'search': 'plombier',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'plumber')
        self.assertEqual(response.data['available_categories'][0]['value'], 'btp')

    def test_client_can_expand_search_outside_nearby_radius(self):
        near = self._artisan('nearby-artisan', 'Cocody', Decimal('5.360000'), Decimal('-4.008000'))
        far = self._artisan('far-artisan', 'Grand-Bassam', Decimal('5.200000'), Decimal('-3.730000'))
        self._service(near, 'Menuiserie locale', 'bois')
        self._service(far, 'Menuiserie Bassam', 'bois')

        nearby_response = self.client.get(reverse('portfolio-map'), {
            'scope': 'nearby',
            'lat': '5.35995',
            'lng': '-4.00826',
            'radius': '5',
        })
        self.assertEqual(nearby_response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['artisan_nom'] for item in nearby_response.data['results']}, {'nearby-artisan'})

        expanded_response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'search': 'Grand-Bassam',
        })
        self.assertEqual(expanded_response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['artisan_nom'] for item in expanded_response.data['results']}, {'far-artisan'})

    def test_discovery_exposes_real_rating_average_and_review_count(self):
        artisan = self._artisan('rated-artisan', 'Cocody')
        service = self._service(artisan, 'Installation plomberie', 'btp')
        client = CustomUser.objects.create_user(
            email='rating-client@example.com',
            username='rating-client',
            password='StrongPass123!',
            role='client',
        )
        Review.objects.create(client=client, service=service, note=5, commentaire='Excellent')
        Review.objects.create(client=client, service=service, note=4, commentaire='Très bien')

        response = self.client.get(reverse('portfolio-map'), {'scope': 'all'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data['results'] if item['artisan_nom'] == 'rated-artisan')
        self.assertEqual(row['review_count'], 2)
        self.assertEqual(float(row['rating_average']), 4.5)

    def test_category_filter_only_returns_artisans_with_that_active_category(self):
        tailor = self._artisan('tailor', 'Cocody')
        mechanic = self._artisan('mechanic', 'Cocody')
        self._service(tailor, 'Couture sur mesure', 'couture_habillement')
        self._service(mechanic, 'Entretien automobile', 'mecanique_auto')

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'category': 'couture_habillement',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'tailor')
        values = {item['value'] for item in response.data['available_categories']}
        self.assertEqual(values, {'couture_habillement', 'mecanique_auto'})


    def test_verified_filter_and_facet_only_use_real_verified_artisans(self):
        verified = self._artisan('verified-pro', 'Cocody')
        verified.verification_status = 'verified'
        verified.save(update_fields=['verification_status'])
        other = self._artisan('regular-pro', 'Cocody')
        self._service(verified, 'Plomberie vérifiée', 'btp')
        self._service(other, 'Plomberie standard', 'btp')

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'verified': 'true',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available_filters']['verified'], 1)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'verified-pro')

    def test_home_service_filter_only_returns_services_that_can_visit_client(self):
        mobile = self._artisan('mobile-pro', 'Cocody')
        workshop = self._artisan('workshop-pro', 'Cocody')
        self._service(mobile, 'Dépannage à domicile', 'electronique', mode_intervention='chez_client')
        self._service(workshop, 'Réparation atelier', 'electronique', mode_intervention='atelier')

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'home_service': 'true',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available_filters']['home_service'], 1)
        self.assertEqual(response.data['total'], 1)
        row = response.data['results'][0]
        self.assertEqual(row['artisan_nom'], 'mobile-pro')
        self.assertTrue(row['supports_home_service'])

    def test_minimum_rating_filter_uses_real_reviews(self):
        top = self._artisan('top-rated', 'Cocody')
        low = self._artisan('lower-rated', 'Cocody')
        top_service = self._service(top, 'Top service', 'btp')
        low_service = self._service(low, 'Service moyen', 'btp')
        client = CustomUser.objects.create_user(
            email='facet-rating@example.com',
            username='facet-rating',
            password='StrongPass123!',
            role='client',
        )
        Review.objects.create(client=client, service=top_service, note=5)
        Review.objects.create(client=client, service=low_service, note=3)

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'min_rating': '4.5',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'top-rated')
        values = {str(item['value']): item['count'] for item in response.data['available_filters']['rating_options']}
        self.assertEqual(values.get('4.5'), 1)

    def test_availability_7d_filter_requires_a_real_bookable_slot(self):
        available = self._artisan('available-pro', 'Cocody')
        unavailable = self._artisan('no-hours-pro', 'Cocody')
        self._service(
            available,
            'Service disponible',
            'btp',
            duree_minutes=30,
            delai_reservation_heures=0,
        )
        self._service(
            unavailable,
            'Service sans horaire',
            'btp',
            duree_minutes=30,
            delai_reservation_heures=0,
        )
        for weekday in range(7):
            ArtisanAvailability.objects.create(
                artisan=available,
                jour_semaine=weekday,
                heure_debut='08:00',
                heure_fin='23:30',
                actif=True,
            )

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'availability': '7d',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available_filters']['availability_7d'], 1)
        self.assertEqual(response.data['total'], 1)
        row = response.data['results'][0]
        self.assertEqual(row['artisan_nom'], 'available-pro')
        self.assertIsNotNone(row['next_available_at'])


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
