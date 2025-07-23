from django.db import models
from accounts.models import CustomUser

class Service(models.Model):
    CATEGORIES_CHOICES = [
        ('alimentation', 'Alimentation'),
        ('artisanat_d_art', 'Artisanat d’Art'),
        ('btp', 'Bâtiment et Travaux Publics'),
        ('bois', 'Bois et dérivés'),
        ('cuir', 'Cuir et Peaux'),
        ('coiffure_esthetique', 'Coiffure et Esthétique'),
        ('couture_habillement', 'Couture et Habillement'),
        ('electronique', 'Électronique et Électromécanique'),
        ('energie_renouvelable', 'Énergie Renouvelable'),
        ('mecanique_auto', 'Mécanique et Réparation Automobile'),
        ('metallurgie_soudure', 'Métallurgie et Soudure'),
        ('savonnerie', 'Production de savon et produits ménagers'),
        ('serigraphie', 'Sérigraphie et Impression'),
        ('services_numeriques', 'Services Numériques'),
        ('transport', 'Transport et Logistique Artisanale'),
    ]

    artisan = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='services')
    titre = models.CharField(max_length=100)
    description = models.TextField()
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    categorie = models.CharField(max_length=50, choices=CATEGORIES_CHOICES)
    image = models.ImageField(upload_to='prestations/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titre} - {self.artisan.username}"

    @property
    def moyenne_avis(self):
        avis = self.avis.all()
        if avis.exists():
            return round(sum([a.note for a in avis]) / avis.count(), 1)
        return None
