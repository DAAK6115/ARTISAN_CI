from rest_framework import serializers
from .models import Certification

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'
        read_only_fields = ['artisan', 'date_ajout']