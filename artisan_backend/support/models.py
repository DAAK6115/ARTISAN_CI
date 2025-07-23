from django.db import models
from accounts.models import CustomUser

class Reclamation(models.Model):
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    objet = models.CharField(max_length=200)
    message = models.TextField()
    statut = models.CharField(max_length=50, default='non traité')
    date_envoi = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.objet