from rest_framework import generics, permissions, serializers

from accounts.permissions import IsClient
from appointments.models import Appointment
from .models import Review
from .serializers import AppointmentReviewSerializer, ReviewDetailSerializer, ReviewSimpleSerializer


class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewDetailSerializer
    permission_classes = [IsClient]

    def perform_create(self, serializer):
        user = self.request.user
        data = serializer.validated_data
        rendez_vous = data.get('rendez_vous')
        service = data.get('service')

        if rendez_vous:
            if rendez_vous.client != user:
                raise serializers.ValidationError('Ce rendez-vous ne vous appartient pas.')
            if rendez_vous.statut not in {'termine', 'cloture', 'effectue'}:
                raise serializers.ValidationError('Vous ne pouvez noter qu’une prestation terminée.')
            if Review.objects.filter(client=user, rendez_vous=rendez_vous).exists():
                raise serializers.ValidationError('Vous avez déjà noté ce rendez-vous.')

        if service:
            if not service.artisan:
                raise serializers.ValidationError('Le service doit être associé à un artisan.')
            if Review.objects.filter(client=user, service=service, rendez_vous__isnull=True).exists():
                raise serializers.ValidationError('Vous avez déjà noté cette prestation.')

        serializer.save(client=user)


class ServiceReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(service_id=self.kwargs.get('service_id')).order_by('-date_creation')


class ArtisanReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(service__artisan=self.request.user).order_by('-date_creation')


class ClientReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(client=self.request.user).order_by('-date_creation')


class ArtisanClientFeedbackView(generics.ListAPIView):
    serializer_class = AppointmentReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(service__artisan=self.request.user, note_client__isnull=False).order_by('-date_rdv')


class PublicArtisanReviewsView(generics.ListAPIView):
    serializer_class = ReviewSimpleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(service__artisan__username=self.kwargs.get('username')).order_by('-date_creation')
