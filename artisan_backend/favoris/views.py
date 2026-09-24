from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from services.models import Service
from .models import Favorite
from .serializers import FavoriteSerializer


class ToggleFavoriteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        if request.user.role != 'client':
            return Response({'detail': 'Accès réservé aux clients.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            service = Service.objects.get(pk=service_id, is_active=True, artisan__is_active=True)
        except Service.DoesNotExist:
            return Response({'detail': 'Prestation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        favorite, created = Favorite.objects.get_or_create(client=request.user, service=service)
        if not created:
            favorite.delete()
            return Response({'is_favorite': False}, status=status.HTTP_200_OK)
        return Response({'is_favorite': True}, status=status.HTTP_201_CREATED)


class MyFavoritesView(generics.ListAPIView):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(
            client=self.request.user,
            service__is_active=True,
            service__artisan__is_active=True,
        ).select_related('service', 'service__artisan').order_by('-date_added')
