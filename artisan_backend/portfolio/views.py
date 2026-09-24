import logging

from django.db.models import Q
from geopy.distance import geodesic
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.permissions import IsArtisan
from .models import Portfolio, Realisation
from .serializers import PortfolioSerializer, RealisationSerializer

logger = logging.getLogger(__name__)


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
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        base_qs = Portfolio.objects.filter(
            visible=True,
            artisan__is_active=True,
        ).select_related('artisan').prefetch_related('realisations')

        search = str(self.request.query_params.get('search', '')).strip()
        if search:
            base_qs = base_qs.filter(
                Q(artisan__username__icontains=search)
                | Q(bio__icontains=search)
                | Q(localisation__icontains=search)
            )

        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')

        # Sans géolocalisation, on retourne tous les profils publics, même ceux
        # qui n'ont pas encore renseigné leurs coordonnées GPS.
        if lat is None or lng is None:
            return base_qs.order_by('artisan__username')

        try:
            radius = float(self.request.query_params.get('radius', 25))
        except (TypeError, ValueError):
            raise ValidationError({'radius': 'Rayon invalide.'})
        if radius <= 0 or radius > 1000:
            raise ValidationError({'radius': 'Le rayon doit être compris entre 0 et 1000 km.'})

        try:
            lat_value = float(lat)
            lng_value = float(lng)
            if not (-90 <= lat_value <= 90 and -180 <= lng_value <= 180):
                raise ValueError
        except (TypeError, ValueError):
            raise ValidationError({'localisation': 'Coordonnées invalides.'})

        geo_qs = base_qs.exclude(latitude=None).exclude(longitude=None)
        try:
            return [
                portfolio
                for portfolio in geo_qs
                if geodesic(
                    (lat_value, lng_value),
                    (float(portfolio.latitude), float(portfolio.longitude)),
                ).km <= radius
            ]
        except (TypeError, ValueError):
            logger.exception('Échec du calcul de distance des portfolios.')
            raise ValidationError({'localisation': 'Impossible de traiter ces coordonnées.'})


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
