from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import Payment, PaymentAttempt, Quote, QuoteLine


class QuoteLineSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = QuoteLine
        fields = ['id', 'description', 'quantity', 'unit_price', 'position', 'total']

    def validate_quantity(self, value):
        if value <= 0 or value > Decimal('1000'):
            raise serializers.ValidationError('La quantité doit être comprise entre 0 et 1000.')
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Le prix unitaire ne peut pas être négatif.')
        return value


class QuoteSerializer(serializers.ModelSerializer):
    lines = QuoteLineSerializer(many=True)
    artisan_username = serializers.CharField(source='artisan.username', read_only=True)
    client_username = serializers.CharField(source='client.username', read_only=True)
    service_titre = serializers.CharField(source='appointment.service.titre', read_only=True)
    appointment_status = serializers.CharField(source='appointment.statut', read_only=True, allow_null=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id', 'reference', 'appointment', 'artisan', 'artisan_username', 'client',
            'client_username', 'service_titre', 'appointment_status', 'status', 'notes',
            'valid_until', 'subtotal', 'discount_amount', 'total', 'sent_at',
            'accepted_at', 'rejected_at', 'created_at', 'updated_at', 'is_expired',
            'lines',
        ]
        read_only_fields = [
            'reference', 'artisan', 'client', 'status', 'subtotal', 'total', 'sent_at',
            'accepted_at', 'rejected_at', 'created_at', 'updated_at',
        ]

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('La réduction ne peut pas être négative.')
        return value

    def validate(self, attrs):
        request = self.context['request']
        appointment = attrs.get('appointment') or getattr(self.instance, 'appointment', None)
        if appointment is None or appointment.service.artisan_id != request.user.id:
            raise serializers.ValidationError('Ce rendez-vous ne vous appartient pas.')
        if appointment.statut not in {'en_attente', 'accepte'}:
            raise serializers.ValidationError(
                'Un devis ne peut être créé que pour une demande en attente ou acceptée.'
            )
        if self.instance and self.instance.status != 'draft':
            raise serializers.ValidationError('Seul un devis brouillon peut être modifié.')
        if self.instance and appointment.pk != self.instance.appointment_id:
            raise serializers.ValidationError('Le rendez-vous d’un devis existant ne peut pas être changé.')
        return attrs

    def _replace_lines(self, quote, lines_data):
        quote.lines.all().delete()
        objects = []
        for index, line in enumerate(lines_data):
            data = dict(line)
            data['position'] = index
            objects.append(QuoteLine(quote=quote, **data))
        QuoteLine.objects.bulk_create(objects)
        quote.recalculate_totals()

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        if not lines_data:
            raise serializers.ValidationError({'lines': 'Ajoutez au moins une ligne au devis.'})
        appointment = validated_data['appointment']
        with transaction.atomic():
            quote = Quote.objects.create(
                artisan=self.context['request'].user,
                client=appointment.client,
                **validated_data,
            )
            self._replace_lines(quote, lines_data)
        return quote

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if lines_data is not None:
            if not lines_data:
                raise serializers.ValidationError({'lines': 'Ajoutez au moins une ligne au devis.'})
            self._replace_lines(instance, lines_data)
        else:
            instance.recalculate_totals()
        return instance


class PaymentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = [
            'id', 'provider_reference', 'status', 'gateway', 'checkout_url',
            'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    client = serializers.StringRelatedField(read_only=True)
    service_titre = serializers.CharField(source='service.titre', read_only=True)
    artisan_username = serializers.CharField(source='service.artisan.username', read_only=True)
    quote_reference = serializers.CharField(source='quote.reference', read_only=True, allow_null=True)
    appointment_status = serializers.CharField(source='appointment.statut', read_only=True, allow_null=True)
    methode_paiement_label = serializers.CharField(source='get_methode_paiement_display', read_only=True, allow_null=True)
    declared_by_username = serializers.CharField(source='declared_by.username', read_only=True, allow_null=True)
    attempts = PaymentAttemptSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = [field.name for field in Payment._meta.fields] + ['attempts']


class PaymentDeclarationSerializer(serializers.Serializer):
    appointment_id = serializers.IntegerField(min_value=1)
    statut = serializers.ChoiceField(choices=['paid', 'unpaid'])
    methode_paiement = serializers.ChoiceField(
        choices=[
            ('cash', 'Espèces'),
            ('bank_transfer', 'Virement bancaire'),
            ('other', 'Autre'),
        ],
        required=False,
        allow_null=True,
    )
    payment_reference = serializers.CharField(required=False, allow_blank=True, max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        if attrs['statut'] == 'paid' and not attrs.get('methode_paiement'):
            raise serializers.ValidationError({
                'methode_paiement': 'La méthode est requise pour un règlement manuel.'
            })
        if attrs['statut'] == 'unpaid':
            attrs['methode_paiement'] = None
            attrs['payment_reference'] = ''
        else:
            attrs['payment_reference'] = (attrs.get('payment_reference') or '').strip()
        attrs['notes'] = (attrs.get('notes') or '').strip()
        return attrs
