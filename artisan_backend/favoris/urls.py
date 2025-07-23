from django.urls import path
from .views import ToggleFavoriteView, MyFavoritesView

urlpatterns = [
    path('toggle/<int:service_id>/', ToggleFavoriteView.as_view(), name='toggle-favorite'),
    path('mes/', MyFavoritesView.as_view(), name='mes-favoris'),
]
