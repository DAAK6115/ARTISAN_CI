from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('portfolio', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='portfolio',
            name='photo_profil',
            field=models.ImageField(blank=True, null=True, upload_to='portfolio/profils/'),
        ),
    ]
