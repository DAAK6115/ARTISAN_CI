import math
import re
from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from common.validators import validate_image_upload
from services.models import Service
from .models import Portfolio, Realisation


_COORDINATE_QUANTUM = Decimal('0.000001')
_E164_RE = re.compile(r'^\+[1-9]\d{7,14}$')


class RealisationSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Realisation
        fields = ['id', 'portfolio', 'titre', 'image', 'description', 'date']
        read_only_fields = ['portfolio', 'date']

    def validate_image(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=5)


class PortfolioSerializer(serializers.ModelSerializer):
    realisations = RealisationSerializer(many=True, read_only=True)
    artisan_nom = serializers.CharField(source='artisan.username', read_only=True)
    artisan_id = serializers.IntegerField(source='artisan.id', read_only=True)
    artisan_verified = serializers.SerializerMethodField()
    artisan_verification_status = serializers.CharField(source='artisan.verification_status', read_only=True)
    service_categories = serializers.SerializerMethodField()
    service_category_labels = serializers.SerializerMethodField()
    service_titles = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    # Le GPS du navigateur peut envoyer beaucoup plus de 6 décimales.
    # On accepte d'abord la valeur comme flottant puis on la normalise vers
    # la précision réellement stockée par le modèle (6 décimales).
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Portfolio
        fields = [
            'id', 'artisan', 'artisan_id', 'artisan_nom', 'artisan_verified',
            'artisan_verification_status', 'bio', 'photo_couverture',
            'site_web', 'facebook', 'whatsapp', 'localisation', 'latitude',
            'longitude', 'visible', 'realisations', 'service_categories',
            'service_category_labels', 'service_titles', 'distance_km',
        ]
        read_only_fields = [
            'artisan', 'artisan_id', 'artisan_nom', 'artisan_verified',
            'artisan_verification_status', 'service_categories',
            'service_category_labels', 'service_titles', 'distance_km',
        ]


    def _active_services(self, obj):
        prefetched = getattr(obj.artisan, 'active_services_for_discovery', None)
        if prefetched is not None:
            return list(prefetched)
        return list(obj.artisan.services.filter(is_active=True).order_by('titre'))

    def get_service_categories(self, obj):
        return sorted({service.categorie for service in self._active_services(obj) if service.categorie})

    def get_service_category_labels(self, obj):
        labels = {value: label for value, label in Service.CATEGORIES_CHOICES}
        return sorted({labels.get(service.categorie, service.categorie) for service in self._active_services(obj) if service.categorie})

    def get_service_titles(self, obj):
        return [service.titre for service in self._active_services(obj)]

    def get_distance_km(self, obj):
        value = getattr(obj, 'distance_km_value', None)
        return round(float(value), 2) if value is not None else None

    def get_artisan_verified(self, obj):
        return bool(obj.artisan.is_active and obj.artisan.verification_status == 'verified')

    def validate_photo_couverture(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=5)

    @staticmethod
    def _normalize_coordinate(value, minimum, maximum, label):
        if value is None:
            return None
        numeric = float(value)
        if not math.isfinite(numeric) or not minimum <= numeric <= maximum:
            raise serializers.ValidationError(f'{label} GPS invalide.')
        return Decimal(str(numeric)).quantize(_COORDINATE_QUANTUM, rounding=ROUND_HALF_UP)

    def validate_latitude(self, value):
        return self._normalize_coordinate(value, -90, 90, 'Latitude')

    def validate_longitude(self, value):
        return self._normalize_coordinate(value, -180, 180, 'Longitude')

    def validate_whatsapp(self, value):
        """Normalise un numéro international vers une forme E.164.

        Exemples acceptés :
        - +225 01 02 03 04 05 -> +2250102030405
        - +33 6 12 34 56 78  -> +33612345678
        - 00 1 415 555 2671   -> +14155552671

        Sans indicatif pays, un numéro local est ambigu dans une plateforme
        internationale : il est donc volontairement refusé.
        """
        if value in (None, ''):
            return value

        raw = str(value).strip()
        if raw.startswith('00'):
            raw = f'+{raw[2:]}'

        # Tolère l'affichage humain : espaces, tirets, points et parenthèses.
        cleaned = re.sub(r'[\s().-]', '', raw)

        if not _E164_RE.fullmatch(cleaned):
            raise serializers.ValidationError(
                'Numéro WhatsApp invalide. Utilisez le format international '
                '(+ indicatif pays + numéro), par exemple +2250102030405.'
            )
        return cleaned
