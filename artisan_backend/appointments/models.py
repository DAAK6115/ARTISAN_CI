from django.db import models
from django.utils import timezone
from services.models import Service
from accounts.models import CustomUser

class Appointment(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirme', 'Confirmé'),
        ('effectue', 'Effectué'),
        ('annule', 'Annulé'),
    ]

    MOYENS_PAIEMENT = [
        ('wave', 'Wave'),
        ('orange_money', 'Orange Money'),
        ('moov_money', 'Moov Money'),
        ('mtn_money', 'MTN Money'),
        ('espèces', 'Espèces'),
        ('autre', 'Autre'),
    ]

    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='appointments_client')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    date_rdv = models.DateTimeField()

    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    commentaires = models.TextField(blank=True, null=True)
    resume = models.TextField(blank=True, null=True)

    methode_paiement = models.CharField(max_length=50, choices=MOYENS_PAIEMENT, blank=True, null=True)
    note_client = models.PositiveSmallIntegerField(null=True, blank=True)
    commentaire_client = models.TextField(blank=True, null=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_past(self):
        return self.date_rdv < timezone.now()

    def __str__(self):
        return f"{self.service.titre} - {self.client.username} ({self.date_rdv.strftime('%d/%m/%Y %H:%M')})"
