from rest_framework import serializers

from services.serializers import ServiceSerializer
from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'service', 'date_added']
        read_only_fields = fields
