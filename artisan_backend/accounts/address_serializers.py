from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from integrations.countries import get_country
from .models import ClientAddress, CustomUser


MAX_CLIENT_ADDRESSES = 10


def sync_primary_address(user, address):
    values = {
        "primary_address": address.address,
        "primary_latitude": address.latitude,
        "primary_longitude": address.longitude,
    }
    CustomUser.objects.filter(pk=user.pk).update(**values)
    for field_name, value in values.items():
        setattr(user, field_name, value)


def clear_primary_address(user):
    values = {
        "primary_address": "",
        "primary_latitude": None,
        "primary_longitude": None,
    }
    CustomUser.objects.filter(pk=user.pk).update(**values)
    for field_name, value in values.items():
        setattr(user, field_name, value)


class ClientAddressSerializer(serializers.ModelSerializer):
    country_code = serializers.CharField(max_length=2, required=False)
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        min_value=Decimal("-90"),
        max_value=Decimal("90"),
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        min_value=Decimal("-180"),
        max_value=Decimal("180"),
    )

    class Meta:
        model = ClientAddress
        fields = [
            "id",
            "label",
            "address",
            "city",
            "country_code",
            "latitude",
            "longitude",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_label(self, value):
        cleaned = " ".join(str(value or "").split())
        if not cleaned:
            raise serializers.ValidationError("Le nom de l’adresse est requis.")
        return cleaned

    def validate_address(self, value):
        cleaned = " ".join(str(value or "").split())
        if not cleaned:
            raise serializers.ValidationError("L’adresse est requise.")
        return cleaned

    def validate_country_code(self, value):
        country = get_country(value)
        if not country:
            raise serializers.ValidationError("Pays invalide ou momentanément indisponible.")
        return country["code"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or user.role != "client":
            raise serializers.ValidationError("Cette ressource est réservée aux comptes clients.")

        label = attrs.get("label", getattr(self.instance, "label", ""))
        duplicate = ClientAddress.objects.filter(user=user, label__iexact=label)
        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError(
                {"label": "Vous avez déjà une adresse portant ce nom."}
            )

        if self.instance and self.instance.is_default and attrs.get("is_default") is False:
            raise serializers.ValidationError(
                {"is_default": "Définissez d’abord une autre adresse comme adresse par défaut."}
            )

        if self.instance is None and ClientAddress.objects.filter(user=user).count() >= MAX_CLIENT_ADDRESSES:
            raise serializers.ValidationError(
                {"detail": f"Vous pouvez enregistrer au maximum {MAX_CLIENT_ADDRESSES} adresses."}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        user = CustomUser.objects.select_for_update().get(pk=request.user.pk)
        addresses = ClientAddress.objects.select_for_update().filter(user=user)

        if addresses.count() >= MAX_CLIENT_ADDRESSES:
            raise serializers.ValidationError(
                {"detail": f"Vous pouvez enregistrer au maximum {MAX_CLIENT_ADDRESSES} adresses."}
            )

        validated_data["country_code"] = str(
            validated_data.get("country_code") or user.country_code or "CI"
        ).upper()

        make_default = bool(validated_data.get("is_default")) or not addresses.exists()
        if make_default:
            addresses.update(is_default=False)

        address = ClientAddress.objects.create(
            user=user,
            is_default=make_default,
            **{key: value for key, value in validated_data.items() if key != "is_default"},
        )
        if address.is_default:
            sync_primary_address(user, address)
        return address

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context["request"]
        user = CustomUser.objects.select_for_update().get(pk=request.user.pk)
        locked = ClientAddress.objects.select_for_update().get(pk=instance.pk, user=user)

        if validated_data.get("is_default") is True:
            ClientAddress.objects.filter(user=user).exclude(pk=locked.pk).update(is_default=False)

        updated = super().update(locked, validated_data)
        if updated.is_default:
            sync_primary_address(user, updated)
        return updated
