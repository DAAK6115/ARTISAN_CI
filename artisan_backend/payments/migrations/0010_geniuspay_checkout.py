from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0009_sync_model_state'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='statut',
            field=models.CharField(
                choices=[
                    ('unpaid', 'Non payé (legacy/manuellement)'),
                    ('pending', 'En attente'),
                    ('processing', 'En cours'),
                    ('paid', 'Payé'),
                    ('failed', 'Échoué'),
                    ('cancelled', 'Annulé'),
                    ('expired', 'Expiré'),
                    ('refunded', 'Remboursé'),
                ],
                db_index=True,
                default='pending',
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name='payment',
            name='payment_reference',
            field=models.CharField(
                blank=True,
                help_text='Référence externe GeniusPay ou référence de règlement manuel.',
                max_length=100,
            ),
        ),
        migrations.AddField(model_name='payment', name='provider', field=models.CharField(choices=[('manual', 'Manuel'), ('geniuspay', 'GeniusPay')], db_index=True, default='manual', max_length=24)),
        migrations.AddField(model_name='payment', name='provider_reference', field=models.CharField(blank=True, db_index=True, max_length=100)),
        migrations.AddField(model_name='payment', name='provider_status', field=models.CharField(blank=True, max_length=32)),
        migrations.AddField(model_name='payment', name='checkout_url', field=models.URLField(blank=True, max_length=600)),
        migrations.AddField(model_name='payment', name='provider_payload', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='payment', name='initiated_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='payment', name='confirmed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='payment', name='failed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddIndex(model_name='payment', index=models.Index(fields=['provider', 'provider_status'], name='pay_provider_state_idx')),
        migrations.CreateModel(
            name='PaymentAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider_reference', models.CharField(max_length=100, unique=True)),
                ('status', models.CharField(db_index=True, default='pending', max_length=32)),
                ('gateway', models.CharField(blank=True, max_length=32)),
                ('checkout_url', models.URLField(blank=True, max_length=600)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('payment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='payments.payment')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddIndex(model_name='paymentattempt', index=models.Index(fields=['payment', 'status'], name='pay_attempt_state_idx')),
        migrations.CreateModel(
            name='PaymentGatewayEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.CharField(max_length=120, unique=True)),
                ('event_type', models.CharField(db_index=True, max_length=64)),
                ('provider_reference', models.CharField(blank=True, db_index=True, max_length=100)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('processed_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-processed_at']},
        ),
    ]
