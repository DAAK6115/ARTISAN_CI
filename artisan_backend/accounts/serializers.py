from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from common.validators import validate_image_upload
from integrations.countries import get_country
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
        fields = ["id", "email", "username", "password", "role", "country_code"]

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

    def validate_country_code(self, value):
        country = get_country(value)
        if not country:
            raise serializers.ValidationError("Pays invalide ou momentanément indisponible.")
        self._validated_country = country
        return country["code"]

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
        country = getattr(self, "_validated_country", None) or get_country(validated_data.get("country_code", "CI"))
        if country:
            validated_data["country_code"] = country["code"]
            validated_data["country_calling_code"] = country["dial_code"]
            validated_data["currency_code"] = country.get("currency") or "XOF"
        return CustomUser.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "id", "email", "username", "role", "is_active",
            "verification_status", "verification_requested_at",
            "verification_reviewed_at", "verification_note",
            "country_code", "country_calling_code", "currency_code",
        ]


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "numero_momo", "qr_wave", "country_code", "country_calling_code", "currency_code"]
        read_only_fields = ["country_calling_code", "currency_code"]

    def validate_username(self, value):
        value = value.strip()
        queryset = CustomUser.objects.filter(username__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def validate_country_code(self, value):
        country = get_country(value)
        if not country:
            raise serializers.ValidationError("Pays invalide ou momentanément indisponible.")
        self._validated_country = country
        return country["code"]

    def update(self, instance, validated_data):
        country = getattr(self, "_validated_country", None)
        if country:
            validated_data["country_code"] = country["code"]
            validated_data["country_calling_code"] = country["dial_code"]
            validated_data["currency_code"] = country.get("currency") or instance.currency_code
        return super().update(instance, validated_data)

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
            "verification_status",
            "verification_requested_at",
            "verification_reviewed_at",
            "verification_note",
            "country_code",
            "country_calling_code",
            "currency_code",
        ]
        read_only_fields = [
            "email", "username", "role", "is_active",
            "verification_status", "verification_requested_at",
            "verification_reviewed_at", "verification_note",
            "country_calling_code", "currency_code",
        ]
