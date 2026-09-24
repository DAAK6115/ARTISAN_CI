from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta

from accounts.models import CustomUser
from services.models import Service


class Appointment(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'Demande reçue'),
        ('accepte', 'Accepté'),
        ('confirme', 'Confirmé'),
        ('en_route', 'Artisan en route'),
        ('en_cours', 'Prestation en cours'),
        ('termine', 'Terminé - confirmation client requise'),
        ('effectue', 'Clôturé'),
        ('refuse', 'Refusé par l’artisan'),
        ('annule_client', 'Annulé par le client'),
        ('annule_artisan', 'Annulé par l’artisan'),
        # Conservé pour les anciennes données déjà présentes.
        ('annule', 'Annulé (ancien statut)'),
    ]

    MOYENS_PAIEMENT = [
        ('wave', 'Wave'),
        ('orange_money', 'Orange Money'),
        ('moov_money', 'Moov Money'),
        ('mtn_money', 'MTN Money'),
        ('espèces', 'Espèces'),
        ('autre', 'Autre'),
    ]

    client = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='appointments_client',
    )
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    date_rdv = models.DateTimeField(db_index=True)
    date_fin = models.DateTimeField(db_index=True)

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_attente',
        db_index=True,
    )
    commentaires = models.TextField(blank=True, null=True)
    resume = models.TextField(blank=True, null=True)
    motif_annulation = models.CharField(max_length=255, blank=True)

    methode_paiement = models.CharField(
        max_length=50,
        choices=MOYENS_PAIEMENT,
        blank=True,
        null=True,
    )
    note_client = models.PositiveSmallIntegerField(null=True, blank=True)
    commentaire_client = models.TextField(blank=True, null=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)

    accepte_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    client_confirmed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Compatibilité avec les anciens chemins de création : toute nouvelle
        # réservation possède toujours une fin calculée à partir de la durée
        # actuelle du service. Le moteur métier fige explicitement cette valeur.
        if not self.date_fin and self.date_rdv and self.service_id:
            self.date_fin = self.date_rdv + timedelta(
                minutes=self.service.duree_minutes or 60
            )
        super().save(*args, **kwargs)

    def is_past(self):
        return self.date_rdv < timezone.now()

    @property
    def duree_minutes(self):
        delta = self.date_fin - self.date_rdv
        return max(0, int(delta.total_seconds() // 60))

    def __str__(self):
        return (
            f'{self.service.titre} - {self.client.username} '
            f'({self.date_rdv.strftime("%d/%m/%Y %H:%M")})'
        )


class ArtisanAvailability(models.Model):
    WEEKDAY_CHOICES = [
        (0, 'Lundi'),
        (1, 'Mardi'),
        (2, 'Mercredi'),
        (3, 'Jeudi'),
        (4, 'Vendredi'),
        (5, 'Samedi'),
        (6, 'Dimanche'),
    ]

    artisan = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weekly_availabilities',
    )
    jour_semaine = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['jour_semaine', 'heure_debut']
        constraints = [
            models.UniqueConstraint(
                fields=['artisan', 'jour_semaine', 'heure_debut', 'heure_fin'],
                name='uniq_artisan_availability_slot',
            )
        ]
        indexes = [
            models.Index(fields=['artisan', 'jour_semaine', 'actif'], name='appt_av_art_day_active_idx'),
        ]

    def __str__(self):
        return (
            f'{self.artisan.username} - {self.get_jour_semaine_display()} '
            f'{self.heure_debut}-{self.heure_fin}'
        )


class ArtisanTimeOff(models.Model):
    artisan = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='time_off_periods',
    )
    debut = models.DateTimeField(db_index=True)
    fin = models.DateTimeField(db_index=True)
    motif = models.CharField(max_length=180, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['debut']
        indexes = [
            models.Index(fields=['artisan', 'debut', 'fin'], name='appt_timeoff_art_range_idx'),
        ]

    def __str__(self):
        return f'{self.artisan.username}: {self.debut} → {self.fin}'


class AppointmentStatusHistory(models.Model):
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='status_history',
    )
    ancien_statut = models.CharField(max_length=20, blank=True)
    nouveau_statut = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointment_status_changes',
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'RDV {self.appointment_id}: {self.ancien_statut} → {self.nouveau_statut}'
