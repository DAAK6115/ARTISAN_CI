from rest_framework import serializers

from common.validators import validate_document_upload
from .models import Certification


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = "__all__"
        read_only_fields = ["artisan", "date_ajout"]

    def validate_fichier(self, value):
        return validate_document_upload(value, max_mb=5)

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role != "artisan":
            raise serializers.ValidationError(
                "Seuls les artisans peuvent gérer des certifications."
            )
        return attrs
