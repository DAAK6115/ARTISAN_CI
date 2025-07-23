from django.urls import path
from .views import EnvoyerReclamationView

urlpatterns = [
    path('envoyer/', EnvoyerReclamationView.as_view(), name='envoyer-reclamation'),
]