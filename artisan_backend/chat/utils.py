from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def user_group_name(user_id):
    return f"chat_user_{int(user_id)}"


def send_ws_event(user_id, payload):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        user_group_name(user_id),
        {"type": "chat_event", "payload": payload},
    )


def send_ws_notification(user_or_id, message):
    user_id = getattr(user_or_id, "id", user_or_id)
    send_ws_event(user_id, {"type": "notification", "message": str(message)[:1000]})
