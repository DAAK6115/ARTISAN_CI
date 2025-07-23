from django.db import models
from accounts.models import CustomUser
from appointments.models import Appointment
from services.models import Service

class Notification(models.Model):
    destinataire = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    rendez_vous = models.ForeignKey(Appointment, on_delete=models.CASCADE, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, null=True, blank=True)
    titre = models.CharField(max_length=100)
    message = models.TextField()
    lien_redirection = models.CharField(max_length=255, blank=True, null=True)
    lu = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notif pour {self.destinataire.username}: {self.titre}"
