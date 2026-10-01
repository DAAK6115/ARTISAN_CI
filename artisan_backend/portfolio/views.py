import logging
import unicodedata
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Prefetch, Q
from django.utils import timezone
from geopy.distance import geodesic
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.permissions import IsArtisan, IsClient
from appointments.domain import generate_available_slots
from services.models import Service
from reviews.models import Review
from integrations.routing import driving_isochrone, driving_route_geometry, driving_route_metrics, routing_configured
from .models import Portfolio, Realisation
from .serializers import PortfolioSerializer, RealisationSerializer

logger = logging.getLogger(__name__)

# Ces alias servent uniquement à comprendre une recherche libre.
# Les catégories affichées au client restent celles qui existent réellement
# dans les prestations actives des artisans retournés par la recherche.
_CATEGORY_SEARCH_ALIASES = {
    'alimentation': ('alimentation', 'traiteur', 'cuisinier', 'cuisiniere', 'patisserie', 'boulanger'),
    'artisanat_d_art': ('artisanat', 'art', 'sculpteur', 'sculpture', 'bijoutier', 'bijoux'),
    'btp': ('btp', 'plombier', 'plomberie', 'electricien', 'electricite', 'macon', 'maconnerie', 'peintre', 'batiment'),
    'bois': ('bois', 'menuisier', 'menuiserie', 'ebeniste', 'ebenisterie'),
    'cuir': ('cuir', 'cordonnier', 'cordonnerie', 'maroquinier', 'maroquinerie'),
    'coiffure_esthetique': ('coiffure', 'coiffeur', 'coiffeuse', 'tresse', 'tresses', 'barbier', 'esthetique', 'maquillage'),
    'couture_habillement': ('couture', 'tailleur', 'couturier', 'couturiere', 'habillement', 'styliste'),
    'electronique': ('electronique', 'electromenager', 'reparateur', 'reparation telephone', 'reparation ordinateur'),
    'energie_renouvelable': ('energie', 'solaire', 'panneau solaire', 'photovoltaique'),
    'mecanique_auto': ('mecanique', 'mecanicien', 'garage', 'automobile', 'auto', 'moto'),
    'metallurgie_soudure': ('soudure', 'soudeur', 'metallurgie', 'ferronnier', 'ferronnerie'),
    'savonnerie': ('savon', 'savonnerie', 'produits menagers'),
    'serigraphie': ('serigraphie', 'impression', 'imprimeur', 'flocage'),
    'services_numeriques': ('informatique', 'numerique', 'developpeur', 'developpement web', 'graphiste', 'design'),
    'transport': ('transport', 'logistique', 'livraison', 'livreur', 'demenagement'),
}


def _normalize_search_text(value):
    value = unicodedata.normalize('NFKD', str(value or ''))
    return ''.join(char for char in value if not unicodedata.combining(char)).lower().strip()


def _matching_category_values(token):
    normalized = _normalize_search_text(token)
    matches = set()
    for category, aliases in _CATEGORY_SEARCH_ALIASES.items():
        if any(normalized in alias or alias in normalized for alias in aliases):
            matches.add(category)

    for value, label in Service.CATEGORIES_CHOICES:
        normalized_label = _normalize_search_text(label)
        if normalized in normalized_label or normalized_label in normalized:
            matches.add(value)
    return matches


class MyPortfolioView(generics.RetrieveUpdateAPIView):
    serializer_class = PortfolioSerializer
    permission_classes = [IsArtisan]

    def get_object(self):
        portfolio, _ = Portfolio.objects.get_or_create(artisan=self.request.user)
        return portfolio


class PublicPortfolioView(generics.RetrieveAPIView):
    queryset = Portfolio.objects.filter(visible=True, artisan__is_active=True).select_related('artisan').prefetch_related('realisations')
    serializer_class = PortfolioSerializer
    lookup_field = 'artisan__username'
    permission_classes = [permissions.AllowAny]


class AddRealisationView(generics.CreateAPIView):
    serializer_class = RealisationSerializer
    permission_classes = [IsArtisan]

    def perform_create(self, serializer):
        portfolio, _ = Portfolio.objects.get_or_create(artisan=self.request.user)
        serializer.save(portfolio=portfolio)


