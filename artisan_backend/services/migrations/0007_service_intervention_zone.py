from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


def preserve_existing_radius_limits(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(
        mode_intervention__in=['chez_client', 'les_deux'],
        rayon_intervention_km__isnull=False,
    ).update(zone_intervention_type='rayon')


class Migration(migrations.Migration):
    dependencies = [
        ('services', '0006_remove_service_acompte'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='zone_intervention_type',
            field=models.CharField(
                choices=[
                    ('sans_limite', 'Sans limite spécifique'),
                    ('rayon', 'Rayon kilométrique'),
                    ('temps_trajet', 'Temps de trajet maximum'),
                ],
                default='sans_limite',
                help_text='Limite appliquée lorsque la prestation peut être réalisée chez le client.',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='temps_intervention_max_minutes',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(5), MaxValueValidator(240)],
                help_text='Temps de trajet routier maximal lorsque la zone est limitée par durée.',
            ),
        ),
        migrations.AlterField(
            model_name='service',
            name='rayon_intervention_km',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(500)],
                help_text='Rayon routier maximal quand la zone est limitée par distance.',
            ),
        ),
        migrations.RunPython(preserve_existing_radius_limits, migrations.RunPython.noop),
    ]
