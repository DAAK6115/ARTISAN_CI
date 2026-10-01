from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0004_artisan_verification")]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="country_code",
            field=models.CharField(db_index=True, default="CI", max_length=2),
        ),
        migrations.AddField(
            model_name="customuser",
            name="country_calling_code",
            field=models.CharField(default="+225", max_length=12),
        ),
        migrations.AddField(
            model_name="customuser",
            name="currency_code",
            field=models.CharField(default="XOF", max_length=3),
        ),
    ]
