from rest_framework import generics, permissions
from .models import Reclamation
from .serializers import ReclamationSerializer

class EnvoyerReclamationView(generics.CreateAPIView):
    serializer_class = ReclamationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)