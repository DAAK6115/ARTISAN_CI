from rest_framework import serializers

from common.validators import validate_image_upload
from .models import Portfolio, Realisation


class RealisationSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Realisation
        fields = ["id", "portfolio", "titre", "image", "description", "date"]
        read_only_fields = ["portfolio", "date"]

    def validate_image(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=5)


class PortfolioSerializer(serializers.ModelSerializer):
    realisations = RealisationSerializer(many=True, read_only=True)
    artisan_nom = serializers.ReadOnlyField(source="artisan.username")

    class Meta:
        model = Portfolio
        fields = "__all__"
        read_only_fields = ["artisan"]

    def validate_photo_couverture(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=5)

    def validate_whatsapp(self, value):
        if value in (None, ""):
            return value
        cleaned = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(cleaned.replace("+", "")) < 8 or len(cleaned.replace("+", "")) > 15:
            raise serializers.ValidationError("Numéro WhatsApp invalide.")
        return cleaned
