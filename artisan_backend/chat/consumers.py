import json

from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.is_authenticated or not user.is_active:
            await self.close(code=4401)
            return

        self.username = user.username
        self.room_group_name = f"chat_{self.username}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        room_group_name = getattr(self, "room_group_name", None)
        if room_group_name:
            await self.channel_layer.group_discard(
                room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        # Les messages applicatifs sont persistés via l'API HTTP authentifiée.
        # Le WebSocket sert uniquement à notifier le client d'un changement.
        # On ignore donc tout payload client arbitraire.
        return None

    async def chat_message(self, event):
        message = str(event.get("message", ""))[:1000]
        await self.send(
            text_data=json.dumps(
                {"message": message},
                ensure_ascii=False,
            )
        )
