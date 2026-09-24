from django.db import migrations, models
import payments.models


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0008_payment_payment_reference"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="payment",
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AlterField(
            model_name="quote",
            name="reference",
            field=models.CharField(
                default=payments.models.generate_quote_reference,
                editable=False,
                max_length=24,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="payment",
            name="transaction_id",
            field=models.CharField(
                db_index=True,
                default=payments.models.generate_payment_reference,
                max_length=64,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="payment",
            name="payment_reference",
            field=models.CharField(
                blank=True,
                help_text="Référence fournie par l’artisan (Wave, Orange Money, virement, etc.).",
                max_length=100,
            ),
        ),
    ]
