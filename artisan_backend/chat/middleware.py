from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


@database_sync_to_async
def _get_user_from_access_token(raw_token):
    authenticator = JWTAuthentication()
    validated_token = authenticator.get_validated_token(raw_token)
    user = authenticator.get_user(validated_token)

    if not user.is_active:
        return AnonymousUser()

    return user


class JwtAuthMiddleware:
    """
    Authentifie les WebSockets avec le JWT d'accès.

    Le frontend transmet le token d'accès court dans ?token=...
    Le serveur n'utilise jamais le username envoyé par le client pour
    déterminer l'identité du salon.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope["user"] = AnonymousUser()

        query_string = scope.get("query_string", b"").decode("utf-8", errors="ignore")
        params = parse_qs(query_string)
        raw_token = params.get("token", [None])[0]

        if raw_token:
            try:
                scope["user"] = await _get_user_from_access_token(raw_token)
            except (InvalidToken, TokenError, Exception):
                # L'authentification échouée est traitée par le consumer,
                # qui ferme la connexion sans exposer le détail de l'erreur.
                scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
