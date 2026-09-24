from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    dependencies = [
        ('services', '0004_service_scheduling_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='mode_tarification',
            field=models.CharField(choices=[('fixe', 'Prix fixe'), ('a_partir_de', 'À partir de'), ('sur_devis', 'Sur devis')], default='fixe', max_length=20),
        ),
        migrations.AddField(
            model_name='service',
            name='acompte_pourcentage',
            field=models.PositiveSmallIntegerField(default=0, help_text='Pourcentage d’acompte proposé avant la prestation.', validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)]),
        ),
    ]
