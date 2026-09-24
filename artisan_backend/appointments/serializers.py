from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from services.models import Service
from .domain import allowed_transitions_for
from .models import Appointment, ArtisanAvailability, ArtisanTimeOff


class AppointmentSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True)
    )
    service_id = serializers.IntegerField(source='service.id', read_only=True)
    service_titre = serializers.CharField(source='service.titre', read_only=True)
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
            'service_prix', 'service_duree_minutes', 'artisan_nom', 'date_rdv',
            'date_fin', 'statut', 'statut_label', 'transitions_autorisees',
            'peut_annuler', 'commentaires', 'resume', 'motif_annulation',
            'methode_paiement', 'note_client', 'commentaire_client', 'montant',
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
