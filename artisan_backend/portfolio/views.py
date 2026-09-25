import logging
import unicodedata

from django.db.models import Prefetch, Q
from geopy.distance import geodesic
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.permissions import IsArtisan
from services.models import Service
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
    """Découverte géolocalisée des artisans.

    `scope=nearby` + lat/lng limite les résultats au rayon demandé.
    `scope=all` ignore le rayon et permet une recherche élargie par texte.

    La réponse contient également les catégories réellement disponibles dans
    le résultat géographique/texte courant. Une catégorie sans artisan actif
    n'est donc jamais proposée dans l'interface de filtre.
    """

    serializer_class = PortfolioSerializer
    permission_classes = [permissions.AllowAny]

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

    @staticmethod
    def _service_categories(portfolio):
        services = getattr(portfolio.artisan, 'active_services_for_discovery', [])
        return {service.categorie for service in services if service.categorie}

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

    def list(self, request, *args, **kwargs):
        search = str(request.query_params.get('search', '')).strip()
        selected_category = str(request.query_params.get('category', '')).strip()
        scope = str(request.query_params.get('scope', 'all')).strip().lower()
        if scope not in {'all', 'nearby'}:
            raise ValidationError({'scope': 'Mode de recherche invalide.'})

        queryset = self._apply_search(self._base_queryset(), search)
        portfolios = list(queryset.order_by('artisan__username'))
        coordinates = self._coordinates()
        radius = self._radius() if scope == 'nearby' else None

        portfolios = self._with_distances(portfolios, coordinates)

        if scope == 'nearby':
            if coordinates is None:
                raise ValidationError({'localisation': 'Votre position est requise pour une recherche autour de vous.'})
            portfolios = [
                portfolio
                for portfolio in portfolios
                if portfolio.distance_km_value is not None and portfolio.distance_km_value <= radius
            ]

        # Les catégories sont calculées AVANT le filtre de catégorie : ainsi le
        # menu continue à proposer toutes les catégories réellement présentes
        # dans la zone/recherche courante.
        category_counts = {}
        for portfolio in portfolios:
            for category in self._service_categories(portfolio):
                category_counts[category] = category_counts.get(category, 0) + 1

        label_map = dict(Service.CATEGORIES_CHOICES)
        available_categories = [
            {'value': value, 'label': label_map.get(value, value), 'count': count}
            for value, count in category_counts.items()
            if count > 0
        ]
        available_categories.sort(key=lambda item: item['label'])

        if selected_category:
            if selected_category not in category_counts:
                portfolios = []
            else:
                portfolios = [
                    portfolio
                    for portfolio in portfolios
                    if selected_category in self._service_categories(portfolio)
                ]

        if coordinates:
            portfolios.sort(
                key=lambda portfolio: (
                    portfolio.distance_km_value is None,
                    portfolio.distance_km_value if portfolio.distance_km_value is not None else float('inf'),
                    portfolio.artisan.username.lower(),
                )
            )

        serializer = self.get_serializer(portfolios, many=True)
        return Response({
            'results': serializer.data,
            'available_categories': available_categories,
            'total': len(portfolios),
            'scope': scope,
            'radius_km': radius,
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
