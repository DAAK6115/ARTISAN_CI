from rest_framework import serializers
from .models import Portfolio, Realisation

class RealisationSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    class Meta:
        model = Realisation
        fields = ['id', 'portfolio', 'titre', 'image', 'description', 'date']
        read_only_fields = ['portfolio', 'date']

class PortfolioSerializer(serializers.ModelSerializer):
    realisations = RealisationSerializer(many=True, read_only=True)
    artisan_nom = serializers.ReadOnlyField(source='artisan.username')

    class Meta:
        model = Portfolio
        fields = '__all__'
        read_only_fields = ['artisan']