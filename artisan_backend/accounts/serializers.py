from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from common.validators import validate_image_upload
from .models import CustomUser


PUBLIC_ROLE_CHOICES = (
    ("client", "Client"),
    ("artisan", "Artisan"),
)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=10,
        trim_whitespace=False,
    )
    # Le rôle admin ne peut jamais être créé depuis l'API publique d'inscription.
    role = serializers.ChoiceField(choices=PUBLIC_ROLE_CHOICES)

    class Meta:
        model = CustomUser
        fields = ["id", "email", "username", "password", "role"]

    def validate_email(self, value):
        value = value.strip().lower()
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom d'utilisateur est requis.")
        if CustomUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def validate(self, attrs):
        candidate = CustomUser(
            email=attrs.get("email"),
            username=attrs.get("username"),
            role=attrs.get("role", "client"),
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "email", "username", "role", "is_active"]


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "numero_momo", "qr_wave"]

    def validate_username(self, value):
        value = value.strip()
        queryset = CustomUser.objects.filter(username__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def validate_qr_wave(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=2)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "username",
            "email",
            "role",
            "numero_momo",
            "qr_wave",
            "is_active",
        ]
        read_only_fields = ["email", "username", "role", "is_active"]
