from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django.core.mail import send_mail
import random
from rest_framework.permissions import AllowAny

from .models import CustomUser, PasswordResetCode
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UpdateProfileSerializer,
    UserProfileSerializer
)
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import CustomUser

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get("email")  # peut être email ou username
        password = request.data.get("password")

        user = CustomUser.objects.filter(email=login).first() or CustomUser.objects.filter(username=login).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "username": user.username,
                "role": user.role,
            })
        return Response({"error": "Identifiants invalides"}, status=401)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Compte créé avec succès"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        identifier = attrs.get("email")
        password = attrs.get("password")

        user = CustomUser.objects.filter(email=identifier).first() or \
               CustomUser.objects.filter(username=identifier).first()

        if user is None or not user.check_password(password):
            raise AuthenticationFailed("Identifiants invalides.")

        data = super().validate({"email": user.email, "password": password})
        data["role"] = user.role
        data["username"] = user.username
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profil mis à jour"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class ListArtisansView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomUser.objects.filter(role='artisan')


class ListClientsView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomUser.objects.filter(role='client')


class RequestPasswordResetView(APIView):
    def post(self, request):
        email = request.data.get("email")
        user = CustomUser.objects.filter(email=email).first()

        if not user:
            return Response({"error": "Utilisateur introuvable"}, status=404)

        code = ''.join(random.choices('0123456789', k=4))
        PasswordResetCode.objects.create(user=user, code=code)

        send_mail(
            "Réinitialisation de mot de passe",
            f"Voici votre code de réinitialisation : {code} (valable 5 minutes)",
            "noreply@tonsite.com",  # À personnaliser
            [email],
            fail_silently=False
        )

        return Response({"message": "Code envoyé à votre adresse email."})


class ConfirmPasswordResetView(APIView):
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")

        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return Response({"error": "Utilisateur introuvable"}, status=404)

        reset_code = PasswordResetCode.objects.filter(user=user, code=code).order_by('-created_at').first()
        if not reset_code:
            return Response({"error": "Code invalide"}, status=400)

        if reset_code.is_expired():
            return Response({"error": "Code expiré"}, status=400)

        user.set_password(new_password)
        user.save()

        # Supprime tous les anciens codes
        PasswordResetCode.objects.filter(user=user).delete()

        return Response({"message": "Mot de passe mis à jour avec succès."})


class ClientProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupère les informations du profil du client."""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        """Met à jour les informations du profil du client."""
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class GetUserIdByUsernameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        try:
            user = CustomUser.objects.get(username=username)
            return Response({"id": user.id})
        except CustomUser.DoesNotExist:
            return Response({"error": "Utilisateur non trouvé"}, status=404)
