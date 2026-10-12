from django.db import transaction
from rest_framework import generics

from .address_serializers import (
    ClientAddressSerializer,
    clear_primary_address,
    sync_primary_address,
)
from .models import ClientAddress, CustomUser
from .permissions import IsClient


class ClientAddressListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientAddressSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return ClientAddress.objects.filter(user=self.request.user)


class ClientAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClientAddressSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return ClientAddress.objects.filter(user=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        user = CustomUser.objects.select_for_update().get(pk=self.request.user.pk)
        locked = ClientAddress.objects.select_for_update().get(pk=instance.pk, user=user)
        was_default = locked.is_default
        locked.delete()

        if not was_default:
            return

        replacement = (
            ClientAddress.objects.select_for_update()
            .filter(user=user)
            .order_by("-updated_at", "id")
            .first()
        )
        if replacement:
            replacement.is_default = True
            replacement.save(update_fields=["is_default", "updated_at"])
            sync_primary_address(user, replacement)
        else:
            clear_primary_address(user)
