import logging
import os

import requests
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Service
from .serializers import ServiceSerializer

logger = logging.getLogger(__name__)

HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "")


class ServiceListCreateView(generics.ListCreateAPIView):
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["titre", "categorie", "description"]

    def perform_create(self, serializer):
        if self.request.user.role != "artisan":
            raise PermissionDenied("Seuls les artisans peuvent créer des prestations.")
        serializer.save(artisan=self.request.user)

    def get_serializer_context(self):
        return {"request": self.request}


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        if self.request.user != serializer.instance.artisan:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres prestations.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user != instance.artisan:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres prestations.")
        instance.delete()


class MyServicesView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Service.objects.filter(artisan=self.request.user)


class GenerateDescriptionAI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "artisan":
            raise PermissionDenied("Accès réservé aux artisans.")

        titre = str(request.data.get("titre", "")).strip()
        if not titre:
            return Response(
                {"error": "Titre requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(titre) > 100:
            return Response(
                {"error": "Le titre est trop long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not HUGGINGFACE_API_TOKEN:
            logger.error("HUGGINGFACE_API_TOKEN absent.")
            return Response(
                {"error": "Service de génération temporairement indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        prompt = (
            "Génère une description claire et professionnelle pour une prestation "
            f"intitulée : '{titre}'"
        )

        try:
            response = requests.post(
                "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
                headers={"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"},
                json={"inputs": prompt},
                timeout=20,
            )
            response.raise_for_status()
            result = response.json()

            if isinstance(result, list) and result and "generated_text" in result[0]:
                return Response(
                    {"description": result[0]["generated_text"].strip()},
                    status=status.HTTP_200_OK,
                )

            logger.warning("Réponse Hugging Face au format inattendu.")
            return Response(
                {"error": "Service de génération temporairement indisponible."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except (requests.RequestException, ValueError, KeyError):
            logger.exception("Échec de génération de description via Hugging Face.")
            return Response(
                {"error": "Service de génération temporairement indisponible."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
