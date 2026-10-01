from rest_framework import serializers

from common.validators import validate_image_upload
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    moyenne_avis = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_favori = serializers.SerializerMethodField()
    artisan_username = serializers.CharField(source='artisan.username', read_only=True)
    artisan_verified = serializers.SerializerMethodField()
    artisan_localisation = serializers.SerializerMethodField()
    artisan_latitude = serializers.SerializerMethodField()
    artisan_longitude = serializers.SerializerMethodField()
    categorie_label = serializers.CharField(source='get_categorie_display', read_only=True)
    mode_tarification_label = serializers.CharField(source='get_mode_tarification_display', read_only=True)
    mode_intervention_label = serializers.CharField(source='get_mode_intervention_display', read_only=True)
    zone_intervention_type_label = serializers.CharField(source='get_zone_intervention_type_display', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'artisan', 'artisan_username', 'artisan_verified',
            'artisan_localisation', 'artisan_latitude', 'artisan_longitude',
            'titre', 'description', 'prix',
            'categorie', 'categorie_label', 'image', 'is_active',
            'mode_tarification', 'mode_tarification_label', 'duree_minutes',
            'delai_reservation_heures', 'mode_intervention', 'mode_intervention_label',
            'zone_intervention_type', 'zone_intervention_type_label',
            'rayon_intervention_km', 'temps_intervention_max_minutes',
            'date_creation', 'moyenne_avis', 'is_liked',
            'is_favori',
        ]
        read_only_fields = [
            'artisan', 'date_creation', 'moyenne_avis', 'is_active', 'is_liked',
            'is_favori', 'artisan_verified', 'artisan_localisation',
            'artisan_latitude', 'artisan_longitude', 'categorie_label', 'mode_tarification_label',
            'mode_intervention_label', 'zone_intervention_type_label',
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

        intervention_mode = attrs.get('mode_intervention', getattr(self.instance, 'mode_intervention', 'chez_client'))
        zone_type = attrs.get('zone_intervention_type', getattr(self.instance, 'zone_intervention_type', 'sans_limite'))
        radius = attrs.get('rayon_intervention_km', getattr(self.instance, 'rayon_intervention_km', None))
        travel_minutes = attrs.get('temps_intervention_max_minutes', getattr(self.instance, 'temps_intervention_max_minutes', None))

        if intervention_mode == 'atelier':
            attrs['zone_intervention_type'] = 'sans_limite'
            attrs['rayon_intervention_km'] = None
            attrs['temps_intervention_max_minutes'] = None
        elif zone_type == 'rayon':
            if radius in (None, ''):
                raise serializers.ValidationError({'rayon_intervention_km': 'Indiquez le rayon maximal de déplacement.'})
            attrs['temps_intervention_max_minutes'] = None
        elif zone_type == 'temps_trajet':
            if travel_minutes in (None, ''):
                raise serializers.ValidationError({'temps_intervention_max_minutes': 'Indiquez le temps de trajet maximal.'})
            attrs['rayon_intervention_km'] = None
        else:
            attrs['rayon_intervention_km'] = None
            attrs['temps_intervention_max_minutes'] = None
        return attrs

    def validate_titre(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le titre est requis.')
        return value

    def get_artisan_verified(self, obj):
        return bool(obj.artisan.is_active and obj.artisan.verification_status == 'verified')

    @staticmethod
    def _portfolio(obj):
        try:
            return obj.artisan.portfolio
        except Exception:
            return None

    def get_artisan_localisation(self, obj):
        portfolio = self._portfolio(obj)
        return portfolio.localisation if portfolio else ''

    def get_artisan_latitude(self, obj):
        portfolio = self._portfolio(obj)
        return float(portfolio.latitude) if portfolio and portfolio.latitude is not None else None

    def get_artisan_longitude(self, obj):
        portfolio = self._portfolio(obj)
        return float(portfolio.longitude) if portfolio and portfolio.longitude is not None else None

    def get_moyenne_avis(self, obj):
        annotated = getattr(obj, 'moyenne_avis_calc', None)
        if annotated is not None:
            return round(float(annotated), 1)
        notes = obj.avis.all().values_list('note', flat=True)
        return round(sum(notes) / len(notes), 1) if notes else None

    def get_is_liked(self, obj):
        annotated = getattr(obj, 'is_liked_calc', None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and obj.likes.filter(client=request.user).exists())

    def get_is_favori(self, obj):
        annotated = getattr(obj, 'is_favori_calc', None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and obj.favoris.filter(client=request.user).exists())
