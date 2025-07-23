from rest_framework import generics, permissions
from .models import Favorite
from .serializers import FavoriteSerializer
from rest_framework.response import Response
from rest_framework.views import APIView

class ToggleFavoriteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        user = request.user
        favorite, created = Favorite.objects.get_or_create(client=user, service_id=service_id)
        if not created:
            favorite.delete()
            return Response({"message": "Service retiré des favoris ❌"})
        return Response({"message": "Service ajouté aux favoris ✅"})

class MyFavoritesView(generics.ListAPIView):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(client=self.request.user)
