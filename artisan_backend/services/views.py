from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Service
from .serializers import ServiceSerializer
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticatedOrReadOnly
import os
import requests
from dotenv import load_dotenv

# ✅ Charger .env
load_dotenv()

# ✅ Récupérer le token Hugging Face
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

# ✅ LIST + CREATE (avec restriction au rôle artisan)

class ServiceListCreateView(generics.ListCreateAPIView):
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'categorie', 'description']

    def perform_create(self, serializer):
        if self.request.user.role != "artisan":
            raise PermissionDenied("Seuls les artisans peuvent créer des prestations.")
        serializer.save(artisan=self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}



# ✅ DÉTAIL / MISE À JOUR / SUPPRESSION
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


# ✅ LISTE DES PRESTATIONS DE L’ARTISAN CONNECTÉ
class MyServicesView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Service.objects.filter(artisan=self.request.user)


# ✅ IA – GÉNÉRATION AUTOMATIQUE DE DESCRIPTION (Hugging Face)
class GenerateDescriptionAI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        titre = request.data.get("titre", "").strip()
        if not titre:
            return Response({"error": "Titre requis"}, status=status.HTTP_400_BAD_REQUEST)

        prompt = f"Génère une description claire et professionnelle pour une prestation intitulée : '{titre}'"

        print("🎯 Envoi à Hugging Face pour :", titre)

        try:
            response = requests.post(
                "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
                headers={"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"},
                json={"inputs": prompt}
            )

            if response.status_code != 200:
                return Response({"error": f"Hugging Face API error: {response.text}"}, status=500)

            result = response.json()
            if isinstance(result, list) and 'generated_text' in result[0]:
                description = result[0]['generated_text'].strip()
                return Response({"description": description}, status=200)

            return Response({"error": "Résultat inattendu de Hugging Face"}, status=500)

        except Exception as e:
            print("❌ Erreur Hugging Face :", str(e))
            return Response({"error": f"Erreur lors de la génération : {str(e)}"}, status=500)
