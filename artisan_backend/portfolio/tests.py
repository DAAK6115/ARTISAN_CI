from decimal import Decimal
from unittest.mock import Mock, patch

from django.core.cache import cache
from django.test import override_settings
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


    @override_settings(
        OPENROUTESERVICE_API_KEY='test-key',
        OPENROUTESERVICE_BASE_URL='https://api.heigit.org/openrouteservice',
        OPENROUTESERVICE_CACHE_SECONDS=1,
        OPENROUTESERVICE_MATRIX_MAX_DESTINATIONS=100,
    )
    @patch('integrations.routing.requests.post')
    def test_route_metrics_expose_real_road_distance_and_duration(self, mock_post):
        cache.clear()
        artisan = self._artisan('route-pro', 'Cocody', Decimal('5.365000'), Decimal('-4.005000'))
        self._service(artisan, 'Dépannage plomberie', 'btp')

        provider_response = Mock()
        provider_response.raise_for_status.return_value = None
        provider_response.json.return_value = {
            'distances': [[3.8]],
            'durations': [[660]],
        }
        mock_post.return_value = provider_response

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'lat': '5.35995',
            'lng': '-4.00826',
            'route_metrics': 'true',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data['results'][0]
        self.assertEqual(float(row['route_distance_km']), 3.8)
        self.assertEqual(row['route_duration_minutes'], 11)
        self.assertEqual(row['distance_source'], 'road')
        self.assertTrue(response.data['routing']['configured'])
        self.assertIn('/v2/matrix/driving-car', mock_post.call_args.args[0])
        payload = mock_post.call_args.kwargs['json']
        self.assertEqual(payload['sources'], ['0'])
        self.assertEqual(payload['destinations'], ['1'])
        self.assertEqual(payload['metrics'], ['distance', 'duration'])

    @override_settings(
        OPENROUTESERVICE_API_KEY='test-key',
        OPENROUTESERVICE_BASE_URL='https://api.heigit.org/openrouteservice',
        OPENROUTESERVICE_CACHE_SECONDS=1,
    )
    @patch('integrations.routing.requests.post')
    def test_nearby_radius_uses_road_distance_when_available(self, mock_post):
        cache.clear()
        artisan = self._artisan('detour-pro', 'Cocody', Decimal('5.365000'), Decimal('-4.005000'))
        self._service(artisan, 'Service avec détour', 'btp')

        provider_response = Mock()
        provider_response.raise_for_status.return_value = None
        provider_response.json.return_value = {
            'distances': [[8.0]],
            'durations': [[900]],
        }
        mock_post.return_value = provider_response

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'nearby',
            'lat': '5.35995',
            'lng': '-4.00826',
            'radius': '5',
            'route_metrics': 'true',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)


    @override_settings(
        OPENROUTESERVICE_API_KEY='test-key',
        OPENROUTESERVICE_BASE_URL='https://api.heigit.org/openrouteservice',
        OPENROUTESERVICE_CACHE_SECONDS=1,
        OPENROUTESERVICE_MATRIX_MAX_DESTINATIONS=100,
    )
    @patch('integrations.routing.requests.post')
    def test_travel_time_filter_keeps_only_artisans_reachable_in_selected_time(self, mock_post):
        cache.clear()
        near = self._artisan('time-near', 'Cocody', Decimal('5.365000'), Decimal('-4.005000'))
        far = self._artisan('time-far', 'Yopougon', Decimal('5.350000'), Decimal('-4.070000'))
        self._service(near, 'Intervention rapide', 'btp')
        self._service(far, 'Intervention éloignée', 'btp')

        provider_response = Mock()
        provider_response.raise_for_status.return_value = None
        provider_response.json.return_value = {
            'distances': [[2.4, 13.0]],
            'durations': [[600, 2100]],
        }
        mock_post.return_value = provider_response

        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'nearby',
            'lat': '5.35995',
            'lng': '-4.00826',
            'travel_time_minutes': '15',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['search_mode'], 'time')
        self.assertEqual(response.data['travel_time_minutes'], 15)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'time-near')
        self.assertEqual(response.data['results'][0]['route_duration_minutes'], 10)



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

    def test_local_number_uses_artisan_country(self):
        serializer = PortfolioSerializer(
            self.portfolio,
            data={'whatsapp': '01 40 93 75 04'},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        self.assertEqual(updated.whatsapp, '+2250140937504')

    def test_french_local_number_uses_artisan_country(self):
        self.artisan.country_code = 'FR'
        self.artisan.country_calling_code = '+33'
        self.artisan.save(update_fields=['country_code', 'country_calling_code'])
        serializer = PortfolioSerializer(
            self.portfolio,
            data={'whatsapp': '06 12 34 56 78'},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        self.assertEqual(updated.whatsapp, '+33612345678')


class TravelTimeIsochroneTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(
            email='iso-client@example.com',
            username='iso-client',
            password='StrongPass123!',
            role='client',
        )

    @override_settings(
        OPENROUTESERVICE_API_KEY='test-key',
        OPENROUTESERVICE_BASE_URL='https://api.heigit.org/openrouteservice',
        OPENROUTESERVICE_CACHE_SECONDS=1,
    )
    @patch('integrations.routing.requests.post')
    def test_client_receives_isochrone_polygon_for_selected_minutes(self, post_mock):
        cache.clear()
        response_mock = Mock()
        response_mock.raise_for_status.return_value = None
        response_mock.json.return_value = {
            'features': [{
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[
                        [-4.02, 5.35],
                        [-4.00, 5.34],
                        [-3.98, 5.36],
                        [-4.02, 5.35],
                    ]],
                },
                'properties': {'value': 1800},
            }],
        }
        post_mock.return_value = response_mock
        self.client.force_authenticate(self.client_user)

        response = self.client.post(reverse('travel-time-isochrone'), {
            'lat': 5.35995,
            'lng': -4.00826,
            'minutes': 30,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['travel_time_minutes'], 30)
        self.assertEqual(response.data['geometry']['type'], 'Polygon')
        self.assertNotIn('api_key', response.data)
        self.assertTrue(post_mock.call_args.args[0].endswith('/v2/isochrones/driving-car'))
        payload = post_mock.call_args.kwargs['json']
        self.assertEqual(payload['range'], [1800])
        self.assertEqual(payload['range_type'], 'time')

    def test_isochrone_endpoint_is_reserved_for_authenticated_clients(self):
        response = self.client.post(reverse('travel-time-isochrone'), {
            'lat': 5.35995,
            'lng': -4.00826,
            'minutes': 30,
        }, format='json')
        self.assertIn(response.status_code, {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN})



class RouteToArtisanTests(APITestCase):
    def setUp(self):
        self.client_user = CustomUser.objects.create_user(
            email='route-client@example.com',
            username='route-client',
            password='StrongPass123!',
            role='client',
        )
        self.artisan = CustomUser.objects.create_user(
            email='route-artisan@example.com',
            username='route-artisan',
            password='StrongPass123!',
            role='artisan',
        )
        self.portfolio = Portfolio.objects.create(
            artisan=self.artisan,
            localisation='Cocody Angré',
            latitude=Decimal('5.398830'),
            longitude=Decimal('-3.956508'),
            visible=True,
        )

    @override_settings(
        OPENROUTESERVICE_API_KEY='test-key',
        OPENROUTESERVICE_BASE_URL='https://api.heigit.org/openrouteservice',
        OPENROUTESERVICE_CACHE_SECONDS=1,
    )
    @patch('integrations.routing.requests.post')
    def test_client_receives_route_geometry_without_exposing_provider_key(self, post_mock):
        cache.clear()
        response_mock = Mock()
        response_mock.raise_for_status.return_value = None
        response_mock.json.return_value = {
            'features': [{
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [[-3.9600, 5.3950], [-3.956508, 5.398830]],
                },
                'properties': {
                    'summary': {'distance': 1800.0, 'duration': 420.0},
                },
            }],
        }
        post_mock.return_value = response_mock
        self.client.force_authenticate(self.client_user)

        response = self.client.post(reverse('route-to-artisan'), {
            'artisan_id': self.portfolio.id,
            'lat': 5.3950,
            'lng': -3.9600,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['artisan_nom'], 'route-artisan')
        self.assertEqual(response.data['geometry']['type'], 'LineString')
        self.assertEqual(float(response.data['distance_km']), 1.8)
        self.assertEqual(response.data['duration_minutes'], 7)
        self.assertNotIn('api_key', response.data)
        post_mock.assert_called_once()
        self.assertTrue(post_mock.call_args.args[0].endswith('/v2/directions/driving-car/geojson'))

    def test_route_endpoint_is_reserved_for_authenticated_clients(self):
        response = self.client.post(reverse('route-to-artisan'), {
            'artisan_id': self.portfolio.id,
            'lat': 5.3950,
            'lng': -3.9600,
        }, format='json')
        self.assertIn(response.status_code, {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN})


class InterventionCoverageDiscoveryTests(APITestCase):
    def _artisan_with_zone(self, username, zone_type, *, radius=None, minutes=None):
        artisan = CustomUser.objects.create_user(
            email=f'{username}@example.com',
            username=username,
            password='StrongPass123!',
            role='artisan',
        )
        portfolio = Portfolio.objects.create(
            artisan=artisan,
            localisation='Cocody',
            latitude=Decimal('5.398830'),
            longitude=Decimal('-3.956508'),
            visible=True,
        )
        Service.objects.create(
            artisan=artisan,
            titre=f'Service {username}',
            description='Intervention à domicile.',
            prix=Decimal('10000'),
            categorie='btp',
            is_active=True,
            mode_intervention='chez_client',
            zone_intervention_type=zone_type,
            rayon_intervention_km=radius,
            temps_intervention_max_minutes=minutes,
        )
        return artisan, portfolio

    @patch('portfolio.views.driving_route_metrics')
    def test_radius_zone_marks_client_as_covered_using_road_distance(self, metrics_mock):
        _artisan, portfolio = self._artisan_with_zone('radius-covered', 'rayon', radius=10)
        metrics_mock.return_value = {
            str(portfolio.id): {'distance_km': 7.5, 'duration_minutes': 18},
        }
        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'lat': '5.390000',
            'lng': '-3.970000',
            'route_metrics': 'true',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data['results'][0]
        self.assertEqual(row['client_coverage_status'], 'covered')
        self.assertEqual(row['client_coverage_label'], 'Votre position est couverte')
        self.assertEqual(response.data['available_filters']['covered'], 1)

    @patch('portfolio.views.driving_route_metrics')
    def test_travel_time_zone_marks_client_outside_when_duration_exceeds_limit(self, metrics_mock):
        _artisan, portfolio = self._artisan_with_zone('time-outside', 'temps_trajet', minutes=15)
        metrics_mock.return_value = {
            str(portfolio.id): {'distance_km': 4.0, 'duration_minutes': 22},
        }
        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'lat': '5.390000',
            'lng': '-3.970000',
            'route_metrics': 'true',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['client_coverage_status'], 'outside')
        self.assertEqual(response.data['available_filters']['covered'], 0)

    @patch('portfolio.views.driving_route_metrics')
    def test_covered_filter_only_keeps_artisans_covering_client_position(self, metrics_mock):
        _a1, covered = self._artisan_with_zone('covered-zone', 'rayon', radius=10)
        _a2, outside = self._artisan_with_zone('outside-zone', 'rayon', radius=5)
        metrics_mock.return_value = {
            str(covered.id): {'distance_km': 8.0, 'duration_minutes': 20},
            str(outside.id): {'distance_km': 8.0, 'duration_minutes': 20},
        }
        response = self.client.get(reverse('portfolio-map'), {
            'scope': 'all',
            'lat': '5.390000',
            'lng': '-3.970000',
            'route_metrics': 'true',
            'covered': 'true',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['artisan_nom'], 'covered-zone')


class AddressGeocodingTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='geo8-client@example.com',
            username='geo8-client',
            password='StrongPass123!',
            role='client',
        )
        self.client.force_authenticate(self.user)

    @override_settings(
        NOMINATIM_BASE_URL='https://nominatim.example.test',
        NOMINATIM_CACHE_SECONDS=1,
        NOMINATIM_USER_AGENT='ARTISAN_CI-tests',
    )
    @patch('integrations.geocoding.requests.get')
    def test_address_search_returns_normalized_suggestions(self, get_mock):
        cache.clear()
        response_mock = Mock()
        response_mock.raise_for_status.return_value = None
        response_mock.json.return_value = [{
            'place_id': 123,
            'lat': '5.398830',
            'lon': '-3.956508',
            'display_name': 'CHU Angré, Cocody, Abidjan, Côte d’Ivoire',
            'type': 'hospital',
            'category': 'amenity',
            'address': {
                'road': 'Rue L195',
                'suburb': 'Angré',
                'city': 'Abidjan',
                'country': 'Côte d’Ivoire',
            },
        }]
        get_mock.return_value = response_mock

        response = self.client.get(reverse('address-search'), {'q': 'CHU Angré'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        row = response.data['results'][0]
        self.assertEqual(row['latitude'], 5.39883)
        self.assertEqual(row['longitude'], -3.956508)
        self.assertIn('Angré', row['label'])
        self.assertTrue(get_mock.call_args.args[0].endswith('/search'))
        self.assertEqual(get_mock.call_args.kwargs['headers']['User-Agent'], 'ARTISAN_CI-tests')

    @override_settings(
        NOMINATIM_BASE_URL='https://nominatim.example.test',
        NOMINATIM_CACHE_SECONDS=1,
    )
    @patch('integrations.geocoding.requests.get')
    def test_reverse_geocoding_returns_address_for_gps_position(self, get_mock):
        cache.clear()
        response_mock = Mock()
        response_mock.raise_for_status.return_value = None
        response_mock.json.return_value = {
            'place_id': 456,
            'lat': '5.398830',
            'lon': '-3.956508',
            'display_name': 'Angré, Cocody, Abidjan, Côte d’Ivoire',
            'address': {
                'suburb': 'Angré',
                'city': 'Abidjan',
                'country': 'Côte d’Ivoire',
            },
        }
        get_mock.return_value = response_mock

        response = self.client.get(reverse('address-reverse'), {
            'lat': '5.398830',
            'lng': '-3.956508',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['latitude'], 5.39883)
        self.assertIn('Angré', response.data['label'])
        self.assertTrue(get_mock.call_args.args[0].endswith('/reverse'))

    def test_geocoding_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('address-search'), {'q': 'Cocody'})
        self.assertIn(response.status_code, {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN})


class ApproximateLocationTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='geo9-client@example.com',
            username='geo9-client',
            password='StrongPass123!',
            role='client',
        )
        self.client.force_authenticate(self.user)

    @override_settings(GEOJS_ALLOW_SELF_LOOKUP=True)
    @patch('portfolio.views.approximate_location')
    def test_client_can_request_opt_in_approximate_location(self, location_mock):
        location_mock.return_value = {
            'latitude': 5.359952,
            'longitude': -4.008256,
            'city': 'Abidjan',
            'region': 'Abidjan',
            'country': "Côte d'Ivoire",
            'country_code': 'CI',
            'timezone': 'Africa/Abidjan',
            'accuracy_km': 25,
            'recommended_radius_km': 25,
            'label': "Abidjan, Côte d'Ivoire",
            'source': 'ip',
            'approximate': True,
        }

        response = self.client.get(reverse('approximate-location'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['approximate'])
        self.assertEqual(response.data['source'], 'ip')
        self.assertEqual(response.data['recommended_radius_km'], 25)
        self.assertNotIn('ip', response.data)

    def test_approximate_location_is_reserved_for_authenticated_clients(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('approximate-location'))
        self.assertIn(response.status_code, {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN})
