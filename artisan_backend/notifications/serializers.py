from rest_framework import serializers
from .models import Notification
from services.models import Service

class ServiceMiniSerializer(serializers.ModelSerializer):
    artisan_username = serializers.CharField(source='artisan.username')

    class Meta:
        model = Service
        fields = ['id', 'titre', 'artisan_username']

class NotificationSerializer(serializers.ModelSerializer):
    rendez_vous_id = serializers.SerializerMethodField()
    service = ServiceMiniSerializer(read_only=True)  # Nested

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['destinataire', 'date_envoi']

    def get_rendez_vous_id(self, obj):
        return obj.rendez_vous.id if obj.rendez_vous else None
