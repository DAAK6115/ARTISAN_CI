from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('services', '0005_service_pricing_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='service',
            name='acompte_pourcentage',
        ),
    ]
