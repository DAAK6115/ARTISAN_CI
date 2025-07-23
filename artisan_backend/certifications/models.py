from django.db import models
from accounts.models import CustomUser

class Certification(models.Model):
    artisan = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='certifications')
    nom = models.CharField(max_length=200)
    organisme = models.CharField(max_length=200)
    fichier = models.FileField(upload_to='certifications/')
    valide_jusquau = models.DateField(blank=True, null=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom} - {self.artisan.username}"
