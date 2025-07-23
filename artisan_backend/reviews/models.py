from django.db import models
from accounts.models import CustomUser
from services.models import Service
from appointments.models import Appointment

class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='avis')
    rendez_vous = models.ForeignKey(Appointment, on_delete=models.CASCADE, null=True, blank=True)
    note = models.IntegerField(choices=RATING_CHOICES)
    commentaire = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis {self.note} pour {self.service.titre} par {self.client.username}"
