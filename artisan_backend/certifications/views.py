from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsArtisan
from notifications.models import Notification
from moderation.models import AuditLog
from .models import Certification
from .serializers import CertificationSerializer


class AddCertificationView(generics.CreateAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [IsArtisan]

    def perform_create(self, serializer):
        serializer.save(artisan=self.request.user, status="pending")


class MyCertificationsView(generics.ListAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [IsArtisan]

    def get_queryset(self):
        return Certification.objects.filter(artisan=self.request.user)


class PublicCertificationsView(generics.ListAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        username = self.kwargs.get("username")
        return Certification.objects.filter(
            artisan__username=username,
            artisan__is_active=True,
            status="verified",
        )


class UpdateCertificationView(generics.RetrieveUpdateAPIView):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [IsArtisan]

    def perform_update(self, serializer):
        certification = serializer.instance
        if self.request.user != certification.artisan:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres certifications.")
        serializer.save(
            status="pending", reviewed_by=None, reviewed_at=None, review_note=""
        )


class DeleteCertificationView(generics.DestroyAPIView):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [IsArtisan]

    def get_object(self):
        certification = super().get_object()
        if certification.artisan != self.request.user:
            raise PermissionDenied("Non autorisé.")
        return certification


class AdminCertificationListView(generics.ListAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = Certification.objects.select_related("artisan", "reviewed_by")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class AdminCertificationReviewView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        certification = generics.get_object_or_404(
            Certification.objects.select_related("artisan"), pk=pk
        )
        action = str(request.data.get("action", "")).strip().lower()
        note = str(request.data.get("note", "")).strip()[:2000]
        if action not in {"review", "verify", "reject"}:
            return Response(
                {"detail": "Action invalide."}, status=status.HTTP_400_BAD_REQUEST
            )

        certification.status = {
            "review": "in_review",
            "verify": "verified",
            "reject": "rejected",
        }[action]
        certification.reviewed_by = request.user
        certification.reviewed_at = timezone.now()
        certification.review_note = note
        certification.save(update_fields=[
            "status", "reviewed_by", "reviewed_at", "review_note"
        ])

        title = "Certification vérifiée" if action == "verify" else (
            "Certification refusée" if action == "reject" else "Certification en cours de vérification"
        )
        Notification.objects.create(
            destinataire=certification.artisan,
            titre=title,
            message=(
                f"Votre certification « {certification.nom} » est maintenant : "
                f"{certification.get_status_display()}."
                + (f" Note : {note}" if note else "")
            ),
            lien_redirection="/artisan/certifications",
        )

        AuditLog.record(
            actor=request.user,
            action=f"certification_{action}",
            target_type="certification",
            target_id=certification.pk,
            metadata={"status": certification.status, "note": note},
        )

        return Response(CertificationSerializer(certification, context={"request": request}).data)
