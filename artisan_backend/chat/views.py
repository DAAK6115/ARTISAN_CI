from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CustomUser
from common.validators import validate_audio_upload, validate_chat_media
from notifications.models import Notification
from .models import Message
from .serializers import MessageSerializer
from .utils import send_ws_notification


MAX_MESSAGE_LENGTH = 5000


class MarkMessageAsReadView(generics.UpdateAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        message = self.get_object()

        if message.receiver != request.user:
            raise PermissionDenied(
                "Vous ne pouvez marquer comme lu que les messages que vous avez reçus."
            )

        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response(self.get_serializer(message).data)


class UpdateMessageView(generics.UpdateAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender != request.user:
            raise PermissionDenied(
                "Vous ne pouvez modifier que vos propres messages."
            )
        if message.is_read:
            raise PermissionDenied(
                "Vous ne pouvez pas modifier un message déjà lu."
            )

        content = str(request.data.get("content", "")).strip()
        if not content:
            return Response(
                {"detail": "Le nouveau contenu est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(content) > MAX_MESSAGE_LENGTH:
            return Response(
                {"detail": "Le message est trop long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message.content = content
        message.save(update_fields=["content"])
        return Response(self.get_serializer(message).data)


class ContactListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        pairs = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).values_list("sender", "receiver")

        unique_contact_ids = set()
        for sender_id, receiver_id in pairs:
            if sender_id != user.id:
                unique_contact_ids.add(sender_id)
            if receiver_id != user.id:
                unique_contact_ids.add(receiver_id)

        contacts = CustomUser.objects.filter(
            id__in=unique_contact_ids,
            is_active=True,
        )

        # Email conservé pour compatibilité avec l'interface existante.
        data = [
            {"username": contact.username, "email": contact.email}
            for contact in contacts
        ]
        return Response(data)


class DeleteMessageView(generics.DestroyAPIView):
    queryset = Message.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender != request.user:
            raise PermissionDenied(
                "Vous ne pouvez supprimer que vos propres messages."
            )

        message.delete()
        return Response({"detail": "Message supprimé avec succès."})


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        contact_id = self.kwargs["contact_id"]

        contact = CustomUser.objects.filter(
            id=contact_id,
            is_active=True,
        ).first()
        if not contact:
            raise NotFound("Utilisateur introuvable.")

        if contact.id == user.id:
            return Message.objects.none()

        # Toujours contraindre la lecture aux messages dont l'utilisateur
        # connecté est effectivement expéditeur ou destinataire.
        return Message.objects.filter(
            Q(sender=user, receiver=contact)
            | Q(sender=contact, receiver=user)
        ).order_by("timestamp")


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        sender = request.user
        receiver_id = request.data.get("receiver")
        content = str(request.data.get("content", "")).strip()
        media = request.FILES.get("media")
        audio = request.FILES.get("audio")

        if len(content) > MAX_MESSAGE_LENGTH:
            return Response(
                {"detail": "Le message est trop long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        receiver = CustomUser.objects.filter(
            id=receiver_id,
            is_active=True,
        ).first()
        if not receiver:
            return Response(
                {"detail": "Destinataire introuvable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if receiver == sender:
            return Response(
                {"detail": "Vous ne pouvez pas vous envoyer un message à vous-même."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Un artisan ne peut répondre qu'à un client qui a déjà initié l'échange.
        if sender.role == "artisan":
            has_conversation = Message.objects.filter(
                sender=receiver,
                receiver=sender,
            ).exists()
            if not has_conversation:
                raise PermissionDenied(
                    "Vous ne pouvez pas initier une conversation avec ce client."
                )

        if not content and not media and not audio:
            return Response(
                {"detail": "Message vide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if media:
                validate_chat_media(media, max_mb=20)
            if audio:
                validate_audio_upload(audio, max_mb=10)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.messages[0] if exc.messages else "Fichier invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
            media=media,
            audio=audio,
        )

        Notification.objects.create(
            destinataire=receiver,
            titre="Nouveau message",
            message=f"💬 Nouveau message de {sender.username}",
        )
        send_ws_notification(
            receiver.username,
            f"💬 Nouveau message de {sender.username}",
        )

        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
