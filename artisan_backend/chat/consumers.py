import json
import time

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from accounts.models import CustomUser
from .services import (
    can_users_chat,
    contact_ids_for_user,
    presence_connected,
    presence_disconnected,
    touch_presence,
)
from .utils import user_group_name


@database_sync_to_async
def _presence_connected(user):
    return presence_connected(user)


@database_sync_to_async
def _presence_disconnected(user):
    return presence_disconnected(user)


@database_sync_to_async
def _touch_presence(user):
    touch_presence(user)


@database_sync_to_async
def _contact_ids(user):
    return contact_ids_for_user(user)


@database_sync_to_async
def _typing_allowed(sender, receiver_id):
    receiver = CustomUser.objects.filter(id=receiver_id, is_active=True).first()
    if not receiver:
        return None
    return receiver.id if can_users_chat(sender, receiver) else None


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated or not user.is_active:
            await self.close(code=4401)
            return

        self.user = user
        self.room_group_name = user_group_name(user.id)
        self.last_typing_event = 0.0

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await _presence_connected(user)
        await self.accept()
        await self._broadcast_presence(True)

    async def disconnect(self, close_code):
        room_group_name = getattr(self, "room_group_name", None)
        user = getattr(self, "user", None)
        if room_group_name:
            await self.channel_layer.group_discard(room_group_name, self.channel_name)
        if user and user.is_authenticated:
            presence = await _presence_disconnected(user)
            if presence.connection_count == 0:
                await self._broadcast_presence(False)

    async def _broadcast_presence(self, online):
        contact_ids = await _contact_ids(self.user)
        payload = {
            "type": "presence",
            "user_id": self.user.id,
            "username": self.user.username,
            "online": bool(online),
        }
        for contact_id in contact_ids:
            await self.channel_layer.group_send(
                user_group_name(contact_id),
                {"type": "chat_event", "payload": payload},
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            return

        event_type = data.get("type")
        if event_type == "presence_ping":
            await _touch_presence(self.user)
            return

        if event_type != "typing":
            return

        now = time.monotonic()
        if now - self.last_typing_event < 0.35:
            return
        self.last_typing_event = now

        try:
            receiver_id = int(data.get("receiver_id"))
        except (TypeError, ValueError):
            return

        allowed_receiver_id = await _typing_allowed(self.user, receiver_id)
        if not allowed_receiver_id:
            return

        await self.channel_layer.group_send(
            user_group_name(allowed_receiver_id),
            {
                "type": "chat_event",
                "payload": {
                    "type": "typing",
                    "sender_id": self.user.id,
                    "sender_username": self.user.username,
                    "typing": bool(data.get("typing")),
                },
            },
        )

    async def chat_event(self, event):
        payload = event.get("payload") or {}
        await self.send(text_data=json.dumps(payload, ensure_ascii=False, default=str))
