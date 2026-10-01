from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from services.models import Service
from integrations.routing import driving_route_metrics, routing_configured
from .domain import allowed_transitions_for
from .models import Appointment, ArtisanAvailability, ArtisanTimeOff


class AppointmentSerializer(serializers.ModelSerializer):
    intervention_latitude = serializers.FloatField(required=False, allow_null=True)
    intervention_longitude = serializers.FloatField(required=False, allow_null=True)
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True)
    )
    service_id = serializers.IntegerField(source='service.id', read_only=True)
    service_titre = serializers.CharField(source='service.titre', read_only=True)
    service_currency_code = serializers.CharField(source='service.artisan.currency_code', read_only=True)
    service_prix = serializers.DecimalField(
        source='service.prix',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    service_duree_minutes = serializers.IntegerField(
        source='service.duree_minutes',
        read_only=True,
    )
    artisan_nom = serializers.CharField(source='service.artisan.username', read_only=True)
    client_nom = serializers.CharField(source='client.username', read_only=True)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    transitions_autorisees = serializers.SerializerMethodField()
    peut_annuler = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'client', 'client_nom', 'service', 'service_id', 'service_titre',
            'service_prix', 'service_currency_code', 'service_duree_minutes', 'artisan_nom', 'date_rdv',
            'date_fin', 'statut', 'statut_label', 'transitions_autorisees',
            'peut_annuler', 'commentaires', 'lieu_intervention',
            'intervention_adresse', 'intervention_latitude', 'intervention_longitude',
            'resume', 'motif_annulation', 'methode_paiement', 'note_client',
            'commentaire_client', 'montant',
            'rating', 'accepte_at', 'started_at', 'completed_at',
            'client_confirmed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'client',
            'date_fin',
            'statut',
            'resume',
            'motif_annulation',
            'methode_paiement',
            'note_client',
            'commentaire_client',
            'montant',
            'rating',
            'accepte_at',
            'started_at',
            'completed_at',
            'client_confirmed_at',
            'created_at',
            'updated_at',
        ]

    def get_transitions_autorisees(self, obj):
        request = self.context.get('request')
        if not request:
            return []
        return allowed_transitions_for(obj, request.user)

    def get_peut_annuler(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        if 'annule_client' not in allowed_transitions_for(obj, request.user):
            return False
        return obj.date_rdv - timezone.now() >= timedelta(days=3)

    @staticmethod
    def _coordinate(value, name, minimum, maximum):
        if value in (None, ''):
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError(f'{name} invalide.')
        if number < minimum or number > maximum:
            raise serializers.ValidationError(f'{name} hors limites.')
        return round(number, 6)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        service = attrs.get('service', getattr(self.instance, 'service', None))
        if service is None:
            return attrs

        mode = service.mode_intervention
        place = attrs.get('lieu_intervention', getattr(self.instance, 'lieu_intervention', None))

        if mode == 'atelier':
            place = 'atelier'
        elif mode == 'chez_client':
            place = 'chez_client'
        elif place not in {'atelier', 'chez_client'}:
            raise serializers.ValidationError({
                'lieu_intervention': 'Choisissez si la prestation aura lieu chez vous ou dans l’atelier de l’artisan.'
            })
        attrs['lieu_intervention'] = place

        if place == 'atelier':
            attrs['intervention_adresse'] = ''
            attrs['intervention_latitude'] = None
            attrs['intervention_longitude'] = None
            return attrs

        address = str(attrs.get('intervention_adresse', '') or '').strip()
        if not address:
            raise serializers.ValidationError({
                'intervention_adresse': 'Sélectionnez l’adresse où l’artisan doit intervenir.'
            })
        if len(address) > 255:
            raise serializers.ValidationError({'intervention_adresse': 'Adresse trop longue.'})

        latitude = self._coordinate(attrs.get('intervention_latitude'), 'Latitude', -90, 90)
        longitude = self._coordinate(attrs.get('intervention_longitude'), 'Longitude', -180, 180)
        if latitude is None or longitude is None:
            raise serializers.ValidationError({
                'intervention_adresse': 'Sélectionnez une adresse proposée afin de confirmer sa position GPS.'
            })
        attrs['intervention_adresse'] = address
        attrs['intervention_latitude'] = latitude
        attrs['intervention_longitude'] = longitude

        zone_type = getattr(service, 'zone_intervention_type', 'sans_limite') or 'sans_limite'
        if zone_type == 'sans_limite':
            return attrs

        try:
            portfolio = service.artisan.portfolio
        except Exception:
            portfolio = None
        if not portfolio or portfolio.latitude is None or portfolio.longitude is None:
            raise serializers.ValidationError({
                'intervention_adresse': 'La zone de cet artisan ne peut pas être vérifiée pour le moment.'
            })
        if not routing_configured():
            raise serializers.ValidationError({
                'intervention_adresse': 'La vérification routière de la zone d’intervention est temporairement indisponible.'
            })

        metrics = driving_route_metrics(
            (float(portfolio.latitude), float(portfolio.longitude)),
            [{'id': 'client', 'coordinates': (latitude, longitude)}],
        ).get('client')
        if not metrics:
            raise serializers.ValidationError({
                'intervention_adresse': 'Impossible de vérifier cette adresse par la route. Réessayez ou choisissez une autre adresse.'
            })

        if zone_type == 'rayon':
            limit = getattr(service, 'rayon_intervention_km', None)
            if limit is not None and metrics.get('distance_km') is not None and float(metrics['distance_km']) > float(limit):
                raise serializers.ValidationError({
                    'intervention_adresse': f'Cette adresse est hors de la zone habituelle de {limit} km de cette prestation.'
                })
        elif zone_type == 'temps_trajet':
            limit = getattr(service, 'temps_intervention_max_minutes', None)
            if limit is not None and metrics.get('duration_minutes') is not None and int(metrics['duration_minutes']) > int(limit):
                raise serializers.ValidationError({
                    'intervention_adresse': f'Cette adresse dépasse le temps de trajet maximal de {limit} min pour cette prestation.'
                })
        return attrs

    def validate_commentaires(self, value):
        if value is None:
            return value
        value = value.strip()
        if len(value) > 1500:
            raise serializers.ValidationError('Le commentaire est trop long.')
        return value


class ArtisanAvailabilitySerializer(serializers.ModelSerializer):
    jour_label = serializers.CharField(source='get_jour_semaine_display', read_only=True)

    class Meta:
        model = ArtisanAvailability
        fields = [
            'id',
            'jour_semaine',
            'jour_label',
            'heure_debut',
            'heure_fin',
            'actif',
        ]

    def validate(self, attrs):
        start = attrs.get('heure_debut', getattr(self.instance, 'heure_debut', None))
        end = attrs.get('heure_fin', getattr(self.instance, 'heure_fin', None))
        day = attrs.get('jour_semaine', getattr(self.instance, 'jour_semaine', None))

        if start is None or end is None or day is None:
            return attrs
        if start >= end:
            raise serializers.ValidationError(
                'L’heure de fin doit être postérieure à l’heure de début.'
            )

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            qs = ArtisanAvailability.objects.filter(
                artisan=request.user,
                jour_semaine=day,
                actif=True,
                heure_debut__lt=end,
                heure_fin__gt=start,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    'Cette plage horaire chevauche déjà une disponibilité existante.'
                )
        return attrs


class ArtisanTimeOffSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtisanTimeOff
        fields = ['id', 'debut', 'fin', 'motif', 'created_at']
        read_only_fields = ['created_at']

    def validate(self, attrs):
        start = attrs.get('debut', getattr(self.instance, 'debut', None))
        end = attrs.get('fin', getattr(self.instance, 'fin', None))
        if start is None or end is None:
            return attrs
        if start >= end:
            raise serializers.ValidationError(
                'La fin de l’indisponibilité doit être postérieure au début.'
            )
        return attrs
