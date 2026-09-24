from django.conf import settings
from django.db import migrations, models
import uuid
import django.db.models.deletion
import django.core.validators
from decimal import Decimal


def generate_quote_reference():
    return f"DEV-{uuid.uuid4().hex[:12].upper()}"


def map_legacy_statuses(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')
    Payment.objects.filter(statut='en_attente').update(statut='pending')
    Payment.objects.filter(statut='valide').update(statut='paid')
    Payment.objects.filter(statut='echoue').update(statut='failed')
    Payment.objects.filter(methode_paiement='espèces').update(methode_paiement='cash')
    Payment.objects.filter(methode_paiement__isnull=True).update(methode_paiement='cash')
    Payment.objects.filter(methode_paiement='').update(methode_paiement='cash')
    Payment.objects.filter(montant_initial__isnull=True).update(montant_initial=models.F('montant'))
    Payment.objects.filter(reduction__isnull=True).update(reduction=0)
    for payment in Payment.objects.filter(models.Q(transaction_id__isnull=True) | models.Q(transaction_id='')):
        payment.transaction_id = 'LEGACY' + uuid.uuid4().hex[:20].upper()
        payment.save(update_fields=['transaction_id'])


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('appointments', '0006_scheduling_and_status_workflow'),
        ('payments', '0005_alter_payment_methode_paiement'),
        ('services', '0005_service_pricing_fields'),
    ]

    operations = [
        migrations.RunPython(map_legacy_statuses, migrations.RunPython.noop),
        migrations.CreateModel(
            name='Quote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference', models.CharField(default=generate_quote_reference, editable=False, max_length=24, unique=True)),
                ('status', models.CharField(choices=[('draft', 'Brouillon'), ('sent', 'Envoyé'), ('accepted', 'Accepté'), ('rejected', 'Refusé'), ('expired', 'Expiré'), ('cancelled', 'Annulé')], db_index=True, default='draft', max_length=16)),
                ('notes', models.TextField(blank=True)),
                ('valid_until', models.DateTimeField(blank=True, null=True)),
                ('deposit_percent', models.PositiveSmallIntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('subtotal', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('rejected_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('appointment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quotes', to='appointments.appointment')),
                ('artisan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quotes_sent', to=settings.AUTH_USER_MODEL)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quotes_received', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='QuoteLine',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.CharField(max_length=180)),
                ('quantity', models.DecimalField(decimal_places=2, default=1, max_digits=8, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0)])),
                ('position', models.PositiveSmallIntegerField(default=0)),
                ('quote', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lines', to='payments.quote')),
            ],
            options={'ordering': ['position', 'id']},
        ),
        migrations.AlterField(
            model_name='payment',
            name='statut',
            field=models.CharField(choices=[('pending', 'En attente'), ('processing', 'En traitement'), ('paid', 'Payé'), ('failed', 'Échoué'), ('cancelled', 'Annulé'), ('refunded', 'Remboursé')], db_index=True, default='pending', max_length=16),
        ),
        migrations.AlterField(
            model_name='payment',
            name='methode_paiement',
            field=models.CharField(choices=[('wave', 'Wave'), ('orange_money', 'Orange Money'), ('moov_money', 'Moov Money'), ('mtn_money', 'MTN Money'), ('cash', 'Espèces')], max_length=24),
        ),
        migrations.AlterField(model_name='payment', name='montant', field=models.DecimalField(decimal_places=2, max_digits=12)),
        migrations.AlterField(model_name='payment', name='montant_initial', field=models.DecimalField(decimal_places=2, max_digits=12)),
        migrations.AlterField(model_name='payment', name='reduction', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AlterField(model_name='payment', name='appointment', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='payments', to='appointments.appointment')),
        migrations.AlterField(model_name='payment', name='service', field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='payments', to='services.service')),
        migrations.AlterField(model_name='payment', name='client', field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to=settings.AUTH_USER_MODEL)),
        migrations.AlterField(model_name='payment', name='transaction_id', field=models.CharField(db_index=True, max_length=64, unique=True)),
        migrations.AddField(model_name='payment', name='currency', field=models.CharField(default='XOF', max_length=3)),
        migrations.AddField(model_name='payment', name='payment_type', field=models.CharField(choices=[('full', 'Paiement total'), ('deposit', 'Acompte'), ('balance', 'Solde')], default='full', max_length=12)),
        migrations.AddField(model_name='payment', name='provider', field=models.CharField(choices=[('cinetpay', 'CinetPay'), ('mock', 'Simulation locale'), ('cash', 'Espèces')], default='cash', max_length=16)),
        migrations.AddField(model_name='payment', name='provider_reference', field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name='payment', name='provider_status', field=models.CharField(blank=True, max_length=64)),
        migrations.AddField(model_name='payment', name='payment_url', field=models.URLField(blank=True, max_length=1000)),
        migrations.AddField(model_name='payment', name='idempotency_key', field=models.CharField(default='', max_length=64)),
        migrations.AddField(model_name='payment', name='provider_payload', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='payment', name='paid_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='payment', name='failed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='payment', name='updated_at', field=models.DateTimeField(auto_now=True)),
        migrations.AddField(model_name='payment', name='refund_status', field=models.CharField(choices=[('none', 'Aucun'), ('requested', 'Demandé'), ('processed', 'Traité'), ('rejected', 'Refusé')], default='none', max_length=16)),
        migrations.AddField(model_name='payment', name='refund_amount', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AddField(model_name='payment', name='refund_reason', field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name='payment', name='refunded_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='payment', name='quote', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='payments.quote')),
        migrations.RunSQL(
            "UPDATE payments_payment SET idempotency_key = 'legacy-' || id WHERE idempotency_key = '' OR idempotency_key IS NULL;",
            migrations.RunSQL.noop,
        ),
        migrations.AlterField(model_name='payment', name='idempotency_key', field=models.CharField(max_length=64, unique=True)),
        migrations.AddConstraint(
            model_name='quote',
            constraint=models.UniqueConstraint(condition=models.Q(status='accepted'), fields=('appointment',), name='uniq_accepted_quote_per_appointment'),
        ),
        migrations.AddIndex(model_name='quote', index=models.Index(fields=['artisan', 'status'], name='pay_quote_art_status_idx')),
        migrations.AddIndex(model_name='quote', index=models.Index(fields=['client', 'status'], name='pay_quote_cli_status_idx')),
        migrations.AddIndex(model_name='payment', index=models.Index(fields=['client', 'statut'], name='pay_client_status_idx')),
        migrations.AddIndex(model_name='payment', index=models.Index(fields=['appointment', 'statut'], name='pay_appt_status_idx')),
    ]
