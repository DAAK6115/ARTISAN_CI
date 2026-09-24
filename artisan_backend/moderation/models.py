from django.conf import settings
from django.db import models
from django.utils import timezone

from appointments.models import Appointment
from payments.models import Payment


class Report(models.Model):
    REASON_CHOICES = [
        ("fraud", "Arnaque ou fraude"),
        ("inappropriate", "Contenu inapproprié"),
        ("fake_profile", "Faux profil"),
        ("harassment", "Harcèlement"),
        ("spam", "Spam"),
        ("work_quality", "Travail non conforme"),
        ("other", "Autre"),
    ]
    STATUS_CHOICES = [
        ("open", "Ouvert"),
        ("in_review", "En analyse"),
        ("resolved", "Résolu"),
        ("dismissed", "Classé sans suite"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_created"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_received"
    )
    reason = models.CharField(max_length=24, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="open", db_index=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="assigned_reports",
    )
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="mod_report_state_idx"),
            models.Index(fields=["target_user", "status"], name="mod_report_target_idx"),
        ]

    def __str__(self):
        return f"Signalement #{self.pk} - {self.target_user.username}"


class Dispute(models.Model):
    TYPE_CHOICES = [
        ("payment", "Paiement contesté"),
        ("service", "Prestation contestée"),
        ("behavior", "Comportement"),
        ("other", "Autre"),
    ]
    STATUS_CHOICES = [
        ("open", "Ouvert"),
        ("in_review", "En analyse"),
        ("waiting_client", "En attente du client"),
        ("waiting_artisan", "En attente de l’artisan"),
        ("resolved", "Résolu"),
        ("closed", "Fermé"),
    ]

    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="disputes_opened"
    )
    appointment = models.ForeignKey(
        Appointment, on_delete=models.PROTECT, related_name="disputes"
    )
    payment = models.ForeignKey(
        Payment, on_delete=models.PROTECT, blank=True, null=True, related_name="disputes"
    )
    dispute_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open", db_index=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="assigned_disputes",
    )
    admin_resolution = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="mod_dispute_state_idx"),
            models.Index(fields=["appointment", "status"], name="mod_dispute_appt_idx"),
        ]

    @property
    def artisan(self):
        return self.appointment.service.artisan

    def __str__(self):
        return f"Litige #{self.pk} - RDV {self.appointment_id}"


class DisputeMessage(models.Model):
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dispute_messages"
    )
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message litige #{self.dispute_id} par {self.sender.username}"


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="admin_audit_logs",
    )
    action = models.CharField(max_length=80, db_index=True)
    target_type = models.CharField(max_length=40)
    target_id = models.PositiveBigIntegerField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def record(cls, actor, action, target_type, target_id=None, metadata=None):
        return cls.objects.create(
            actor=actor, action=action, target_type=target_type, target_id=target_id,
            metadata=metadata or {},
        )

    def __str__(self):
        return f"{self.action} - {self.target_type}#{self.target_id or '-'}"
