from rest_framework import serializers

from common.validators import validate_document_upload
from .models import Certification


class CertificationSerializer(serializers.ModelSerializer):
    artisan_username = serializers.CharField(source="artisan.username", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = Certification
        fields = [
            "id", "artisan", "artisan_username", "nom", "organisme", "fichier",
            "valide_jusquau", "status", "status_label", "reviewed_by",
            "reviewed_by_username", "reviewed_at", "review_note", "date_ajout",
        ]
        read_only_fields = [
            "artisan", "artisan_username", "date_ajout", "status", "status_label",
            "reviewed_by", "reviewed_by_username", "reviewed_at", "review_note",
        ]

    def validate_fichier(self, value):
        return validate_document_upload(value, max_mb=5)

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role != "artisan":
            raise serializers.ValidationError(
                "Seuls les artisans peuvent gérer leurs certifications."
            )
        return attrs
