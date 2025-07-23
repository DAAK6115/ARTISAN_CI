from django.db import models
from accounts.models import CustomUser
from services.models import Service

class Favorite(models.Model):
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="favoris")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="favoris")
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('client', 'service')  # pas deux fois le même

    def __str__(self):
        return f"{self.client.username} ❤️ {self.service.titre}"
