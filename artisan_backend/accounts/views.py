import logging
import secrets

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import CustomUser, PasswordResetCode
from .permissions import IsArtisanOrAdmin
from .serializers import (
    RegisterSerializer,
    UpdateProfileSerializer,
    UserProfileSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

GENERIC_RESET_MESSAGE = (
    "Si cette adresse email correspond à un compte, "
    "un code de réinitialisation a été envoyé."
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
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

        # Réponse volontairement identique pour compte inconnu / mot de passe faux / compte suspendu.
        if (
            user is None
            or not user.is_active
            or not user.check_password(password)
        ):
            return Response(
                {"error": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "username": user.username,
                "role": user.role,
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Compte créé avec succès."},
            status=status.HTTP_201_CREATED,
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        identifier = attrs.get("email", "")
        password = attrs.get("password", "")

        user = (
            CustomUser.objects.filter(email__iexact=identifier).first()
            or CustomUser.objects.filter(username__iexact=identifier).first()
        )

        if (
            user is None
            or not user.is_active
            or not user.check_password(password)
        ):
            raise AuthenticationFailed("Identifiants invalides.")

        data = super().validate({"email": user.email, "password": password})
        data["role"] = user.role
        data["username"] = user.username
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class SecureTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        try:
            refresh = self.token_class(attrs["refresh"])
            user_id = refresh["user_id"]
        except Exception:
            raise AuthenticationFailed("Jeton de rafraîchissement invalide.")

        user = CustomUser.objects.filter(pk=user_id, is_active=True).first()
        if not user:
            raise AuthenticationFailed("Jeton de rafraîchissement invalide.")

        return super().validate(attrs)


class SecureTokenRefreshView(TokenRefreshView):
    serializer_class = SecureTokenRefreshSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Profil mis à jour."})


class ListArtisansView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomUser.objects.filter(role="artisan", is_active=True)


class ListClientsView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsArtisanOrAdmin]

    def get_queryset(self):
        return CustomUser.objects.filter(role="client", is_active=True)


class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()

        # Même réponse dans tous les cas afin d'empêcher l'énumération des comptes.
        user = CustomUser.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response({"message": GENERIC_RESET_MESSAGE})

        # Un seul code actif à la fois.
        PasswordResetCode.objects.filter(user=user, used_at__isnull=True).delete()

        code = f"{secrets.randbelow(1_000_000):06d}"
        reset_code = PasswordResetCode.objects.create(user=user, code=code)

        try:
            send_mail(
                subject="Réinitialisation de votre mot de passe ARTISAN_CI",
                message=(
                    f"Votre code de réinitialisation est : {code}\n"
                    "Il est valable pendant 5 minutes.\n"
                    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            # Le code ne doit pas rester valable si l'email n'a pas pu être envoyé.
            reset_code.delete()
            logger.exception("Échec d'envoi de l'email de réinitialisation.")
            # Ne pas révéler la panne SMTP ni l'existence du compte au client.

        return Response({"message": GENERIC_RESET_MESSAGE})


class ConfirmPasswordResetView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        code = str(request.data.get("code", "")).strip()
        new_password = request.data.get("new_password", "")

        # Réponse volontairement générique pour ne pas révéler l'existence du compte.
        user = CustomUser.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response(
                {"error": "Code invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_code = (
            PasswordResetCode.objects.filter(user=user, used_at__isnull=True)
            .order_by("-created_at")
            .first()
        )

        if (
            reset_code is None
            or not reset_code.is_usable()
            or not secrets.compare_digest(reset_code.code, code)
        ):
            if reset_code and reset_code.is_usable():
                reset_code.register_failed_attempt()
            return Response(
                {"error": "Code invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        reset_code.mark_used()
        PasswordResetCode.objects.filter(
            user=user,
            used_at__isnull=True,
        ).exclude(pk=reset_code.pk).delete()

        return Response({"message": "Mot de passe mis à jour avec succès."})


class ClientProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def put(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GetUserIdByUsernameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        user = CustomUser.objects.filter(
            username=username,
            is_active=True,
        ).only("id").first()
        if not user:
            return Response(
                {"error": "Utilisateur non trouvé."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"id": user.id})
