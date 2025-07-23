# services/serializers.py
from rest_framework import serializers
from .models import Service

class ServiceSerializer(serializers.ModelSerializer):
    moyenne_avis = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    artisan_username = serializers.CharField(source='artisan.username', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'artisan', 'artisan_username', 'titre', 'description', 'prix',
            'categorie', 'image', 'is_active', 'date_creation',
            'moyenne_avis', 'is_liked'
        ]
        read_only_fields = ['artisan', 'date_creation', 'moyenne_avis', 'is_active', 'is_liked']

    def get_moyenne_avis(self, obj):
        notes = obj.avis.all().values_list('note', flat=True)
        return round(sum(notes) / len(notes), 1) if notes else None

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.likes.filter(client=request.user).exists()
        return False

    def create(self, validated_data):
        if not validated_data.get('categorie'):
            validated_data['categorie'] = "Autres"
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get('categorie'):
            validated_data['categorie'] = "Autres"
        return super().update(instance, validated_data)
