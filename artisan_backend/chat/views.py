from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from accounts.models import CustomUser
from common.validators import validate_audio_upload, validate_chat_media
from notifications.models import Notification
from .models import ChatBlock, Message
from .serializers import MessageSerializer
from .services import (
    can_users_chat,
    issue_websocket_ticket,
    online_snapshot,
    users_are_blocked,
)
from .utils import send_ws_event, send_ws_notification

MAX_MESSAGE_LENGTH = 5000


class ChatMessageThrottle(UserRateThrottle):
    scope = "chat_message"


class WebSocketTicketThrottle(UserRateThrottle):
    scope = "ws_ticket"


class WebSocketTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [WebSocketTicketThrottle]

    def post(self, request):
        return Response({"ticket": issue_websocket_ticket(request.user)})


class ContactListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        messages = Message.objects.filter(Q(sender=user) | Q(receiver=user)).select_related("sender", "receiver")
        contact_ids = set()
        for sender_id, receiver_id in messages.values_list("sender_id", "receiver_id"):
            if sender_id != user.id:
                contact_ids.add(sender_id)
            if receiver_id != user.id:
                contact_ids.add(receiver_id)

        contacts = list(CustomUser.objects.filter(id__in=contact_ids, is_active=True).order_by("username"))
        presence = online_snapshot([c.id for c in contacts])
        data = []
        for contact in contacts:
            conversation = messages.filter(
                Q(sender=user, receiver=contact) | Q(sender=contact, receiver=user)
            )
            last = conversation.order_by("-timestamp", "-id").first()
            unread = conversation.filter(sender=contact, receiver=user, is_read=False).count()
            snapshot = presence.get(contact.id, {})
            data.append({
                "id": contact.id,
                "username": contact.username,
                "role": contact.role,
                "unread_count": unread,
                "last_message": (
                    "Message supprimé" if last and last.deleted_at
                    else ((last.content or "Pièce jointe")[:100] if last else "")
                ),
                "last_message_at": last.timestamp if last else None,
                "online": bool(snapshot.get("online")),
                "last_seen_at": snapshot.get("last_seen_at"),
                "blocked_by_me": ChatBlock.objects.filter(blocker=user, blocked=contact).exists(),
            })
        data.sort(
            key=lambda x: (
                x["last_message_at"] is not None,
                x["last_message_at"] or timezone.now(),
            ),
            reverse=True,
        )
        return Response(data)


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _contact(self):
        contact = CustomUser.objects.filter(id=self.kwargs["contact_id"], is_active=True).first()
        if not contact:
            raise NotFound("Utilisateur introuvable.")
        if contact.id == self.request.user.id:
            raise PermissionDenied("Conversation invalide.")
        return contact

    def get_queryset(self):
        contact = self._contact()
        user = self.request.user
        return Message.objects.select_related("sender", "receiver", "reply_to__sender").filter(
            Q(sender=user, receiver=contact) | Q(sender=contact, receiver=user)
        ).order_by("timestamp", "id")

    def list(self, request, *args, **kwargs):
        contact = self._contact()
        now = timezone.now()
        delivered_ids = list(
            Message.objects.filter(
                sender=contact,
                receiver=request.user,
                delivered_at__isnull=True,
            ).values_list("id", flat=True)
        )
        if delivered_ids:
            Message.objects.filter(id__in=delivered_ids).update(delivered_at=now)
            send_ws_event(contact.id, {
                "type": "delivered",
                "message_ids": delivered_ids,
                "by_user_id": request.user.id,
            })
        return super().list(request, *args, **kwargs)


class MarkConversationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, contact_id):
        contact = CustomUser.objects.filter(id=contact_id, is_active=True).first()
        if not contact:
            raise NotFound("Utilisateur introuvable.")
        now = timezone.now()
        ids = list(Message.objects.filter(
            sender=contact,
            receiver=request.user,
            is_read=False,
        ).values_list("id", flat=True))
        if ids:
            Message.objects.filter(id__in=ids).update(
                is_read=True,
                read_at=now,
                delivered_at=now,
            )
            send_ws_event(contact.id, {
                "type": "read",
                "message_ids": ids,
                "by_user_id": request.user.id,
            })
        return Response({"read": len(ids)})