class PortfolioMapView(generics.ListAPIView):
    """Découverte géolocalisée et filtrée des artisans.

    Les catégories et filtres exposés au frontend sont construits à partir des
    données réellement présentes dans le résultat courant. La disponibilité
    repose sur les créneaux effectivement réservables (horaires, indisponibilités,
    rendez-vous déjà pris et paramètres du service).
    """

    serializer_class = PortfolioSerializer
    permission_classes = [permissions.AllowAny]
    AVAILABILITY_VALUES = {'today', '7d'}

    def _base_queryset(self):
        active_services = Service.objects.filter(is_active=True).order_by('titre')
        return (
            Portfolio.objects.filter(visible=True, artisan__is_active=True)
            .select_related('artisan')
            .prefetch_related(
                'realisations',
                Prefetch('artisan__services', queryset=active_services, to_attr='active_services_for_discovery'),
            )
        )

    def _apply_search(self, queryset, search):
        tokens = [token for token in _normalize_search_text(search).split() if token]
        if not tokens:
            return queryset

        for token in tokens:
            category_values = _matching_category_values(token)
            token_query = (
                Q(artisan__username__icontains=token)
                | Q(bio__icontains=token)
                | Q(localisation__icontains=token)
                | Q(artisan__services__is_active=True, artisan__services__titre__icontains=token)
                | Q(artisan__services__is_active=True, artisan__services__description__icontains=token)
            )
            if category_values:
                token_query |= Q(
                    artisan__services__is_active=True,
                    artisan__services__categorie__in=category_values,
                )
            queryset = queryset.filter(token_query)
        return queryset.distinct()

    def _coordinates(self):
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        if lat in (None, '') or lng in (None, ''):
            return None
        try:
            lat_value = float(lat)
            lng_value = float(lng)
            if not (-90 <= lat_value <= 90 and -180 <= lng_value <= 180):
                raise ValueError
            return lat_value, lng_value
        except (TypeError, ValueError):
            raise ValidationError({'localisation': 'Coordonnées invalides.'})

    def _radius(self):
        try:
            radius = float(self.request.query_params.get('radius', 25))
        except (TypeError, ValueError):
            raise ValidationError({'radius': 'Rayon invalide.'})
        if radius <= 0 or radius > 1000:
            raise ValidationError({'radius': 'Le rayon doit être compris entre 0 et 1000 km.'})
        return radius

    def _minimum_rating(self):
        raw = str(self.request.query_params.get('min_rating', '')).strip()
        if not raw:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise ValidationError({'min_rating': 'Note minimale invalide.'})
        if value < 1 or value > 5:
            raise ValidationError({'min_rating': 'La note minimale doit être comprise entre 1 et 5.'})
        return value

    def _availability_filter(self):
        value = str(self.request.query_params.get('availability', '')).strip().lower()
        if value and value not in self.AVAILABILITY_VALUES:
            raise ValidationError({'availability': 'Disponibilité invalide.'})
        return value

    def _travel_time_minutes(self):
        raw = str(self.request.query_params.get('travel_time_minutes', '')).strip()
        if not raw:
            return None
        try:
            value = int(raw)
        except (TypeError, ValueError):
            raise ValidationError({'travel_time_minutes': 'Temps de trajet invalide.'})
        if value not in {15, 30, 45, 60}:
            raise ValidationError({'travel_time_minutes': 'Choisissez 15, 30, 45 ou 60 minutes.'})
        return value

    def _bool_param(self, name):
        raw = str(self.request.query_params.get(name, '')).strip().lower()
        if raw in {'', '0', 'false', 'no', 'non'}:
            return False
        if raw in {'1', 'true', 'yes', 'oui'}:
            return True
        raise ValidationError({name: 'Valeur booléenne invalide.'})

    @staticmethod
    def _service_categories(portfolio):
        services = getattr(portfolio.artisan, 'active_services_for_discovery', [])
        return {service.categorie for service in services if service.categorie}

    @staticmethod
    def _search_categories(search):
        categories = set()
        for token in [token for token in _normalize_search_text(search).split() if token]:
            categories.update(_matching_category_values(token))
        return categories

    def _eligible_services(self, portfolio, selected_category='', search=''):
        services = list(getattr(portfolio.artisan, 'active_services_for_discovery', []))
        if selected_category:
            services = [service for service in services if service.categorie == selected_category]
        search_categories = self._search_categories(search)
        if search_categories:
            services = [service for service in services if service.categorie in search_categories]
        return services

    @staticmethod
    def _supports_home_service(services):
        return any(service.mode_intervention in {'chez_client', 'les_deux'} for service in services)

    @staticmethod
    def _intervention_modes(services):
        labels = dict(Service.MODE_INTERVENTION_CHOICES)
        values = sorted({service.mode_intervention for service in services if service.mode_intervention})
        return [{'value': value, 'label': labels.get(value, value)} for value in values]


    @staticmethod
    def _client_coverage(portfolio, services, coordinates):
        home_services = [
            service for service in services
            if service.mode_intervention in {'chez_client', 'les_deux'}
        ]
        if not home_services:
            return {
                'status': 'workshop_only',
                'label': 'Atelier uniquement',
                'service': None,
            }
        if not coordinates:
            return {
                'status': 'location_required',
                'label': 'Activez votre position pour vérifier la zone',
                'service': None,
            }

        road_distance = getattr(portfolio, 'route_distance_km_value', None)
        straight_distance = getattr(portfolio, 'distance_km_value', None)
        duration = getattr(portfolio, 'route_duration_minutes_value', None)
        unknown = False

        for service in home_services:
            zone_type = getattr(service, 'zone_intervention_type', 'sans_limite') or 'sans_limite'
            if zone_type == 'sans_limite':
                return {'status': 'covered', 'label': 'Votre position est couverte', 'service': service.titre}
            if zone_type == 'rayon':
                limit = getattr(service, 'rayon_intervention_km', None)
                distance = road_distance
                if limit is None or distance is None:
                    unknown = True
                elif float(distance) <= float(limit):
                    return {'status': 'covered', 'label': 'Votre position est couverte', 'service': service.titre}
            elif zone_type == 'temps_trajet':
                limit = getattr(service, 'temps_intervention_max_minutes', None)
                if limit is None or duration is None:
                    unknown = True
                elif int(duration) <= int(limit):
                    return {'status': 'covered', 'label': 'Votre position est couverte', 'service': service.titre}

        if unknown:
            return {
                'status': 'unknown',
                'label': 'Zone à confirmer avec l’artisan',
                'service': None,
            }
        return {
            'status': 'outside',
            'label': 'Hors de la zone habituelle',
            'service': None,
        }

    @staticmethod
    def _next_available_slot(services, days=7):
        """Retourne le premier créneau réellement réservable dans la fenêtre."""
        if not services:
            return None

        today = timezone.localdate()
        for offset in range(days):
            day = today + timedelta(days=offset)
            candidates = []
            for service in services:
                slots = generate_available_slots(service, day)
                if not slots:
                    continue
                first = slots[0]
                try:
                    start = datetime.fromisoformat(first['start'])
                except (TypeError, ValueError, KeyError):
                    continue
                candidates.append((start, service, first))
            if candidates:
                candidates.sort(key=lambda item: item[0])
                start, service, slot = candidates[0]
                return {
                    'start': slot['start'],
                    'end': slot['end'],
                    'service_id': service.id,
                    'service_title': service.titre,
                    'is_today': timezone.localtime(start).date() == today if timezone.is_aware(start) else start.date() == today,
                }
        return None

    def _with_distances(self, portfolios, coordinates):
        if not coordinates:
            for portfolio in portfolios:
                portfolio.distance_km_value = None
            return portfolios

        result = []
        for portfolio in portfolios:
            if portfolio.latitude is None or portfolio.longitude is None:
                portfolio.distance_km_value = None
            else:
                try:
                    portfolio.distance_km_value = round(
                        geodesic(
                            coordinates,
                            (float(portfolio.latitude), float(portfolio.longitude)),
                        ).km,
                        2,
                    )
                except (TypeError, ValueError):
                    portfolio.distance_km_value = None
            result.append(portfolio)
        return result

    def _with_route_metrics(self, portfolios, coordinates, requested=False):
        for portfolio in portfolios:
            portfolio.route_distance_km_value = None
            portfolio.route_duration_minutes_value = None

        if not requested or not coordinates or not portfolios:
            return portfolios

        destinations = [
            {
                'id': portfolio.id,
                'coordinates': (float(portfolio.latitude), float(portfolio.longitude)),
            }
            for portfolio in portfolios
            if portfolio.latitude is not None and portfolio.longitude is not None
        ]
        metrics = driving_route_metrics(coordinates, destinations)
        for portfolio in portfolios:
            metric = metrics.get(str(portfolio.id))
            if not metric:
                continue
            portfolio.route_distance_km_value = metric.get('distance_km')
            portfolio.route_duration_minutes_value = metric.get('duration_minutes')
        return portfolios

    @staticmethod
    def _effective_distance(portfolio):
        road = getattr(portfolio, 'route_distance_km_value', None)
        return road if road is not None else getattr(portfolio, 'distance_km_value', None)

    @staticmethod
    def _rating_facets(portfolios):
        options = []
        for threshold in (4.5, 4.0, 3.0):
            count = sum(
                1 for portfolio in portfolios
                if (getattr(portfolio, 'review_count_value', 0) or 0) > 0
                and float(getattr(portfolio, 'rating_average_value', 0) or 0) >= threshold
            )
            if count:
                options.append({'value': threshold, 'label': f'{str(threshold).replace(".", ",")} et +', 'count': count})
        return options

    def list(self, request, *args, **kwargs):
        search = str(request.query_params.get('search', '')).strip()
        selected_category = str(request.query_params.get('category', '')).strip()
        scope = str(request.query_params.get('scope', 'all')).strip().lower()
        min_rating = self._minimum_rating()
        verified_only = self._bool_param('verified')
        home_service_only = self._bool_param('home_service')
        covered_only = self._bool_param('covered')
        availability_filter = self._availability_filter()
        travel_time_minutes = self._travel_time_minutes()
        route_metrics_requested = self._bool_param('route_metrics') or travel_time_minutes is not None or covered_only

        if scope not in {'all', 'nearby'}:
            raise ValidationError({'scope': 'Mode de recherche invalide.'})

        queryset = self._apply_search(self._base_queryset(), search)
        portfolios = list(queryset.order_by('artisan__username'))
        coordinates = self._coordinates()
        radius = self._radius() if scope == 'nearby' and travel_time_minutes is None else None

        if covered_only and coordinates is None:
            raise ValidationError({'localisation': 'Votre position est requise pour vérifier la zone d’intervention.'})

        portfolios = self._with_distances(portfolios, coordinates)

        if scope == 'nearby' and coordinates is None:
            raise ValidationError({'localisation': 'Votre position est requise pour une recherche autour de vous.'})

        if travel_time_minutes is not None and scope != 'nearby':
            raise ValidationError({'travel_time_minutes': 'La recherche par temps nécessite le mode « Autour de moi ».'})
        if travel_time_minutes is not None and not routing_configured():
            return Response(
                {'detail': "La recherche par temps de trajet n'est pas configurée sur le serveur."},
                status=503,
            )

        # Pour le mode distance, un trajet routier ne peut pas être plus court
        # que la distance à vol d'oiseau. Ce préfiltre réduit les destinations
        # envoyées à ORS. En mode temps, on laisse la Matrix décider.
        if scope == 'nearby' and radius is not None:
            portfolios = [
                portfolio for portfolio in portfolios
                if portfolio.distance_km_value is not None and portfolio.distance_km_value <= radius
            ]

        portfolios = self._with_route_metrics(
            portfolios,
            coordinates,
            requested=route_metrics_requested,
        )

        artisan_ids = [portfolio.artisan_id for portfolio in portfolios]
        rating_rows = (
            Review.objects.filter(service__artisan_id__in=artisan_ids)
            .values('service__artisan_id')
            .annotate(average=Avg('note'), count=Count('id'))
        )
        rating_map = {row['service__artisan_id']: row for row in rating_rows}
        for portfolio in portfolios:
            stats = rating_map.get(portfolio.artisan_id, {})
            portfolio.rating_average_value = stats.get('average')
            portfolio.review_count_value = stats.get('count', 0)

        # Le mode distance utilise la distance routière quand elle existe.
        # Le mode temps exige une durée ORS réelle : aucun fallback à vol
        # d'oiseau ne peut prétendre représenter 15/30/45/60 minutes de trajet.
        if scope == 'nearby' and travel_time_minutes is not None:
            portfolios = [
                portfolio for portfolio in portfolios
                if getattr(portfolio, 'route_duration_minutes_value', None) is not None
                and getattr(portfolio, 'route_duration_minutes_value') <= travel_time_minutes
            ]
        elif scope == 'nearby' and radius is not None:
            portfolios = [
                portfolio for portfolio in portfolios
                if self._effective_distance(portfolio) is not None
                and self._effective_distance(portfolio) <= radius
            ]

        # Les catégories sont calculées avant leur propre filtre pour conserver
        # toutes les options réellement disponibles dans la zone/recherche.
        category_counts = {}
        for portfolio in portfolios:
            for category in self._service_categories(portfolio):
                category_counts[category] = category_counts.get(category, 0) + 1

        label_map = dict(Service.CATEGORIES_CHOICES)
        available_categories = [
            {'value': value, 'label': label_map.get(value, value), 'count': count}
            for value, count in category_counts.items() if count > 0
        ]
        available_categories.sort(key=lambda item: item['label'])

        if selected_category:
            if selected_category not in category_counts:
                portfolios = []
            else:
                portfolios = [
                    portfolio for portfolio in portfolios
                    if selected_category in self._service_categories(portfolio)
                ]

        # Métadonnées avancées calculées sur les services pertinents pour la
        # catégorie/métier actuellement recherché.
        for portfolio in portfolios:
            eligible_services = self._eligible_services(portfolio, selected_category, search)
            portfolio.supports_home_service_value = self._supports_home_service(eligible_services)
            portfolio.intervention_modes_value = self._intervention_modes(eligible_services)

            # Si le client combine « Chez le client » et « Disponible », le
            # créneau doit appartenir à une prestation réellement réalisable à
            # domicile, pas à une autre prestation uniquement disponible en atelier.
            availability_services = eligible_services
            if home_service_only:
                availability_services = [
                    service for service in eligible_services
                    if service.mode_intervention in {'chez_client', 'les_deux'}
                ]

            next_slot = self._next_available_slot(availability_services, days=7)
            portfolio.next_available_at_value = next_slot['start'] if next_slot else None
            portfolio.next_available_service_value = next_slot['service_title'] if next_slot else None
            portfolio.available_today_value = bool(next_slot and next_slot['is_today'])
            portfolio.available_7d_value = bool(next_slot)

            coverage = self._client_coverage(portfolio, eligible_services, coordinates)
            portfolio.client_coverage_status_value = coverage['status']
            portfolio.client_coverage_label_value = coverage['label']
            portfolio.client_coverage_service_value = coverage['service']

        # Facettes avant application des filtres avancés : elles représentent
        # les possibilités réellement disponibles pour la recherche courante.
        available_filters = {
            'verified': sum(1 for p in portfolios if p.artisan.verification_status == 'verified'),
            'home_service': sum(1 for p in portfolios if getattr(p, 'supports_home_service_value', False)),
            'covered': sum(1 for p in portfolios if getattr(p, 'client_coverage_status_value', None) == 'covered'),
            'availability_today': sum(1 for p in portfolios if getattr(p, 'available_today_value', False)),
            'availability_7d': sum(1 for p in portfolios if getattr(p, 'available_7d_value', False)),
            'rating_options': self._rating_facets(portfolios),
        }

        if verified_only:
            portfolios = [p for p in portfolios if p.artisan.verification_status == 'verified']
        if home_service_only:
            portfolios = [p for p in portfolios if getattr(p, 'supports_home_service_value', False)]
        if covered_only:
            portfolios = [p for p in portfolios if getattr(p, 'client_coverage_status_value', None) == 'covered']
        if min_rating is not None:
            portfolios = [
                p for p in portfolios
                if (getattr(p, 'review_count_value', 0) or 0) > 0
                and float(getattr(p, 'rating_average_value', 0) or 0) >= min_rating
            ]
        if availability_filter == 'today':
            portfolios = [p for p in portfolios if getattr(p, 'available_today_value', False)]
        elif availability_filter == '7d':
            portfolios = [p for p in portfolios if getattr(p, 'available_7d_value', False)]

        if coordinates:
            portfolios.sort(
                key=lambda portfolio: (
                    self._effective_distance(portfolio) is None,
                    self._effective_distance(portfolio) if self._effective_distance(portfolio) is not None else float('inf'),
                    portfolio.artisan.username.lower(),
                )
            )

        serializer = self.get_serializer(portfolios, many=True)
        return Response({
            'results': serializer.data,
            'available_categories': available_categories,
            'available_filters': available_filters,
            'total': len(portfolios),
            'scope': scope,
            'search_mode': 'time' if travel_time_minutes is not None else ('distance' if scope == 'nearby' else 'all'),
            'radius_km': radius,
            'travel_time_minutes': travel_time_minutes,
            'routing': {
                'requested': route_metrics_requested,
                'configured': routing_configured(),
                'provider': 'openrouteservice',
                'profile': 'driving-car',
            },
        })


