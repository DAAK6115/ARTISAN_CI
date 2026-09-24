from rest_framework import serializers

from common.validators import validate_image_upload
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    moyenne_avis = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    artisan_username = serializers.CharField(source='artisan.username', read_only=True)
    mode_tarification_label = serializers.CharField(
        source='get_mode_tarification_display',
        read_only=True,
    )
    mode_intervention_label = serializers.CharField(
        source='get_mode_intervention_display',
        read_only=True,
    )

    class Meta:
        model = Service
        fields = [
            'id',
            'artisan',
            'artisan_username',
            'titre',
            'description',
            'prix',
            'categorie',
            'image',
            'is_active',
            'mode_tarification',
            'mode_tarification_label',
            'duree_minutes',
            'delai_reservation_heures',
            'mode_intervention',
            'mode_intervention_label',
            'rayon_intervention_km',
            'date_creation',
            'moyenne_avis',
            'is_liked',
        ]
        read_only_fields = [
            'artisan',
            'date_creation',
            'moyenne_avis',
            'is_active',
            'is_liked',
            'mode_tarification_label',
            'mode_intervention_label',
        ]
    def validate_image(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=5)

    def validate_prix(self, value):
        if value < 0:
            raise serializers.ValidationError('Le prix ne peut pas être négatif.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        mode = attrs.get('mode_tarification', getattr(self.instance, 'mode_tarification', 'fixe'))
        prix = attrs.get('prix', getattr(self.instance, 'prix', None))
        if mode != 'sur_devis' and (prix is None or prix <= 0):
            raise serializers.ValidationError({'prix': 'Le prix doit être supérieur à zéro.'})
        return attrs

    def validate_titre(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le titre est requis.')
        return value

    def get_moyenne_avis(self, obj):
        notes = obj.avis.all().values_list('note', flat=True)
        return round(sum(notes) / len(notes), 1) if notes else None

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.likes.filter(client=request.user).exists()
        return False
