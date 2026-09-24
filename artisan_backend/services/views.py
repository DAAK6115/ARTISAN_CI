import logging
import os
from decimal import Decimal, InvalidOperation

import requests
from django.db.models import Avg, BooleanField, Exists, OuterRef, Value
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from favoris.models import Favorite
from likes.models import Like
from .models import Service
from .serializers import ServiceSerializer

logger = logging.getLogger(__name__)
HUGGINGFACE_API_TOKEN = os.getenv('HUGGINGFACE_API_TOKEN', '')


def service_queryset_for(request):
    queryset = Service.objects.select_related('artisan').annotate(
        moyenne_avis_calc=Avg('avis__note'),
    )
    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        queryset = queryset.annotate(
            is_liked_calc=Exists(Like.objects.filter(client=user, service=OuterRef('pk'))),
            is_favori_calc=Exists(Favorite.objects.filter(client=user, service=OuterRef('pk'))),
        )
    else:
        queryset = queryset.annotate(
            is_liked_calc=Value(False, output_field=BooleanField()),
            is_favori_calc=Value(False, output_field=BooleanField()),
        )
    return queryset


def parse_money_param(request, name):
    raw = request.query_params.get(name)
    if raw in (None, ''):
        return None
    try:
        value = Decimal(raw)
    except (InvalidOperation, TypeError):
        raise ValidationError({name: 'Montant invalide.'})
    if value < 0:
        raise ValidationError({name: 'Le montant ne peut pas être négatif.'})
    return value


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'categorie', 'description', 'artisan__username']

    def get_queryset(self):
        queryset = service_queryset_for(self.request).filter(
            is_active=True,
            artisan__is_active=True,
        )
        params = self.request.query_params

        artisan = str(params.get('artisan', '')).strip()
        categorie = str(params.get('categorie', '')).strip()
        mode_tarification = str(params.get('mode_tarification', '')).strip()
        mode_intervention = str(params.get('mode_intervention', '')).strip()
        min_prix = parse_money_param(self.request, 'min_prix')
        max_prix = parse_money_param(self.request, 'max_prix')

        if artisan:
            queryset = queryset.filter(artisan__username=artisan)
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        if mode_tarification:
            queryset = queryset.filter(mode_tarification=mode_tarification)
        if mode_intervention:
            queryset = queryset.filter(mode_intervention=mode_intervention)
        if min_prix is not None:
            queryset = queryset.filter(prix__gte=min_prix)
        if max_prix is not None:
            queryset = queryset.filter(prix__lte=max_prix)
        if min_prix is not None and max_prix is not None and min_prix > max_prix:
            raise ValidationError({'prix': 'Le prix minimum ne peut pas dépasser le prix maximum.'})

        return queryset.order_by('-date_creation')

    def perform_create(self, serializer):
        if self.request.user.role != 'artisan':
            raise PermissionDenied('Seuls les artisans peuvent créer des prestations.')
        serializer.save(artisan=self.request.user)


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = service_queryset_for(self.request)
        if self.request.method in permissions.SAFE_METHODS:
            return queryset.filter(is_active=True, artisan__is_active=True)
        return queryset

    def perform_update(self, serializer):
        if self.request.user != serializer.instance.artisan:
            raise PermissionDenied('Vous ne pouvez modifier que vos propres prestations.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user != instance.artisan:
            raise PermissionDenied('Vous ne pouvez supprimer que vos propres prestations.')
        instance.delete()


class MyServicesView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return service_queryset_for(self.request).filter(artisan=self.request.user).order_by('-date_creation')


class GenerateDescriptionAI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'artisan':
            raise PermissionDenied('Accès réservé aux artisans.')

        titre = str(request.data.get('titre', '')).strip()
        if not titre:
            return Response({'error': 'Titre requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(titre) > 100:
            return Response({'error': 'Le titre est trop long.'}, status=status.HTTP_400_BAD_REQUEST)
        if not HUGGINGFACE_API_TOKEN:
            logger.error('HUGGINGFACE_API_TOKEN absent.')
            return Response({'error': 'Service de génération temporairement indisponible.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        prompt = f"Génère une description claire et professionnelle pour une prestation intitulée : '{titre}'"
        try:
            response = requests.post(
                'https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct',
                headers={'Authorization': f'Bearer {HUGGINGFACE_API_TOKEN}'},
                json={'inputs': prompt},
                timeout=20,
            )
            response.raise_for_status()
            result = response.json()
            if isinstance(result, list) and result and 'generated_text' in result[0]:
                return Response({'description': result[0]['generated_text'].strip()}, status=status.HTTP_200_OK)
            logger.warning('Réponse Hugging Face au format inattendu.')
            return Response({'error': 'Service de génération temporairement indisponible.'}, status=status.HTTP_502_BAD_GATEWAY)
        except (requests.RequestException, ValueError, KeyError):
            logger.exception('Échec de génération de description via Hugging Face.')
            return Response({'error': 'Service de génération temporairement indisponible.'}, status=status.HTTP_502_BAD_GATEWAY)
