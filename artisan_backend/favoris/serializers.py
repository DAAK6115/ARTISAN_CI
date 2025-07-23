from rest_framework import serializers
from .models import Favorite

class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = ['id', 'client', 'service', 'date_added']
        read_only_fields = ['client', 'date_added']
