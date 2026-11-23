# Validation IANA des fuseaux ; aucune heure locale naive ne doit devenir un instant contractuel.
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers


def validate_iana_timezone(value):
    name = str(value or '').strip()
    if not name or len(name) > 64 or name.startswith('/') or '..' in name or '\\' in name:
        raise serializers.ValidationError('Fuseau horaire IANA invalide.')
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        raise serializers.ValidationError('Fuseau horaire IANA inconnu.')
    return name


def local_datetime(value, timezone_name):
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError('Un instant de réservation doit contenir un fuseau horaire.')
    return value.astimezone(ZoneInfo(validate_iana_timezone(timezone_name)))


def to_utc(value):
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError('Un instant UTC doit être timezone-aware.')
    return value.astimezone(dt_timezone.utc)
