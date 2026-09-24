from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("accounts", "0003_passwordresetcode_attempts_used_at")]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="verification_status",
            field=models.CharField(
                choices=[
                    ("unverified", "Non vérifié"),
                    ("pending", "En vérification"),
                    ("verified", "Vérifié"),
                    ("rejected", "Refusé"),
                ],
                db_index=True,
                default="unverified",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="verification_requested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="verification_reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="verification_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="verification_reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="artisan_verification_reviews",
                to="accounts.customuser",
            ),
        ),
    ]
