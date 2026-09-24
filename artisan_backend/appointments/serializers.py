from rest_framework import serializers

from services.models import Service
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True)
    )
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_titre = serializers.CharField(source="service.titre", read_only=True)
    service_prix = serializers.DecimalField(
        source="service.prix",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    artisan_nom = serializers.CharField(
        source="service.artisan.username",
        read_only=True,
    )
    client_nom = serializers.CharField(source="client.username", read_only=True)

    class Meta:
        model = Appointment
        fields = "__all__"
        # Ces champs sont modifiés exclusivement par les endpoints métier dédiés.
        # Un client ne peut pas les forger pendant la création d'un rendez-vous.
        read_only_fields = [
            "client",
            "statut",
            "resume",
            "methode_paiement",
            "note_client",
            "commentaire_client",
            "montant",
            "rating",
            "created_at",
            "updated_at",
        ]
