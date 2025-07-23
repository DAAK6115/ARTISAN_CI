from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    client = serializers.StringRelatedField(read_only=True)
    service_titre = serializers.CharField(source='service.titre', read_only=True)
    artisan_username = serializers.CharField(source='service.artisan.username', read_only=True)

    montant_final = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'  # tu peux aussi lister les champs manuellement si besoin
        read_only_fields = ['client', 'statut', 'transaction_id', 'date_paiement']

    def get_montant_final(self, obj):
        return float(obj.montant_initial or 0) - float(obj.reduction or 0)
