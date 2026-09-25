from decimal import Decimal
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from appointments.models import Appointment
from services.models import Service


def generate_quote_reference():
    return f"DEV-{uuid.uuid4().hex[:12].upper()}"


def generate_payment_reference():
    return f"PAY-{uuid.uuid4().hex[:16].upper()}"


class Quote(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('sent', 'Envoyé'),
        ('accepted', 'Accepté'),
        ('rejected', 'Refusé'),
        ('expired', 'Expiré'),
        ('cancelled', 'Annulé'),
    ]

    reference = models.CharField(max_length=24, unique=True, default=generate_quote_reference, editable=False)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='quotes')
    artisan = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quotes_sent')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quotes_received')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='draft', db_index=True)
    notes = models.TextField(blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['appointment'],
                condition=models.Q(status='accepted'),
                name='uniq_accepted_quote_per_appointment',
            )
        ]
        indexes = [
            models.Index(fields=['artisan', 'status'], name='pay_quote_art_status_idx'),
            models.Index(fields=['client', 'status'], name='pay_quote_cli_status_idx'),
        ]

    @property
    def is_expired(self):
        return bool(self.valid_until and self.valid_until <= timezone.now())

    def recalculate_totals(self):
        subtotal = sum((line.total for line in self.lines.all()), Decimal('0'))
        discount = max(Decimal('0'), min(self.discount_amount or Decimal('0'), subtotal))
        self.subtotal = subtotal
        self.discount_amount = discount
        self.total = subtotal - discount
        self.save(update_fields=['subtotal', 'discount_amount', 'total', 'updated_at'])
        return self.total

    def __str__(self):
        return f'{self.reference} - {self.client.username} - {self.total} FCFA'


class QuoteLine(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='lines')
    description = models.CharField(max_length=180)
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1, validators=[MinValueValidator(Decimal('0.01'))])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']

    @property
    def total(self):
        return (self.quantity or Decimal('0')) * (self.unit_price or Decimal('0'))

    def __str__(self):
        return f'{self.description} - {self.total} FCFA'


class Payment(models.Model):
    """Règlement d'une prestation ARTISAN_CI.

    Pour Mobile Money, GeniusPay est la source de vérité. Les statuts fournisseur
    sont synchronisés via webhook signé, ou via une vérification serveur-à-serveur
    lorsque le client revient du checkout.
    """

    STATUS_CHOICES = [
        ('unpaid', 'Non payé (legacy/manuellement)'),
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('paid', 'Payé'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
        ('expired', 'Expiré'),
        ('refunded', 'Remboursé'),
    ]

    METHOD_CHOICES = [
        ('wave', 'Wave'),
        ('orange_money', 'Orange Money'),
        ('moov_money', 'Moov Money'),
        ('mtn_money', 'MTN Money'),
        ('cash', 'Espèces'),
        ('bank_transfer', 'Virement bancaire'),
        ('other', 'Autre'),
    ]

    PROVIDER_CHOICES = [
        ('manual', 'Manuel'),
        ('geniuspay', 'GeniusPay'),
    ]

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='payments')
    appointment = models.ForeignKey(Appointment, on_delete=models.PROTECT, related_name='payments', null=True, blank=True)
    quote = models.ForeignKey(Quote, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')

    montant_initial = models.DecimalField(max_digits=12, decimal_places=2)
    reduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='XOF')

    methode_paiement = models.CharField(max_length=24, choices=METHOD_CHOICES, null=True, blank=True)
    statut = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending', db_index=True)

    transaction_id = models.CharField(max_length=64, unique=True, db_index=True, default=generate_payment_reference)
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text='Référence externe GeniusPay ou référence de règlement manuel.',
    )

    provider = models.CharField(max_length=24, choices=PROVIDER_CHOICES, default='manual', db_index=True)
    provider_reference = models.CharField(max_length=100, blank=True, db_index=True)
    provider_status = models.CharField(max_length=32, blank=True)
    checkout_url = models.URLField(max_length=600, blank=True)
    provider_payload = models.JSONField(default=dict, blank=True)
    initiated_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    # Champs historiques conservés pour les règlements non-Mobile-Money et les anciennes données.
    declared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payment_declarations',
        null=True,
        blank=True,
    )
    declared_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    date_paiement = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['client', 'statut'], name='pay_client_status_idx'),
            models.Index(fields=['appointment', 'statut'], name='pay_appt_status_idx'),
            models.Index(fields=['provider', 'provider_status'], name='pay_provider_state_idx'),
        ]

    @property
    def is_paid(self):
        return self.statut == 'paid'

    def __str__(self):
        return f'{self.transaction_id} - {self.montant} {self.currency} - {self.statut}'


class PaymentAttempt(models.Model):
    """Trace immuable de chaque checkout GeniusPay lancé pour un règlement."""

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='attempts')
    provider_reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=32, default='pending', db_index=True)
    gateway = models.CharField(max_length=32, blank=True)
    checkout_url = models.URLField(max_length=600, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['payment', 'status'], name='pay_attempt_state_idx')]

    def __str__(self):
        return f'{self.provider_reference} - {self.status}'


class PaymentGatewayEvent(models.Model):
    """Journal idempotent des événements GeniusPay déjà traités."""

    event_id = models.CharField(max_length=120, unique=True)
    event_type = models.CharField(max_length=64, db_index=True)
    provider_reference = models.CharField(max_length=100, blank=True, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-processed_at']

    def __str__(self):
        return f'{self.event_type} - {self.event_id}'
