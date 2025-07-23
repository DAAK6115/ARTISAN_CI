from django.db import models
from accounts.models import CustomUser
from services.models import Service
from appointments.models import Appointment

class Payment(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('valide', 'Validé'),
        ('echoue', 'Échoué'),
    ]

    METHOD_CHOICES = [  # ✅ Ajout des choices ici
        ('wave', 'Wave'),
        ('orange_money', 'Orange Money'),
        ('moov_money', 'Moov Money'),
        ('mtn_money', 'MTN Money'),
        ('espèces', 'Espèces'),
        ('autre', 'Autre'),
    ]

    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, null=True, blank=True)
    montant_initial = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reduction = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='en_attente')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    date_paiement = models.DateTimeField(auto_now_add=True)
    methode_paiement = models.CharField(max_length=50, choices=METHOD_CHOICES, null=True, blank=True)  # ✅ ici

    def save(self, *args, **kwargs):
        if self.montant_initial is None:
            self.montant_initial = self.montant
        if self.reduction is None:
            self.reduction = 0
        self.montant = self.montant_initial - self.reduction
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Paiement {self.service.titre} par {self.client.username} - {self.statut}"
