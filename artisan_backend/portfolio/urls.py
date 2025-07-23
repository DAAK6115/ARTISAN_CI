from django.urls import path
from .views import MyPortfolioView, PublicPortfolioView, AddRealisationView, PortfolioMapView, RealisationDetailView

urlpatterns = [
    path('me/', MyPortfolioView.as_view(), name='my-portfolio'),
    path('artisans/<str:artisan__username>/', PublicPortfolioView.as_view(), name='public-portfolio'),
    path('realisation/add/', AddRealisationView.as_view(), name='add-realisation'),
    path('realisation/<int:pk>/', RealisationDetailView.as_view(), name='edit-realisation'),
    path('map/', PortfolioMapView.as_view(), name='portfolio-map'),
]