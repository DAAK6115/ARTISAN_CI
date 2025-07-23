from rest_framework import generics, permissions, serializers
from .models import Review
from .serializers import ReviewSimpleSerializer, ReviewDetailSerializer, AppointmentReviewSerializer
from appointments.models import Appointment

# 🔵 Créer un avis (avec vérification du rendez-vous effectué)
class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        user = self.request.user
        data = serializer.validated_data

        rendez_vous = data.get('rendez_vous', None)
        service = data.get('service', None)

    # Vérification si le rendez-vous est fourni
        if rendez_vous:
            if rendez_vous.client != user:
                raise serializers.ValidationError("Ce rendez-vous ne vous appartient pas.")
            if rendez_vous.statut != 'effectue':
                raise serializers.ValidationError("Vous ne pouvez noter que des prestations effectuées.")
            if Review.objects.filter(client=user, rendez_vous=rendez_vous).exists():
                raise serializers.ValidationError("Vous avez déjà noté ce rendez-vous.")

    # Vérification si le service est fourni
        if service:
            if not service.artisan:
                raise serializers.ValidationError("Le service doit être associé à un artisan.")
            if Review.objects.filter(client=user, service=service, rendez_vous__isnull=True).exists():
                raise serializers.ValidationError("Vous avez déjà noté ce service sans rendez-vous.")

    # Interdiction de créer un avis vide
        if not any([rendez_vous, service, data.get('note'), data.get('commentaire')]):
            raise serializers.ValidationError("Vous devez fournir au moins un champ à évaluer.")

        serializer.save(client=user)


# 🔵 Avis liés à un service spécifique
class ServiceReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        service_id = self.kwargs.get('service_id')
        return Review.objects.filter(service__id=service_id).order_by('-date_creation')

# 🔵 Avis reçus par un artisan sur ses prestations
class ArtisanReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(service__artisan=self.request.user).order_by('-date_creation')

# 🔵 Avis donnés par un client
class ClientReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(client=self.request.user).order_by('-date_creation')


class ArtisanClientFeedbackView(generics.ListAPIView):
    serializer_class = AppointmentReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(
            service__artisan=self.request.user,
            note_client__isnull=False
        ).order_by('-date_rdv')

class PublicArtisanReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        username = self.kwargs.get('username')
        return Review.objects.filter(service__artisan__username=username).order_by('-date_creation')

