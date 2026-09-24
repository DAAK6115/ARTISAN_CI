from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_customuser_numero_momo_customuser_qr_wave"),
    ]

    operations = [
        migrations.AddField(
            model_name="passwordresetcode",
            name="attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="passwordresetcode",
            name="used_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="passwordresetcode",
            index=models.Index(
                fields=["user", "-created_at"],
                name="pwd_reset_user_created_idx",
            ),
        ),
    ]
