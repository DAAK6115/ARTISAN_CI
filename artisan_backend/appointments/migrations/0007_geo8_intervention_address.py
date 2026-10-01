from django.db import migrations, models


def infer_existing_location(apps, schema_editor):
    Appointment = apps.get_model('appointments', 'Appointment')
    for appointment in Appointment.objects.select_related('service').all().iterator():
        mode = getattr(appointment.service, 'mode_intervention', 'chez_client')
        appointment.lieu_intervention = 'atelier' if mode == 'atelier' else 'chez_client'
        appointment.save(update_fields=['lieu_intervention'])


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0006_scheduling_and_status_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='lieu_intervention',
            field=models.CharField(
                choices=[
                    ('atelier', 'Dans l’atelier de l’artisan'),
                    ('chez_client', 'Chez le client'),
                ],
                default='chez_client',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='appointment',
            name='intervention_adresse',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='appointment',
            name='intervention_latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='intervention_longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.RunPython(infer_existing_location, migrations.RunPython.noop),
    ]
