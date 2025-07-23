from django.urls import path
from .views import (
    ServiceListCreateView,
    ServiceDetailView,
    MyServicesView,
    GenerateDescriptionAI
)

urlpatterns = [
    path('', ServiceListCreateView.as_view(), name='service-list-create'),
    path('<int:pk>/', ServiceDetailView.as_view(), name='service-detail'),
    path('mes-prestations/', MyServicesView.as_view(), name='mes-prestations'),
    path('generer-description/', GenerateDescriptionAI.as_view(), name='generate-description-ai'),
]
