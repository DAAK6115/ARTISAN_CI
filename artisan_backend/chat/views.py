from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .utils import send_ws_notification
from .models import Message
from .serializers import MessageSerializer
from appointments.models import Appointment
from payments.models import Payment
from accounts.models import CustomUser
from rest_framework.exceptions import PermissionDenied, NotFound
from .models import Message
from rest_framework.views import APIView
from django.db.models import Q
from .models import Message
from accounts.models import CustomUser
from rest_framework.permissions import IsAuthenticated
from notifications.models import Notification

class MarkMessageAsReadView(generics.UpdateAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        try:
            message = self.get_object()
        except Message.DoesNotExist:
            raise NotFound("Message introuvable.")

        # Vérifie que l'utilisateur est bien le destinataire
        if message.receiver != request.user:
            raise PermissionDenied("Vous ne pouvez marquer comme lu que les messages que vous avez reçus.")

        # Met à jour le message
        message.is_read = True
        message.save()
        serializer = self.get_serializer(message)
        return Response(serializer.data)

class UpdateMessageView(generics.UpdateAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        try:
            message = self.get_object()
        except Message.DoesNotExist:
            raise NotFound("Message introuvable.")

        # Vérifie que c’est bien l’expéditeur et que le message n’a pas encore été lu
        if message.sender != request.user:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres messages.")
        if message.is_read:
            raise PermissionDenied("Vous ne pouvez pas modifier un message déjà lu.")

        # Met à jour le contenu
        content = request.data.get('content')
        if not content:
            raise PermissionDenied("Le nouveau contenu est requis.")
        message.content = content
        message.save()
        serializer = self.get_serializer(message)
        return Response(serializer.data)


class ContactListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Rechercher tous les IDs des personnes avec qui l'utilisateur a déjà échangé
        contact_ids = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).values_list('sender', 'receiver')

        # Extraire les IDs sans doublons et sans le sien
        unique_contact_ids = set()
        for sender_id, receiver_id in contact_ids:
            if sender_id != user.id:
                unique_contact_ids.add(sender_id)
            if receiver_id != user.id:
                unique_contact_ids.add(receiver_id)

        # Récupérer les utilisateurs
        contacts = CustomUser.objects.filter(id__in=unique_contact_ids)

        # Format de la réponse
        data = [
            {"username": contact.username, "email": contact.email}
            for contact in contacts
        ]

        return Response(data)


class DeleteMessageView(generics.DestroyAPIView):
    queryset = Message.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        try:
            message = self.get_object()
        except Message.DoesNotExist:
            raise NotFound("Message introuvable.")

        # Vérifie que c’est bien l’expéditeur
        if message.sender != request.user:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres messages.")

        message.delete()
        return Response({"detail": "Message supprimé avec succès."})


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        contact_id = self.kwargs['contact_id']

        # Vérifie que le contact existe
        try:
            contact = CustomUser.objects.get(id=contact_id)
        except CustomUser.DoesNotExist:
            raise PermissionDenied("Utilisateur introuvable.")

        # Vérifie si la sécurité doit être contournée
        force_access = self.request.query_params.get('force') == 'true'

        if not force_access:
            # Vérifie s’il y a une relation via un rendez-vous ou un paiement
            # has_rdv = Appointment.objects.filter(client=user, service__artisan=contact).exists() or \
            #          Appointment.objects.filter(client=contact, service__artisan=user).exists()

           # has_payment = Payment.objects.filter(client=user, service__artisan=contact).exists() or \
                          Payment.objects.filter(client=contact, service__artisan=user).exists()

            #if not has_rdv and not has_payment:
             #   raise PermissionDenied("Vous ne pouvez discuter qu’avec un utilisateur avec qui vous avez interagi.")

        # Récupère les messages échangés entre user et contact
        return Message.objects.filter(
            sender__id__in=[user.id, contact_id],
            receiver__id__in=[user.id, contact_id]
        ).order_by('timestamp')

    


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        sender = request.user
        receiver_id = request.data.get('receiver')
        content = request.data.get('content', '').strip()
        media = request.FILES.get('media')
        audio = request.FILES.get('audio')

        # Vérification du destinataire
        try:
            receiver = CustomUser.objects.get(id=receiver_id)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Destinataire introuvable."}, status=status.HTTP_400_BAD_REQUEST)

        if sender.role == 'artisan':
            has_conversation = Message.objects.filter(sender=receiver, receiver=sender).exists()
            if not has_conversation:
                raise PermissionDenied("Vous ne pouvez pas initier une conversation avec ce client.")

        # Ne rien envoyer si vide
        if not content and not media and not audio:
            return Response({"detail": "Message vide."}, status=status.HTTP_400_BAD_REQUEST)

        # Création du message
        message = Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
            media=media,
            audio=audio
        )

        Notification.objects.create(
            destinataire=receiver,
            titre="Nouveau message",
            message=f"💬 Nouveau message de {sender.username}"
        )
        send_ws_notification(receiver.username, f"💬 Nouveau message de {sender.username}")

        return Response(MessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)
