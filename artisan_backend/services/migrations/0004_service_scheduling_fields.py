from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0003_alter_service_categorie'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='duree_minutes',
            field=models.PositiveSmallIntegerField(
                default=60,
                help_text='Durée estimée de la prestation en minutes.',
                validators=[MinValueValidator(15), MaxValueValidator(720)],
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='delai_reservation_heures',
            field=models.PositiveSmallIntegerField(
                default=2,
                help_text='Délai minimum entre la réservation et le début du rendez-vous.',
                validators=[MinValueValidator(0), MaxValueValidator(720)],
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='mode_intervention',
            field=models.CharField(
                choices=[
                    ('chez_client', 'Chez le client'),
                    ('atelier', 'Dans l’atelier de l’artisan'),
                    ('les_deux', 'Chez le client ou en atelier'),
                ],
                default='chez_client',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='rayon_intervention_km',
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text='Rayon indicatif de déplacement. Vide si non applicable.',
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(500)],
            ),
        ),
    ]