class TravelTimeIsochroneView(APIView):
    """Retourne la zone réellement accessible en X minutes depuis le client."""

    permission_classes = [IsClient]
    ALLOWED_MINUTES = {15, 30, 45, 60}

    @staticmethod
    def _coordinate(value, name, minimum, maximum):
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValidationError({name: 'Coordonnée invalide.'})
        if number < minimum or number > maximum:
            raise ValidationError({name: 'Coordonnée hors limites.'})
        return number

    def post(self, request):
        origin_lat = self._coordinate(request.data.get('lat'), 'lat', -90, 90)
        origin_lng = self._coordinate(request.data.get('lng'), 'lng', -180, 180)
        try:
            minutes = int(request.data.get('minutes'))
        except (TypeError, ValueError):
            raise ValidationError({'minutes': 'Temps de trajet invalide.'})
        if minutes not in self.ALLOWED_MINUTES:
            raise ValidationError({'minutes': 'Choisissez 15, 30, 45 ou 60 minutes.'})
        if not routing_configured():
            return Response({'detail': "Les isochrones ne sont pas configurées sur le serveur."}, status=503)

        zone = driving_isochrone((origin_lat, origin_lng), minutes)
        if not zone:
            return Response({'detail': "La zone de trajet est temporairement indisponible."}, status=503)

        return Response({
            'origin': {'latitude': origin_lat, 'longitude': origin_lng},
            **zone,
        })


