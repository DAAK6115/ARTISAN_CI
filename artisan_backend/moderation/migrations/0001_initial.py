from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("appointments", "0006_scheduling_and_status_workflow"),
        ("payments", "0008_payment_payment_reference"),
    ]
    operations = [
        migrations.CreateModel(
            name="Report",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.CharField(choices=[("fraud", "Arnaque ou fraude"), ("inappropriate", "Contenu inapproprié"), ("fake_profile", "Faux profil"), ("harassment", "Harcèlement"), ("spam", "Spam"), ("work_quality", "Travail non conforme"), ("other", "Autre")], max_length=24)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("open", "Ouvert"), ("in_review", "En analyse"), ("resolved", "Résolu"), ("dismissed", "Classé sans suite")], db_index=True, default="open", max_length=16)),
                ("resolution_note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_reports", to=settings.AUTH_USER_MODEL)),
                ("reporter", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports_created", to=settings.AUTH_USER_MODEL)),
                ("target_user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports_received", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Dispute",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dispute_type", models.CharField(choices=[("payment", "Paiement contesté"), ("service", "Prestation contestée"), ("behavior", "Comportement"), ("other", "Autre")], max_length=16)),
                ("reason", models.TextField()),
                ("status", models.CharField(choices=[("open", "Ouvert"), ("in_review", "En analyse"), ("waiting_client", "En attente du client"), ("waiting_artisan", "En attente de l’artisan"), ("resolved", "Résolu"), ("closed", "Fermé")], db_index=True, default="open", max_length=20)),
                ("admin_resolution", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("appointment", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="disputes", to="appointments.appointment")),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_disputes", to=settings.AUTH_USER_MODEL)),
                ("opened_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="disputes_opened", to=settings.AUTH_USER_MODEL)),
                ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="disputes", to="payments.payment")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(db_index=True, max_length=80)),
                ("target_type", models.CharField(max_length=40)),
                ("target_id", models.PositiveBigIntegerField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="admin_audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="DisputeMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("is_internal", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("dispute", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="moderation.dispute")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="dispute_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddIndex(model_name="report", index=models.Index(fields=["status", "-created_at"], name="mod_report_state_idx")),
        migrations.AddIndex(model_name="report", index=models.Index(fields=["target_user", "status"], name="mod_report_target_idx")),
        migrations.AddIndex(model_name="dispute", index=models.Index(fields=["status", "-created_at"], name="mod_dispute_state_idx")),
        migrations.AddIndex(model_name="dispute", index=models.Index(fields=["appointment", "status"], name="mod_dispute_appt_idx")),
    ]
