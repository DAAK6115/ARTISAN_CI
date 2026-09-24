from rest_framework import generics, permissions, status
from rest_framework.response import Response

from appointments.models import Appointment
from .models import Notification
from .serializers import NotificationSerializer


class MesNotificationsView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            destinataire=self.request.user
        ).order_by("-date_envoi")


class MarquerCommeLuView(generics.UpdateAPIView):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def patch(self, request, *args, **kwargs):
        notif = self.get_object()
        if notif.destinataire != request.user:
            return Response(
                {"error": "Non autorisé."},
                status=status.HTTP_403_FORBIDDEN,
            )
        notif.lu = True
        notif.save(update_fields=["lu"])
        return Response(
            {"message": "Notification marquée comme lue."},
            status=status.HTTP_200_OK,
        )


class CreerNotificationAvisView(generics.CreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        rendez_vous_id = request.data.get("rendez_vous_id")
        if not rendez_vous_id:
            return Response(
                {"error": "Le champ rendez_vous_id est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rendez_vous = Appointment.objects.select_related(
                "client",
                "service__artisan",
            ).get(id=rendez_vous_id)
        except Appointment.DoesNotExist:
            return Response(
                {"error": "Rendez-vous introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Empêche un utilisateur quelconque de générer des notifications
        # pour les rendez-vous d'autres personnes.
        if (
            request.user != rendez_vous.service.artisan
            and request.user.role != "admin"
        ):
            return Response(
                {"error": "Non autorisé."},
                status=status.HTTP_403_FORBIDDEN,
            )

        titre = str(
            request.data.get("titre", "📝 Donnez votre avis")
        ).strip()[:100]
        message = str(
            request.data.get(
                "message",
                "Merci d'avoir utilisé notre service.",
            )
        ).strip()[:2000]
        lien_redirection = str(
            request.data.get("lien_redirection", "")
        ).strip()[:255]

        notification = Notification.objects.create(
            destinataire=rendez_vous.client,
            rendez_vous=rendez_vous,
            service=rendez_vous.service,
            titre=titre,
            message=message,
            lien_redirection=lien_redirection,
        )

        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
