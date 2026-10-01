import ipaddress
import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def _base_url():
    return getattr(settings, 'GEOJS_BASE_URL', 'https://get.geojs.io').rstrip('/')


def _timeout():
    return float(getattr(settings, 'GEOJS_TIMEOUT_SECONDS', 5))


def _cache_seconds():
    return int(getattr(settings, 'GEOJS_CACHE_SECONDS', 3600))


def normalize_public_ip(value):
    raw = str(value or '').strip()
    if not raw:
        return None
    try:
        parsed = ipaddress.ip_address(raw)
    except ValueError:
        return None
    if parsed.is_private or parsed.is_loopback or parsed.is_reserved or parsed.is_unspecified or parsed.is_multicast:
        return None
    return parsed.compressed


def request_client_ip(request):
    candidates = []
    if getattr(settings, 'GEOJS_TRUST_PROXY_HEADERS', False):
        candidates.extend([
            request.META.get('HTTP_CF_CONNECTING_IP'),
            request.META.get('HTTP_X_REAL_IP'),
        ])
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded:
            candidates.extend(part.strip() for part in forwarded.split(','))
    candidates.append(request.META.get('REMOTE_ADDR'))

    for candidate in candidates:
        normalized = normalize_public_ip(candidate)
        if normalized:
            return normalized
    return None


def approximate_location(ip_address=None, allow_self_lookup=False):
    normalized_ip = normalize_public_ip(ip_address)
    if not normalized_ip and not allow_self_lookup:
        return None

    cache_key = f'geojs:approx:{normalized_ip or "self"}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    endpoint = f'{_base_url()}/v1/ip/geo/{normalized_ip}.json' if normalized_ip else f'{_base_url()}/v1/ip/geo.json'
    try:
        response = requests.get(endpoint, headers={'Accept': 'application/json'}, timeout=_timeout())
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError) as exc:
        logger.warning('GeoJS indisponible pour la localisation approximative: %s', exc)
        return None

    try:
        latitude = float(payload.get('latitude'))
        longitude = float(payload.get('longitude'))
    except (TypeError, ValueError):
        return None

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None

    try:
        accuracy_km = int(float(payload.get('accuracy') or 0)) or None
    except (TypeError, ValueError):
        accuracy_km = None

    city = str(payload.get('city') or '').strip()
    region = str(payload.get('region') or '').strip()
    country = str(payload.get('country') or '').strip()
    parts = []
    for value in (city, region, country):
        if value and value not in parts:
            parts.append(value)
    label = ', '.join(parts) or 'Zone approximative'

    recommended_radius = max(25, min(100, accuracy_km or 25))
    result = {
        'latitude': round(latitude, 6),
        'longitude': round(longitude, 6),
        'city': city,
        'region': region,
        'country': country,
        'country_code': str(payload.get('country_code') or '').upper(),
        'timezone': str(payload.get('timezone') or ''),
        'accuracy_km': accuracy_km,
        'recommended_radius_km': recommended_radius,
        'label': label,
        'source': 'ip',
        'approximate': True,
    }
    cache.set(cache_key, result, _cache_seconds())
    return result
