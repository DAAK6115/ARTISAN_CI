from rest_framework import generics, permissions
from .models import Portfolio, Realisation
from .serializers import PortfolioSerializer, RealisationSerializer
from rest_framework.exceptions import PermissionDenied
from geopy.distance import geodesic

class MyPortfolioView(generics.RetrieveUpdateAPIView):
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        portfolio, created = Portfolio.objects.get_or_create(artisan=self.request.user)
        return portfolio


class PublicPortfolioView(generics.RetrieveAPIView):
    queryset = Portfolio.objects.filter(visible=True)
    serializer_class = PortfolioSerializer
    lookup_field = 'artisan__username'


class AddRealisationView(generics.CreateAPIView):
    serializer_class = RealisationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        portfolio, created = Portfolio.objects.get_or_create(artisan=self.request.user)
        serializer.save(portfolio=portfolio)

class PortfolioMapView(generics.ListAPIView):
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        base_qs = Portfolio.objects.filter(visible=True).exclude(latitude=None).exclude(longitude=None)
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = float(self.request.query_params.get('radius', 10))  # Par défaut : 10 km

        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                return [
                    portfolio for portfolio in base_qs
                    if geodesic((lat, lng), (float(portfolio.latitude), float(portfolio.longitude))).km <= radius
                ]
            except Exception as e:
                print("Erreur de calcul de distance :", e)

        return base_qs



class RealisationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Realisation.objects.all()
    serializer_class = RealisationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        realisation = self.get_object()
        if realisation.portfolio.artisan != self.request.user:
            raise PermissionDenied("Vous n'êtes pas autorisé à modifier cette réalisation.")
        
        # ✅ Forcer le portfolio pour éviter l'erreur 400
        serializer.save(portfolio=realisation.portfolio)

    def perform_destroy(self, instance):
        if instance.portfolio.artisan != self.request.user:
            raise PermissionDenied("Vous n'êtes pas autorisé à supprimer cette réalisation.")
        instance.delete()