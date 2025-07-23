from django.db import models
from accounts.models import CustomUser

class Portfolio(models.Model):
    artisan = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='portfolio')
    bio = models.TextField(blank=True)
    photo_couverture = models.ImageField(upload_to='portfolio/couvertures/', blank=True, null=True)
    site_web = models.URLField(blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    localisation = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    visible = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Portfolio de {self.artisan.username}"


class Realisation(models.Model):
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='realisations')
    titre = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to='portfolio/realisations/')
    description = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.titre