class MarkMessageAsReadView(generics.UpdateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filtrer dès la requête évite de révéler l'existence d'un message
        # appartenant à une autre conversation via un 403 différenciable.
        return Message.objects.filter(receiver=self.request.user)

    def patch(self, request, *args, **kwargs):
        message = self.get_object()
        now = timezone.now()
        message.is_read = True
        message.read_at = now
        message.delivered_at = message.delivered_at or now
        message.save(update_fields=["is_read", "read_at", "delivered_at"])
        send_ws_event(message.sender_id, {"type": "read", "message_ids": [message.id]})
        return Response(self.get_serializer(message).data)


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ChatMessageThrottle]

    def post(self, request, *args, **kwargs):
        sender = request.user
        receiver = CustomUser.objects.filter(id=request.data.get("receiver"), is_active=True).first()
        if not receiver:
            return Response({"detail": "Destinataire introuvable."}, status=status.HTTP_400_BAD_REQUEST)
        if not can_users_chat(sender, receiver):
            raise PermissionDenied("Cette conversation n'est pas autorisée.")

        content = str(request.data.get("content", "")).strip()
        if len(content) > MAX_MESSAGE_LENGTH:
            return Response({"detail": "Le message est trop long."}, status=status.HTTP_400_BAD_REQUEST)

        media = request.FILES.get("media")
        audio = request.FILES.get("audio")
        try:
            if media:
                validate_chat_media(media, max_mb=20)
            if audio:
                validate_audio_upload(audio, max_mb=10)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0] if exc.messages else "Fichier invalide."}, status=400)

        reply_to = None
        reply_id = request.data.get("reply_to")
        if reply_id:
            reply_to = Message.objects.filter(id=reply_id).filter(
                Q(sender=sender, receiver=receiver) | Q(sender=receiver, receiver=sender)
            ).first()
            if not reply_to:
                return Response({"detail": "Message de réponse invalide."}, status=400)

        location_lat = location_lng = None
        if request.data.get("location_lat") not in (None, "") or request.data.get("location_lng") not in (None, ""):
            try:
                location_lat = Decimal(str(request.data.get("location_lat")))
                location_lng = Decimal(str(request.data.get("location_lng")))
            except (InvalidOperation, TypeError):
                return Response({"detail": "Coordonnées invalides."}, status=400)
            if not (-90 <= location_lat <= 90 and -180 <= location_lng <= 180):
                return Response({"detail": "Coordonnées hors limites."}, status=400)

        if not content and not media and not audio and location_lat is None:
            return Response({"detail": "Message vide."}, status=400)

        message = Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
            media=media,
            audio=audio,
            reply_to=reply_to,
            location_lat=location_lat,
            location_lng=location_lng,
        )

        Notification.objects.create(
            destinataire=receiver,
            titre="Nouveau message",
            message=f"Nouveau message de {sender.username}",
        )
        send_ws_event(receiver.id, {
            "type": "new_message",
            "message_id": message.id,
            "sender_id": sender.id,
            "sender_username": sender.username,
        })

        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UpdateMessageView(generics.UpdateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user)

    def patch(self, request, *args, **kwargs):
        message = self.get_object()
        if message.deleted_at:
            return Response({"detail": "Ce message a été supprimé."}, status=400)
        content = str(request.data.get("content", "")).strip()
        if not content or len(content) > MAX_MESSAGE_LENGTH:
            return Response({"detail": "Contenu invalide."}, status=400)
        message.content = content
        message.edited_at = timezone.now()
        message.save(update_fields=["content", "edited_at"])
        send_ws_event(message.receiver_id, {"type": "message_updated", "message_id": message.id})
        return Response(self.get_serializer(message).data)


class DeleteMessageView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user)

    def delete(self, request, *args, **kwargs):
        message = self.get_object()
        if not message.deleted_at:
            if message.media:
                message.media.delete(save=False)
            if message.audio:
                message.audio.delete(save=False)
            message.deleted_at = timezone.now()
            message.content = ""
            message.media = None
            message.audio = None
            message.location_lat = None
            message.location_lng = None
            message.save(update_fields=["deleted_at", "content", "media", "audio", "location_lat", "location_lng"])
            send_ws_event(message.receiver_id, {"type": "message_deleted", "message_id": message.id})
        return Response({"detail": "Message supprimé."})


class ToggleBlockView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        target = CustomUser.objects.filter(id=user_id, is_active=True).first()
        if not target or target == request.user:
            return Response({"detail": "Utilisateur invalide."}, status=400)
        block, created = ChatBlock.objects.get_or_create(blocker=request.user, blocked=target)
        if not created:
            block.delete()
        return Response({"blocked": created})


class ConversationAccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        target = CustomUser.objects.filter(id=user_id, is_active=True).first()
        if not target:
            raise NotFound("Utilisateur introuvable.")
        return Response({
            "allowed": can_users_chat(request.user, target),
            "blocked": users_are_blocked(request.user, target),
            "blocked_by_me": ChatBlock.objects.filter(blocker=request.user, blocked=target).exists(),
        })
