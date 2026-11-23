from django.db import migrations, models


def populate_timezone(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    # Backfill only conservative defaults for known countries.
    defaults = {'FR': 'Europe/Paris', 'CA': 'America/Toronto'}
    for code, name in defaults.items():
        User.objects.filter(country_code=code).update(timezone_name=name)


class Migration(migrations.Migration):
    dependencies = [('accounts', '0008_client_address')]
    operations = [
        migrations.AddField(
            model_name='customuser',
            name='timezone_name',
            field=models.CharField(default='Africa/Abidjan', max_length=64),
        ),
        migrations.RunPython(populate_timezone, migrations.RunPython.noop),
    ]
