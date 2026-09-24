from django.conf import settings
from django.db import models


class Certification(models.Model):
    STATUS_CHOICES = [
        ("pending", "Soumise"),
        ("in_review", "En vérification"),
        ("verified", "Vérifiée"),
        ("rejected", "Refusée"),
    ]

    artisan = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certifications",
    )
    nom = models.CharField(max_length=200)
    organisme = models.CharField(max_length=200)
    fichier = models.FileField(upload_to="certifications/")
    valide_jusquau = models.DateField(blank=True, null=True)
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default="pending", db_index=True
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="certifications_reviewed",
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    review_note = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_ajout"]
        indexes = [
            models.Index(fields=["status", "-date_ajout"], name="cert_status_date_idx"),
            models.Index(fields=["artisan", "status"], name="cert_art_status_idx"),
        ]

    def __str__(self):
        return f"{self.nom} - {self.artisan.username} - {self.status}"
