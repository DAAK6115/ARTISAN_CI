from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0007_manual_post_service_payments'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='payment_reference',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
