from rest_framework import serializers
from .models import Reclamation


class ReclamationSerializer(serializers.ModelSerializer):
    requester_username = serializers.CharField(source="client.username", read_only=True)
    requester_role = serializers.CharField(source="client.role", read_only=True)
    assigned_to_username = serializers.CharField(
        source="assigned_to.username", read_only=True, allow_null=True
    )
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    priorite_label = serializers.CharField(source="get_priorite_display", read_only=True)

    class Meta:
        model = Reclamation
        fields = [
            "id", "client", "requester_username", "requester_role", "objet",
            "message", "statut", "statut_label", "priorite", "priorite_label",
            "admin_response", "assigned_to", "assigned_to_username",
            "date_envoi", "updated_at", "closed_at",
        ]
        read_only_fields = [
            "client", "requester_username", "requester_role", "statut", "statut_label",
            "priorite", "priorite_label", "admin_response", "assigned_to",
            "assigned_to_username", "date_envoi",
            "updated_at", "closed_at",
        ]

    def validate_objet(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("L’objet doit contenir au moins 3 caractères.")
        return value

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Décrivez votre demande en au moins 10 caractères.")
        return value
