from django.urls import path
from .views import ToggleLikeView

urlpatterns = [
    path('toggle/<int:service_id>/', ToggleLikeView.as_view(), name='toggle-like'),
]
