from rest_framework import serializers
from services.models import Service
from appointments.models import Appointment
from .models import Review

# 🔹 Pour l'affichage simple dans les listes
class ReviewSimpleSerializer(serializers.ModelSerializer):
    client = serializers.CharField(source='client.username', read_only=True)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())
    service_titre = serializers.CharField(source='service.titre', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'client', 'service', 'service_titre', 'commentaire', 'note', 'date_creation']
        read_only_fields = ['client', 'date_creation']

# 🔹 Pour la création d'un avis avec rendez-vous
class ReviewDetailSerializer(serializers.ModelSerializer):
    client = serializers.CharField(source='client.username', read_only=True)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), required=False)
    rendez_vous = serializers.PrimaryKeyRelatedField(queryset=Appointment.objects.all(), required=False)
    service_titre = serializers.CharField(source='service.titre', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'client', 'service', 'service_titre', 'rendez_vous', 'commentaire', 'note', 'date_creation']
        read_only_fields = ['client', 'date_creation']


class AppointmentReviewSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.username', read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'client_nom', 'note_client', 'rating', 'date_rdv']