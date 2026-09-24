from django.conf import settings
from django.db import models


class Reclamation(models.Model):
    STATUS_CHOICES = [
        ("new", "Nouveau"),
        ("in_progress", "En cours"),
        ("waiting_user", "En attente de l’utilisateur"),
        ("resolved", "Résolu"),
        ("closed", "Fermé"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Faible"), ("normal", "Normale"),
        ("high", "Haute"), ("urgent", "Urgente"),
    ]

    # Nom historique conservé pour compatibilité : ce champ peut contenir un client OU un artisan.
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_requests"
    )
    objet = models.CharField(max_length=200)
    message = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new", db_index=True)
    priorite = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal", db_index=True)
    admin_response = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="assigned_support_requests",
    )
    date_envoi = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-date_envoi"]
        indexes = [
            models.Index(fields=["statut", "priorite", "-date_envoi"], name="support_state_idx"),
        ]

    def __str__(self):
        return f"#{self.pk} {self.objet}"
