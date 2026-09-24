from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from notifications.models import Notification
from moderation.models import AuditLog
from .models import Reclamation
from .serializers import ReclamationSerializer


class EnvoyerReclamationView(generics.CreateAPIView):
    serializer_class = ReclamationSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "support_create"

    def perform_create(self, serializer):
        serializer.save(client=self.request.user, priorite="normal")


class MesReclamationsView(generics.ListAPIView):
    serializer_class = ReclamationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reclamation.objects.filter(client=self.request.user)


class AdminReclamationsView(generics.ListAPIView):
    serializer_class = ReclamationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Reclamation.objects.select_related("client", "assigned_to")
        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        if status_filter:
            qs = qs.filter(statut=status_filter)
        if priority:
            qs = qs.filter(priorite=priority)
        return qs


class AdminReclamationUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        ticket = generics.get_object_or_404(Reclamation.objects.select_related("client"), pk=pk)
        new_status = request.data.get("statut", ticket.statut)
        priority = request.data.get("priorite", ticket.priorite)
        response_text = str(request.data.get("admin_response", ticket.admin_response or "")).strip()[:4000]

        if new_status not in dict(Reclamation.STATUS_CHOICES):
            return Response({"detail": "Statut invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if priority not in dict(Reclamation.PRIORITY_CHOICES):
            return Response({"detail": "Priorité invalide."}, status=status.HTTP_400_BAD_REQUEST)

        ticket.statut = new_status
        ticket.priorite = priority
        ticket.admin_response = response_text
        ticket.assigned_to = request.user
        ticket.closed_at = timezone.now() if new_status in {"resolved", "closed"} else None
        ticket.save()

        Notification.objects.create(
            destinataire=ticket.client,
            titre="Mise à jour de votre demande support",
            message=f"Votre demande « {ticket.objet} » est maintenant : {ticket.get_statut_display()}.",
            lien_redirection=(
                "/artisan/support" if ticket.client.role == "artisan" else "/client/support"
            ),
        )
        AuditLog.record(
            actor=request.user, action="support_update", target_type="support",
            target_id=ticket.pk, metadata={"status": new_status, "priority": priority},
        )
        return Response(ReclamationSerializer(ticket).data)
