from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.models import CustomUser
from accounts.permissions import IsAdmin, IsClient
from appointments.models import Appointment
from certifications.models import Certification
from notifications.models import Notification
from payments.models import Payment
from services.models import Service
from support.models import Reclamation
from .models import AuditLog, Dispute, DisputeMessage, Report
from .serializers import (
    AdminUserSerializer, AuditLogSerializer, DisputeMessageSerializer,
    DisputeSerializer, ReportSerializer,
)


def _notify(user, title, message, link=None):
    Notification.objects.create(
        destinataire=user, titre=title, message=message, lien_redirection=link or ""
    )


class CreateReportView(generics.CreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report_create"

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class MyReportsView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).select_related("target_user", "assigned_to")


class CreatePaymentDisputeView(APIView):
    permission_classes = [IsClient]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "dispute_create"

    def post(self, request, payment_id):
        payment = generics.get_object_or_404(
            Payment.objects.select_related("client", "appointment__service__artisan"),
            pk=payment_id, client=request.user,
        )
        if payment.statut != "paid":
            return Response(
                {"detail": "Seul un paiement déclaré comme reçu peut être contesté."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not payment.appointment_id:
            return Response({"detail": "Ce paiement n’est lié à aucun rendez-vous."}, status=400)

        active = Dispute.objects.filter(
            payment=payment, status__in=["open", "in_review", "waiting_client", "waiting_artisan"]
        ).first()
        if active:
            return Response(
                DisputeSerializer(active, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        reason = str(request.data.get("reason", "")).strip()
        if len(reason) < 10:
            return Response(
                {"reason": ["Expliquez la contestation en au moins 10 caractères."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dispute = Dispute.objects.create(
            opened_by=request.user, appointment=payment.appointment, payment=payment,
            dispute_type="payment", reason=reason[:4000],
        )
        _notify(
            payment.appointment.service.artisan,
            "Paiement contesté par le client",
            f"Le règlement du rendez-vous #{payment.appointment_id} a été contesté.",
            "/artisan/paiements",
        )
        return Response(
            DisputeSerializer(dispute, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyDisputesView(generics.ListAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Dispute.objects.select_related(
            "opened_by", "appointment__client", "appointment__service__artisan",
            "appointment__service", "payment", "assigned_to",
        ).prefetch_related("messages__sender")
        if user.role == "admin":
            return qs
        return qs.filter(Q(opened_by=user) | Q(appointment__service__artisan=user)).distinct()


class DisputeMessageCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "dispute_message"

    def post(self, request, pk):
        dispute = generics.get_object_or_404(
            Dispute.objects.select_related("opened_by", "appointment__service__artisan"), pk=pk
        )
        user = request.user
        allowed = user.role == "admin" or user == dispute.opened_by or user == dispute.appointment.service.artisan
        if not allowed:
            return Response({"detail": "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        if dispute.status in {"resolved", "closed"}:
            return Response({"detail": "Ce litige est fermé."}, status=status.HTTP_400_BAD_REQUEST)

        body = str(request.data.get("body", "")).strip()
        if len(body) < 2:
            return Response({"body": ["Message requis."]}, status=status.HTTP_400_BAD_REQUEST)
        internal = bool(request.data.get("is_internal")) and user.role == "admin"
        message = DisputeMessage.objects.create(
            dispute=dispute, sender=user, body=body[:4000], is_internal=internal
        )
        return Response(DisputeMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        six_months_ago = (now.replace(day=1) - timedelta(days=155)).replace(day=1)
        paid_volume = Payment.objects.filter(statut="paid").aggregate(total=Sum("montant"))["total"] or Decimal("0")

        registrations_qs = (
            CustomUser.objects.filter(date_joined__gte=six_months_ago)
            .annotate(month=TruncMonth("date_joined"))
            .values("month").annotate(total=Count("id")).order_by("month")
        )
        appointments_qs = (
            Appointment.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month").annotate(total=Count("id")).order_by("month")
        )
        categories_qs = (
            Service.objects.filter(is_active=True).values("categorie")
            .annotate(total=Count("id")).order_by("-total")[:8]
        )

        return Response({
            "summary": {
                "users": CustomUser.objects.count(),
                "active_users": CustomUser.objects.filter(is_active=True).count(),
                "clients": CustomUser.objects.filter(role="client", is_active=True).count(),
                "artisans": CustomUser.objects.filter(role="artisan", is_active=True).count(),
                "pending_artisans": CustomUser.objects.filter(role="artisan", verification_status="pending", is_active=True).count(),
                "pending_certifications": Certification.objects.filter(status__in=["pending", "in_review"]).count(),
                "appointments": Appointment.objects.count(),
                "paid_volume": str(paid_volume),
                "open_reports": Report.objects.filter(status__in=["open", "in_review"]).count(),
                "open_disputes": Dispute.objects.filter(status__in=["open", "in_review", "waiting_client", "waiting_artisan"]).count(),
                "open_support": Reclamation.objects.exclude(statut__in=["resolved", "closed"]).count(),
            },
            "registrations": [
                {"month": row["month"].date().isoformat(), "total": row["total"]} for row in registrations_qs
            ],
            "appointments_by_month": [
                {"month": row["month"].date().isoformat(), "total": row["total"]} for row in appointments_qs
            ],
            "service_categories": list(categories_qs),
        })


class AdminUsersView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = CustomUser.objects.all().order_by("-date_joined")
        role = self.request.query_params.get("role")
        verification = self.request.query_params.get("verification")
        active = self.request.query_params.get("active")
        search = str(self.request.query_params.get("search", "")).strip()
        if role:
            qs = qs.filter(role=role)
        if verification:
            qs = qs.filter(verification_status=verification)
        if active in {"true", "false"}:
            qs = qs.filter(is_active=active == "true")
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
        return qs


class AdminUserActionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = generics.get_object_or_404(CustomUser, pk=pk)
        action = str(request.data.get("action", "")).strip().lower()
        note = str(request.data.get("note", "")).strip()[:2000]

        if user == request.user and action == "suspend":
            return Response({"detail": "Vous ne pouvez pas suspendre votre propre compte."}, status=400)
        if user.is_superuser and not request.user.is_superuser:
            return Response({"detail": "Seul un superutilisateur peut gérer ce compte."}, status=403)
        if user.role == "admin" and not request.user.is_superuser and action in {"suspend", "reactivate"}:
            return Response({"detail": "Seul un superutilisateur peut gérer un autre administrateur."}, status=403)

        if action == "suspend":
            user.is_active = False
            user.save(update_fields=["is_active"])
        elif action == "reactivate":
            user.is_active = True
            user.save(update_fields=["is_active"])
        elif action in {"verify", "reject"}:
            if user.role != "artisan":
                return Response({"detail": "Cette action concerne uniquement les artisans."}, status=400)
            user.verification_status = "verified" if action == "verify" else "rejected"
            user.verification_reviewed_at = timezone.now()
            user.verification_reviewed_by = request.user
            user.verification_note = note
            user.save(update_fields=[
                "verification_status", "verification_reviewed_at",
                "verification_reviewed_by", "verification_note",
            ])
            _notify(
                user,
                "Vérification du profil artisan",
                ("Votre profil artisan est maintenant vérifié." if action == "verify" else
                 "Votre demande de vérification a été refusée.") + (f" Note : {note}" if note else ""),
                "/artisan/profil",
            )
        else:
            return Response({"detail": "Action invalide."}, status=400)

        AuditLog.record(
            actor=request.user, action=f"user_{action}", target_type="user", target_id=user.pk,
            metadata={"role": user.role, "note": note},
        )
        return Response(AdminUserSerializer(user).data)


class AdminReportsView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Report.objects.select_related("reporter", "target_user", "assigned_to")
        state = self.request.query_params.get("status")
        return qs.filter(status=state) if state else qs


class AdminReportUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        report = generics.get_object_or_404(Report.objects.select_related("reporter", "target_user"), pk=pk)
        new_status = request.data.get("status", report.status)
        note = str(request.data.get("resolution_note", report.resolution_note or "")).strip()[:3000]
        if new_status not in dict(Report.STATUS_CHOICES):
            return Response({"detail": "Statut invalide."}, status=400)
        report.status = new_status
        report.resolution_note = note
        report.assigned_to = request.user
        report.resolved_at = timezone.now() if new_status in {"resolved", "dismissed"} else None
        report.save()
        AuditLog.record(request.user, "report_update", "report", report.pk, {"status": new_status})
        _notify(report.reporter, "Mise à jour de votre signalement", f"Votre signalement #{report.pk} est maintenant : {report.get_status_display()}.")
        return Response(ReportSerializer(report).data)


class AdminDisputesView(generics.ListAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Dispute.objects.select_related(
            "opened_by", "appointment__client", "appointment__service__artisan",
            "appointment__service", "payment", "assigned_to",
        ).prefetch_related("messages__sender")
        state = self.request.query_params.get("status")
        return qs.filter(status=state) if state else qs


class AdminDisputeUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        dispute = generics.get_object_or_404(
            Dispute.objects.select_related("opened_by", "appointment__client", "appointment__service__artisan"), pk=pk
        )
        new_status = request.data.get("status", dispute.status)
        resolution = str(request.data.get("admin_resolution", dispute.admin_resolution or "")).strip()[:4000]
        if new_status not in dict(Dispute.STATUS_CHOICES):
            return Response({"detail": "Statut invalide."}, status=400)
        dispute.status = new_status
        dispute.admin_resolution = resolution
        dispute.assigned_to = request.user
        dispute.resolved_at = timezone.now() if new_status in {"resolved", "closed"} else None
        dispute.save()
        AuditLog.record(request.user, "dispute_update", "dispute", dispute.pk, {"status": new_status})
        for user in {dispute.opened_by, dispute.appointment.service.artisan}:
            _notify(user, "Mise à jour d’un litige", f"Le litige #{dispute.pk} est maintenant : {dispute.get_status_display()}.")
        return Response(DisputeSerializer(dispute, context={"request": request}).data)


class AdminAuditLogsView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    queryset = AuditLog.objects.select_related("actor").all()[:200]
