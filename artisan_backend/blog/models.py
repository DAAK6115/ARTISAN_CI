from django.db import models
from accounts.models import CustomUser

class Article(models.Model):
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    image = models.ImageField(upload_to='blog/', blank=True, null=True)
    date_publication = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titre