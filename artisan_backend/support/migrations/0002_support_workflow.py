from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def normalize_legacy_status(apps, schema_editor):
    Reclamation = apps.get_model("support", "Reclamation")
    Reclamation.objects.filter(statut="non traité").update(statut="new")


def reverse_normalize_legacy_status(apps, schema_editor):
    Reclamation = apps.get_model("support", "Reclamation")
    Reclamation.objects.filter(statut="new").update(statut="non traité")


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("support", "0001_initial"),
    ]
    operations = [
        migrations.AlterField(
            model_name="reclamation", name="statut",
            field=models.CharField(
                choices=[("new", "Nouveau"), ("in_progress", "En cours"),
                         ("waiting_user", "En attente de l’utilisateur"),
                         ("resolved", "Résolu"), ("closed", "Fermé")],
                db_index=True, default="new", max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="reclamation", name="priorite",
            field=models.CharField(
                choices=[("low", "Faible"), ("normal", "Normale"),
                         ("high", "Haute"), ("urgent", "Urgente")],
                db_index=True, default="normal", max_length=10,
            ),
        ),
        migrations.AddField(model_name="reclamation", name="admin_response", field=models.TextField(blank=True)),
        migrations.AddField(model_name="reclamation", name="updated_at", field=models.DateTimeField(auto_now=True)),
        migrations.AddField(model_name="reclamation", name="closed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(
            model_name="reclamation", name="assigned_to",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_support_requests", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(normalize_legacy_status, reverse_normalize_legacy_status),
        migrations.AlterModelOptions(name="reclamation", options={"ordering": ["-date_envoi"]}),
        migrations.AddIndex(
            model_name="reclamation",
            index=models.Index(fields=["statut", "priorite", "-date_envoi"], name="support_state_idx"),
        ),
    ]
