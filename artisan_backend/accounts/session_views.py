import re
from datetime import timedelta

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser


def _refresh_cookie_name() -> str:
    return getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "artisan_refresh")


def _refresh_cookie_path() -> str:
    return getattr(settings, "AUTH_REFRESH_COOKIE_PATH", "/api/accounts/session/")


def _refresh_cookie_max_age() -> int:
    lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=1))
    return max(60, int(lifetime.total_seconds()))


def _origin_is_allowed(request) -> bool:
    origin = str(request.headers.get("Origin", "")).strip()
    if not origin:
        return True

    if origin in set(getattr(settings, "CORS_ALLOWED_ORIGINS", [])):
        return True

    for pattern in getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", []):
        if re.fullmatch(pattern, origin):
            return True

    return False


def _reject_untrusted_origin(request):
    if _origin_is_allowed(request):
        return None
    return Response(
        {"error": "Origine non autorisée."},
        status=status.HTTP_403_FORBIDDEN,
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_refresh_cookie_name(),
        value=token,
        max_age=_refresh_cookie_max_age(),
        httponly=True,
        secure=getattr(settings, "AUTH_REFRESH_COOKIE_SECURE", True),
        samesite=getattr(settings, "AUTH_REFRESH_COOKIE_SAMESITE", "Lax"),
        path=_refresh_cookie_path(),
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=_refresh_cookie_name(),
        path=_refresh_cookie_path(),
        samesite=getattr(settings, "AUTH_REFRESH_COOKIE_SAMESITE", "Lax"),
    )


class ActiveUserTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        try:
            refresh = self.token_class(attrs["refresh"])
            user_id = refresh["user_id"]
        except Exception as exc:
            raise AuthenticationFailed("Session invalide.") from exc

        if not CustomUser.objects.filter(pk=user_id, is_active=True).exists():
            raise AuthenticationFailed("Session invalide.")

        return super().validate(attrs)


class BrowserSessionLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        rejected = _reject_untrusted_origin(request)
        if rejected:
            return rejected

        identifier = str(request.data.get("email", "")).strip()
        password = request.data.get("password", "")
        if not identifier or not password:
            return Response(
                {"error": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = (
            CustomUser.objects.filter(email__iexact=identifier).first()
            or CustomUser.objects.filter(username__iexact=identifier).first()
        )
        if user is None or not user.is_active or not user.check_password(password):
            return Response(
                {"error": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "username": user.username,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, str(refresh))
        response["Cache-Control"] = "no-store"
        return response


class BrowserSessionRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        rejected = _reject_untrusted_origin(request)
        if rejected:
            return rejected

        raw_refresh = request.COOKIES.get(_refresh_cookie_name(), "")
        if not raw_refresh:
            return Response(
                {"error": "Session invalide."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = ActiveUserTokenRefreshSerializer(data={"refresh": raw_refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            response = Response(
                {"error": "Session invalide."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_refresh_cookie(response)
            return response

        validated = serializer.validated_data
        access = validated.get("access")
        rotated_refresh = validated.get("refresh")
        if not access:
            response = Response(
                {"error": "Session invalide."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_refresh_cookie(response)
            return response

        response = Response({"access": access}, status=status.HTTP_200_OK)
        if rotated_refresh:
            _set_refresh_cookie(response, rotated_refresh)
        response["Cache-Control"] = "no-store"
        return response


class BrowserSessionLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        rejected = _reject_untrusted_origin(request)
        if rejected:
            return rejected

        raw_refresh = request.COOKIES.get(_refresh_cookie_name(), "")
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        response["Cache-Control"] = "no-store"
        return response
