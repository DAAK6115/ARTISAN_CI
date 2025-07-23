from django.urls import path
from .views import CreateReviewView, PublicArtisanReviewsView, ServiceReviewsView, ArtisanReviewsView, ClientReviewsView, ArtisanClientFeedbackView

urlpatterns = [
    path('create/', CreateReviewView.as_view(), name='create-review'),
    path('service/<int:service_id>/', ServiceReviewsView.as_view(), name='service-reviews'),
    path('artisan/', ArtisanReviewsView.as_view(), name='artisan-reviews'),
    path('mes/', ClientReviewsView.as_view(), name='client-reviews'),
    path('artisan/clients/', ArtisanClientFeedbackView.as_view(), name='artisan-client-feedback'),
    path('artisan/<str:username>/', PublicArtisanReviewsView.as_view(), name='public-artisan-reviews'),
    path('artisan/<str:username>/', PublicArtisanReviewsView.as_view(), name='public-artisan-reviews'),
]
