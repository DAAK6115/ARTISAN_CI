from django.db import models
from django.conf import settings
from services.models import Service

class Like(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="likes")
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('client', 'service')  # Un like par client/service

    def __str__(self):
        return f"{self.client.username} ❤️ {self.service.titre}"