class RouteToArtisanView(APIView):
    """Calcule un itinéraire routier client → artisan sans exposer la clé ORS."""

    permission_classes = [IsClient]

    @staticmethod
    def _coordinate(value, name, minimum, maximum):
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValidationError({name: 'Coordonnée invalide.'})
        if number < minimum or number > maximum:
            raise ValidationError({name: 'Coordonnée hors limites.'})
        return number

    def post(self, request):
        artisan_id = request.data.get('artisan_id')
        if not artisan_id:
            raise ValidationError({'artisan_id': 'Artisan requis.'})

        origin_lat = self._coordinate(request.data.get('lat'), 'lat', -90, 90)
        origin_lng = self._coordinate(request.data.get('lng'), 'lng', -180, 180)

        portfolio = (
            Portfolio.objects.filter(
                id=artisan_id,
                visible=True,
                artisan__is_active=True,
            )
            .select_related('artisan')
            .first()
        )
        if not portfolio:
            return Response({'detail': 'Artisan introuvable.'}, status=404)
        if portfolio.latitude is None or portfolio.longitude is None:
            raise ValidationError({'artisan_id': "Cet artisan n'a pas de position GPS exploitable."})
        if not routing_configured():
            return Response(
                {'detail': "Le calcul d'itinéraire n'est pas configuré."},
                status=503,
            )

        route = driving_route_geometry(
            (origin_lat, origin_lng),
            (float(portfolio.latitude), float(portfolio.longitude)),
        )
        if not route:
            return Response(
                {'detail': "L'itinéraire est temporairement indisponible."},
                status=503,
            )

        return Response({
            'artisan_id': portfolio.id,
            'artisan_nom': portfolio.artisan.username,
            'origin': {'latitude': origin_lat, 'longitude': origin_lng},
            'destination': {
                'latitude': float(portfolio.latitude),
                'longitude': float(portfolio.longitude),
            },
            **route,
        })


class RealisationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Realisation.objects.all()
    serializer_class = RealisationSerializer
    permission_classes = [IsArtisan]

    def perform_update(self, serializer):
        realisation = self.get_object()
        if realisation.portfolio.artisan != self.request.user:
            raise PermissionDenied("Vous n'êtes pas autorisé à modifier cette réalisation.")
        serializer.save(portfolio=realisation.portfolio)

    def perform_destroy(self, instance):
        if instance.portfolio.artisan != self.request.user:
            raise PermissionDenied("Vous n'êtes pas autorisé à supprimer cette réalisation.")
        instance.delete()
