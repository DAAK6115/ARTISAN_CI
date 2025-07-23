from rest_framework import serializers

from services.models import Service
from .models import Appointment

class AppointmentSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())  # autorise le POST
    service_id = serializers.IntegerField(source='service.id', read_only=True)
    service_titre = serializers.CharField(source='service.titre', read_only=True)
    service_prix = serializers.DecimalField(source='service.prix', max_digits=10, decimal_places=2, read_only=True)
    artisan_nom = serializers.CharField(source='service.artisan.username', read_only=True)
    client_nom = serializers.CharField(source='client.username', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['client', 'created_at']

