from rest_framework import status, generics, permissions
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from appointments.models import Appointment

# ✅ Liste des notifications reçues par l'utilisateur connecté
class MesNotificationsView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user).order_by('-date_envoi')


# ✅ Marquer une notification comme lue
class MarquerCommeLuView(generics.UpdateAPIView):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def patch(self, request, *args, **kwargs):
        notif = self.get_object()
        if notif.destinataire != request.user:
            return Response({"error": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        notif.lu = True
        notif.save()
        return Response({"message": "Notification marquée comme lue"}, status=status.HTTP_200_OK)


# ✅ Créer une notification pour demander au client de donner son avis
class CreerNotificationAvisView(generics.CreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        rendez_vous_id = request.data.get('rendez_vous_id')
        titre = request.data.get('titre', '📝 Donnez votre avis')
        message = request.data.get('message', "Merci d'avoir utilisé notre service.")
        lien_redirection = request.data.get('lien_redirection', '')

        if not rendez_vous_id:
            return Response({"error": "Le champ rendez_vous_id est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rendez_vous = Appointment.objects.select_related('client', 'service__artisan').get(id=rendez_vous_id)
        except Appointment.DoesNotExist:
            return Response({"error": "Rendez-vous introuvable."}, status=status.HTTP_400_BAD_REQUEST)

        notification = Notification.objects.create(
            destinataire=rendez_vous.client,
            rendez_vous=rendez_vous,
            service=rendez_vous.service,
            titre=titre,
            message=message,
            lien_redirection=lien_redirection
        )

        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
