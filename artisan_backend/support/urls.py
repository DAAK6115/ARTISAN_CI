from django.urls import path
from .views import (
    AdminReclamationUpdateView, AdminReclamationsView, EnvoyerReclamationView,
    MesReclamationsView,
)

urlpatterns = [
    path("envoyer/", EnvoyerReclamationView.as_view(), name="envoyer-reclamation"),
    path("mes/", MesReclamationsView.as_view(), name="mes-reclamations"),
    path("admin/", AdminReclamationsView.as_view(), name="admin-reclamations"),
    path("admin/<int:pk>/", AdminReclamationUpdateView.as_view(), name="admin-reclamation-update"),
]
