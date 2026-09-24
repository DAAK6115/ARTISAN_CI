from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


def generate_payment_reference():
    return f"PAY-{uuid.uuid4().hex[:16].upper()}"


def migrate_payment_declarations(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')

    # L'ancien Sprint 4 pouvait considérer un paiement comme réussi sans
    # déclaration explicite de l'artisan. On ne conserve donc aucun ancien
    # statut comme preuve de règlement : chaque prestation devra être
    # revalidée par son artisan dans le nouveau workflow.
    Payment.objects.all().update(
        statut='unpaid',
        methode_paiement=None,
        paid_at=None,
        declared_by=None,
        declared_at=None,
        notes='Statut à revalider par l’artisan après migration.',
    )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('payments', '0006_payment_workflow_and_quotes'),
        ('services', '0006_remove_service_acompte'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='quote',
            name='deposit_percent',
        ),
        migrations.AddField(
            model_name='payment',
            name='declared_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='declared_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='payment_declarations',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='notes',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
        # Autoriser NULL avant de remettre à zéro les anciennes méthodes.
        migrations.AlterField(
            model_name='payment',
            name='methode_paiement',
            field=models.CharField(
                blank=True,
                choices=[
                    ('wave', 'Wave'),
                    ('orange_money', 'Orange Money'),
                    ('moov_money', 'Moov Money'),
                    ('mtn_money', 'MTN Money'),
                    ('cash', 'Espèces'),
                    ('bank_transfer', 'Virement bancaire'),
                    ('other', 'Autre'),
                ],
                max_length=24,
                null=True,
            ),
        ),
        migrations.RunPython(migrate_payment_declarations, migrations.RunPython.noop),
        migrations.RemoveField(model_name='payment', name='payment_type'),
        migrations.RemoveField(model_name='payment', name='provider'),
        migrations.RemoveField(model_name='payment', name='provider_reference'),
        migrations.RemoveField(model_name='payment', name='provider_status'),
        migrations.RemoveField(model_name='payment', name='payment_url'),
        migrations.RemoveField(model_name='payment', name='idempotency_key'),
        migrations.RemoveField(model_name='payment', name='provider_payload'),
        migrations.RemoveField(model_name='payment', name='failed_at'),
        migrations.RemoveField(model_name='payment', name='refund_status'),
        migrations.RemoveField(model_name='payment', name='refund_amount'),
        migrations.RemoveField(model_name='payment', name='refund_reason'),
        migrations.RemoveField(model_name='payment', name='refunded_at'),
        migrations.AlterField(
            model_name='payment',
            name='statut',
            field=models.CharField(
                choices=[('unpaid', 'Non payé'), ('paid', 'Payé')],
                db_index=True,
                default='unpaid',
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name='payment',
            name='transaction_id',
            field=models.CharField(
                db_index=True,
                default=generate_payment_reference,
                max_length=64,
                unique=True,
            ),
        ),
    ]
