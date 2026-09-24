from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

from .services import consume_websocket_ticket


@database_sync_to_async
def _consume_ticket(raw_ticket):
    return consume_websocket_ticket(raw_ticket)


class WebSocketTicketAuthMiddleware:
    """Authentification WS avec un ticket court, aléatoire et à usage unique."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope["user"] = AnonymousUser()

        query_string = scope.get("query_string", b"").decode("utf-8", errors="ignore")
        raw_ticket = parse_qs(query_string).get("ticket", [None])[0]
        if raw_ticket:
            try:
                user = await _consume_ticket(raw_ticket)
                if user:
                    scope["user"] = user
            except Exception:
                scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
