from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Like
from services.models import Service

class ToggleLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({"error": "Service introuvable"}, status=404)

        like, created = Like.objects.get_or_create(client=request.user, service=service)

        if not created:
            like.delete()
            return Response({"message": "Like retiré"}, status=200)

        return Response({"message": "Like ajouté"}, status=201)
