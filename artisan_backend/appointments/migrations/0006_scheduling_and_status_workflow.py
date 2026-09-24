from datetime import timedelta

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_appointment_end(apps, schema_editor):
    Appointment = apps.get_model('appointments', 'Appointment')
    for appointment in Appointment.objects.select_related('service').filter(date_fin__isnull=True):
        duration = getattr(appointment.service, 'duree_minutes', 60) or 60
        appointment.date_fin = appointment.date_rdv + timedelta(minutes=duration)
        appointment.save(update_fields=['date_fin'])


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('services', '0004_service_scheduling_fields'),
        ('appointments', '0005_appointment_montant'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='date_fin',
            field=models.DateTimeField(db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='motif_annulation',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='appointment',
            name='accepte_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='client_confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_appointment_end, reverse_backfill),
        migrations.AlterField(
            model_name='appointment',
            name='date_fin',
            field=models.DateTimeField(db_index=True),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='date_rdv',
            field=models.DateTimeField(db_index=True),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='statut',
            field=models.CharField(
                choices=[
                    ('en_attente', 'Demande reçue'),
                    ('accepte', 'Accepté'),
                    ('confirme', 'Confirmé'),
                    ('en_route', 'Artisan en route'),
                    ('en_cours', 'Prestation en cours'),
                    ('termine', 'Terminé - confirmation client requise'),
                    ('effectue', 'Clôturé'),
                    ('refuse', 'Refusé par l’artisan'),
                    ('annule_client', 'Annulé par le client'),
                    ('annule_artisan', 'Annulé par l’artisan'),
                    ('annule', 'Annulé (ancien statut)'),
                ],
                db_index=True,
                default='en_attente',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='ArtisanAvailability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('jour_semaine', models.PositiveSmallIntegerField(choices=[(0, 'Lundi'), (1, 'Mardi'), (2, 'Mercredi'), (3, 'Jeudi'), (4, 'Vendredi'), (5, 'Samedi'), (6, 'Dimanche')])),
                ('heure_debut', models.TimeField()),
                ('heure_fin', models.TimeField()),
                ('actif', models.BooleanField(default=True)),
                ('artisan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weekly_availabilities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['jour_semaine', 'heure_debut'],
            },
        ),
        migrations.CreateModel(
            name='ArtisanTimeOff',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('debut', models.DateTimeField(db_index=True)),
                ('fin', models.DateTimeField(db_index=True)),
                ('motif', models.CharField(blank=True, max_length=180)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('artisan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='time_off_periods', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['debut'],
            },
        ),
        migrations.CreateModel(
            name='AppointmentStatusHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ancien_statut', models.CharField(blank=True, max_length=20)),
                ('nouveau_statut', models.CharField(max_length=20)),
                ('note', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('appointment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='appointments.appointment')),
                ('changed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='appointment_status_changes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='artisanavailability',
            constraint=models.UniqueConstraint(
                fields=('artisan', 'jour_semaine', 'heure_debut', 'heure_fin'),
                name='uniq_artisan_availability_slot',
            ),
        ),
        migrations.AddIndex(
            model_name='artisanavailability',
            index=models.Index(
                fields=['artisan', 'jour_semaine', 'actif'],
                name='appt_av_art_day_active_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='artisantimeoff',
            index=models.Index(
                fields=['artisan', 'debut', 'fin'],
                name='appt_timeoff_art_range_idx',
            ),
        ),
    ]
