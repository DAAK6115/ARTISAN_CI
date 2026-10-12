from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_client_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="primary_address",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="customuser",
            name="primary_latitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="primary_longitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="preferred_contact_method",
            field=models.CharField(
                choices=[
                    ("chat", "Messagerie ARTISAN_CI"),
                    ("whatsapp", "WhatsApp"),
                    ("phone", "Téléphone"),
                    ("email", "Email"),
                ],
                default="chat",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="preferred_service_location",
            field=models.CharField(
                choices=[
                    ("no_preference", "Aucune préférence"),
                    ("home", "Chez moi"),
                    ("workshop", "Chez l'artisan"),
                ],
                default="no_preference",
                max_length=20,
            ),
        ),
    ]
