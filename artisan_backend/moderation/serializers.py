from rest_framework import serializers

from accounts.models import CustomUser
from .models import AuditLog, Dispute, DisputeMessage, Report


class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source="reporter.username", read_only=True)
    target_username = serializers.CharField(source="target_user.username", read_only=True)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True, allow_null=True)

    class Meta:
        model = Report
        fields = [
            "id", "reporter", "reporter_username", "target_user", "target_username",
            "reason", "reason_label", "description", "status", "status_label",
            "assigned_to", "assigned_to_username", "resolution_note",
            "created_at", "updated_at", "resolved_at",
        ]
        read_only_fields = [
            "reporter", "reporter_username", "target_username", "status", "status_label",
            "assigned_to", "assigned_to_username", "resolution_note", "created_at",
            "updated_at", "resolved_at",
        ]

    def validate_target_user(self, value):
        request = self.context.get("request")
        if request and request.user == value:
            raise serializers.ValidationError("Vous ne pouvez pas vous signaler vous-même.")
        if not value.is_active:
            raise serializers.ValidationError("Ce compte n’est pas disponible.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        target = attrs.get("target_user")
        reason = attrs.get("reason")
        if request and target and Report.objects.filter(
            reporter=request.user, target_user=target, reason=reason,
            status__in=["open", "in_review"],
        ).exists():
            raise serializers.ValidationError(
                "Vous avez déjà un signalement en cours pour ce motif."
            )
        return attrs

    def validate_description(self, value):
        return str(value or "").strip()[:3000]


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = DisputeMessage
        fields = ["id", "sender", "sender_username", "sender_role", "body", "is_internal", "created_at"]
        read_only_fields = ["sender", "sender_username", "sender_role", "created_at"]


class DisputeSerializer(serializers.ModelSerializer):
    opened_by_username = serializers.CharField(source="opened_by.username", read_only=True)
    client_username = serializers.CharField(source="appointment.client.username", read_only=True)
    artisan_username = serializers.CharField(source="appointment.service.artisan.username", read_only=True)
    service_titre = serializers.CharField(source="appointment.service.titre", read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_amount = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    dispute_type_label = serializers.CharField(source="get_dispute_type_display", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True, allow_null=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            "id", "opened_by", "opened_by_username", "appointment", "payment",
            "client_username", "artisan_username", "service_titre", "payment_status",
            "payment_amount", "dispute_type", "dispute_type_label", "reason", "status",
            "status_label", "assigned_to", "assigned_to_username", "admin_resolution",
            "created_at", "updated_at", "resolved_at", "messages",
        ]
        read_only_fields = [
            "opened_by", "opened_by_username", "client_username", "artisan_username",
            "service_titre", "payment_status", "payment_amount", "status", "status_label",
            "assigned_to", "assigned_to_username", "admin_resolution", "created_at",
            "updated_at", "resolved_at", "messages",
        ]

    def get_payment_status(self, obj):
        return obj.payment.statut if obj.payment_id else None

    def get_payment_amount(self, obj):
        return obj.payment.montant if obj.payment_id else None

    def get_messages(self, obj):
        request = self.context.get("request")
        qs = obj.messages.select_related("sender")
        if not (request and request.user.is_authenticated and request.user.role == "admin"):
            qs = qs.filter(is_internal=False)
        return DisputeMessageSerializer(qs, many=True).data


class AdminUserSerializer(serializers.ModelSerializer):
    verification_status_label = serializers.CharField(source="get_verification_status_display", read_only=True)
    services_count = serializers.SerializerMethodField()
    certifications_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "role", "is_active", "date_joined", "last_login",
            "verification_status", "verification_status_label", "verification_requested_at",
            "verification_reviewed_at", "verification_note", "services_count",
            "certifications_count",
        ]
        read_only_fields = fields

    def get_services_count(self, obj):
        return obj.services.count() if obj.role == "artisan" else 0

    def get_certifications_count(self, obj):
        return obj.certifications.count() if obj.role == "artisan" else 0


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "actor_username", "action", "target_type", "target_id", "metadata", "created_at"]
        read_only_fields = fields
