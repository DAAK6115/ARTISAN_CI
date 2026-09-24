import hashlib
import secrets
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from appointments.models import Appointment
from accounts.models import CustomUser
from .models import ChatBlock, ChatPresence, Message, WebSocketTicket


TICKET_LIFETIME_SECONDS = 45


def _hash_ticket(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def issue_websocket_ticket(user):
    raw = secrets.token_urlsafe(32)
    now = timezone.now()
    WebSocketTicket.objects.filter(expires_at__lt=now).delete()
    WebSocketTicket.objects.create(
        user=user,
        token_hash=_hash_ticket(raw),
        expires_at=now + timedelta(seconds=TICKET_LIFETIME_SECONDS),
    )
    return raw


@transaction.atomic
def consume_websocket_ticket(raw_token: str):
    if not raw_token:
        return None
    ticket = (
        WebSocketTicket.objects.select_for_update()
        .select_related("user")
        .filter(token_hash=_hash_ticket(raw_token))
        .first()
    )
    if not ticket:
        return None
    user = ticket.user
    valid = ticket.expires_at >= timezone.now() and user.is_active
    ticket.delete()
    return user if valid else None


def users_are_blocked(user_a, user_b) -> bool:
    return ChatBlock.objects.filter(
        Q(blocker=user_a, blocked=user_b) | Q(blocker=user_b, blocked=user_a)
    ).exists()


def can_users_chat(sender, receiver) -> bool:
    if not sender or not receiver or sender.pk == receiver.pk:
        return False
    if not sender.is_active or not receiver.is_active:
        return False
    if users_are_blocked(sender, receiver):
        return False

    roles = {sender.role, receiver.role}
    if roles != {"client", "artisan"}:
        return sender.role == "admin"

    # Le client peut contacter un artisan depuis la marketplace.
    if sender.role == "client":
        return receiver.role == "artisan"

    # Un artisan peut contacter un client seulement s'il existe déjà une
    # relation métier ou une conversation initiée par ce client.
    has_conversation = Message.objects.filter(
        Q(sender=receiver, receiver=sender) | Q(sender=sender, receiver=receiver)
    ).exists()
    if has_conversation:
        return True

    return Appointment.objects.filter(
        client=receiver,
        service__artisan=sender,
    ).exists()


@transaction.atomic
def presence_connected(user):
    presence, _ = ChatPresence.objects.select_for_update().get_or_create(user=user)
    presence.connection_count += 1
    presence.last_seen_at = timezone.now()
    presence.save(update_fields=["connection_count", "last_seen_at"])
    return presence


@transaction.atomic
def presence_disconnected(user):
    presence, _ = ChatPresence.objects.select_for_update().get_or_create(user=user)
    presence.connection_count = max(0, presence.connection_count - 1)
    presence.last_seen_at = timezone.now()
    presence.save(update_fields=["connection_count", "last_seen_at"])
    return presence


def touch_presence(user):
    ChatPresence.objects.update_or_create(
        user=user,
        defaults={"last_seen_at": timezone.now()},
    )


def contact_ids_for_user(user):
    pairs = Message.objects.filter(
        Q(sender=user) | Q(receiver=user)
    ).values_list("sender_id", "receiver_id")
    result = set()
    for sender_id, receiver_id in pairs:
        if sender_id != user.id:
            result.add(sender_id)
        if receiver_id != user.id:
            result.add(receiver_id)
    return list(result)


def online_snapshot(user_ids):
    cutoff = timezone.now() - timedelta(seconds=90)
    rows = ChatPresence.objects.filter(user_id__in=user_ids)
    return {
        row.user_id: {
            "online": row.connection_count > 0 and row.last_seen_at >= cutoff,
            "last_seen_at": row.last_seen_at,
        }
        for row in rows
    }
