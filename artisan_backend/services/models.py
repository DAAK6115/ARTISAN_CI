from django.core.validators import MaxValueValidator, MinValueValidator
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

    PRICING_MODE_CHOICES = [
        ('fixe', 'Prix fixe'),
        ('a_partir_de', 'À partir de'),
        ('sur_devis', 'Sur devis'),
    ]

    MODE_INTERVENTION_CHOICES = [
        ('chez_client', 'Chez le client'),
        ('atelier', 'Dans l’atelier de l’artisan'),
        ('les_deux', 'Chez le client ou en atelier'),
    ]

    artisan = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='services',
    )
    titre = models.CharField(max_length=100)
    description = models.TextField()
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    categorie = models.CharField(max_length=50, choices=CATEGORIES_CHOICES)
    image = models.ImageField(upload_to='prestations/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    mode_tarification = models.CharField(
        max_length=20,
        choices=PRICING_MODE_CHOICES,
        default='fixe',
    )
    # Sprint 3 — paramètres de planification.
    duree_minutes = models.PositiveSmallIntegerField(
        default=60,
        validators=[MinValueValidator(15), MaxValueValidator(720)],
        help_text='Durée estimée de la prestation en minutes.',
    )
    delai_reservation_heures = models.PositiveSmallIntegerField(
        default=2,
        validators=[MinValueValidator(0), MaxValueValidator(720)],
        help_text='Délai minimum entre la réservation et le début du rendez-vous.',
    )
    mode_intervention = models.CharField(
        max_length=20,
        choices=MODE_INTERVENTION_CHOICES,
        default='chez_client',
    )
    rayon_intervention_km = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(500)],
        help_text='Rayon indicatif de déplacement. Vide si non applicable.',
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titre} - {self.artisan.username}"

    @property
    def moyenne_avis(self):
        avis = self.avis.all()
        if avis.exists():
            return round(sum(a.note for a in avis) / avis.count(), 1)
        return None
