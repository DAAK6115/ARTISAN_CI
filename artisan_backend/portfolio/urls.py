from django.urls import path
from .views import (
    MyPortfolioView,
    PublicPortfolioView,
    AddRealisationView,
    PortfolioMapView,
    RealisationDetailView,
    RouteToArtisanView,
    TravelTimeIsochroneView,
    AddressSearchView,
    ReverseAddressView,
    ApproximateLocationView,
)

urlpatterns = [
    path('me/', MyPortfolioView.as_view(), name='my-portfolio'),
    path('artisans/<str:artisan__username>/', PublicPortfolioView.as_view(), name='public-portfolio'),
    path('realisation/add/', AddRealisationView.as_view(), name='add-realisation'),
    path('realisation/<int:pk>/', RealisationDetailView.as_view(), name='edit-realisation'),
    path('map/', PortfolioMapView.as_view(), name='portfolio-map'),
    path('geocoding/search/', AddressSearchView.as_view(), name='address-search'),
    path('geocoding/reverse/', ReverseAddressView.as_view(), name='address-reverse'),
    path('location/approximate/', ApproximateLocationView.as_view(), name='approximate-location'),
    path('route-to-artisan/', RouteToArtisanView.as_view(), name='route-to-artisan'),
    path('isochrone/', TravelTimeIsochroneView.as_view(), name='travel-time-isochrone'),
]
