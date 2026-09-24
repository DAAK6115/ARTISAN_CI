from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("certifications", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="certification",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Soumise"), ("in_review", "En vérification"),
                    ("verified", "Vérifiée"), ("rejected", "Refusée"),
                ],
                db_index=True, default="pending", max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="certification", name="review_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="certification", name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="certification", name="reviewed_by",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="certifications_reviewed", to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterModelOptions(name="certification", options={"ordering": ["-date_ajout"]}),
        migrations.AddIndex(
            model_name="certification",
            index=models.Index(fields=["status", "-date_ajout"], name="cert_status_date_idx"),
        ),
        migrations.AddIndex(
            model_name="certification",
            index=models.Index(fields=["artisan", "status"], name="cert_art_status_idx"),
        ),
    ]
