import hashlib
import json
import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def _base_url():
    return getattr(
        settings,
        'NOMINATIM_BASE_URL',
        'https://nominatim.openstreetmap.org',
    ).rstrip('/')


def _headers():
    return {
        'Accept': 'application/json',
        'User-Agent': getattr(settings, 'NOMINATIM_USER_AGENT', 'ARTISAN_CI/1.0'),
    }


def _timeout():
    return float(getattr(settings, 'NOMINATIM_TIMEOUT_SECONDS', 6))


def _cache_seconds():
    return int(getattr(settings, 'NOMINATIM_CACHE_SECONDS', 86400))


def _digest(prefix, payload):
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode('utf-8')
    return f'nominatim:{prefix}:{hashlib.sha256(raw).hexdigest()[:32]}'


def _concise_label(payload):
    address = payload.get('address') or {}
    road = address.get('road') or address.get('pedestrian') or address.get('residential')
    locality = (
        address.get('neighbourhood')
        or address.get('suburb')
        or address.get('quarter')
        or address.get('city_district')
        or address.get('borough')
    )
    city = (
        address.get('city')
        or address.get('town')
        or address.get('village')
        or address.get('municipality')
        or address.get('county')
    )
    state = address.get('state')
    country = address.get('country')
    pieces = []
    for value in (road, locality, city, state, country):
        if value and value not in pieces:
            pieces.append(value)
    return ', '.join(pieces) or payload.get('display_name') or ''


def _normalize_result(payload):
    try:
        latitude = float(payload.get('lat'))
        longitude = float(payload.get('lon'))
    except (TypeError, ValueError):
        return None

    label = _concise_label(payload)
    if not label:
        return None

    return {
        'id': str(payload.get('place_id') or f'{latitude:.6f},{longitude:.6f}'),
        'label': label,
        'display_name': payload.get('display_name') or label,
        'latitude': round(latitude, 6),
        'longitude': round(longitude, 6),
        'type': payload.get('type') or '',
        'category': payload.get('category') or payload.get('class') or '',
        'address': payload.get('address') or {},
    }


def search_addresses(query, limit=6, country_codes=None, language='fr'):
    query = str(query or '').strip()
    if len(query) < 3:
        return []

    limit = min(max(int(limit or 6), 1), 8)
    country_codes = [str(code).strip().lower() for code in (country_codes or []) if str(code).strip()]
    key_payload = {
        'query': query.casefold(),
        'limit': limit,
        'country_codes': country_codes,
        'language': language,
    }
    cache_key = _digest('search', key_payload)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        'format': 'jsonv2',
        'q': query,
        'addressdetails': 1,
        'limit': limit,
        'dedupe': 1,
        'accept-language': language,
    }
    if country_codes:
        params['countrycodes'] = ','.join(country_codes)

    try:
        response = requests.get(
            f'{_base_url()}/search',
            params=params,
            headers=_headers(),
            timeout=_timeout(),
        )
        response.raise_for_status()
        body = response.json()
    except (requests.RequestException, ValueError, TypeError) as exc:
        logger.warning('Nominatim search indisponible: %s', exc)
        return []

    results = []
    for item in body if isinstance(body, list) else []:
        normalized = _normalize_result(item)
        if normalized:
            results.append(normalized)

    cache.set(cache_key, results, _cache_seconds())
    return results


def reverse_address(latitude, longitude, language='fr'):
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return None

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None

    cache_key = _digest('reverse', {
        'lat': round(latitude, 5),
        'lng': round(longitude, 5),
        'language': language,
    })
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f'{_base_url()}/reverse',
            params={
                'format': 'jsonv2',
                'lat': latitude,
                'lon': longitude,
                'zoom': 18,
                'addressdetails': 1,
                'accept-language': language,
            },
            headers=_headers(),
            timeout=_timeout(),
        )
        response.raise_for_status()
        body = response.json()
    except (requests.RequestException, ValueError, TypeError) as exc:
        logger.warning('Nominatim reverse indisponible: %s', exc)
        return None

    result = _normalize_result(body)
    cache.set(cache_key, result, _cache_seconds())
    return result
