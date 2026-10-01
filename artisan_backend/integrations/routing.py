import hashlib
import json
import logging
from typing import Iterable

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def routing_configured() -> bool:
    return bool(getattr(settings, 'OPENROUTESERVICE_API_KEY', '').strip())


def _cache_key(origin, destination, profile):
    payload = {
        'o': [round(float(origin[0]), 5), round(float(origin[1]), 5)],
        'd': [round(float(destination[0]), 5), round(float(destination[1]), 5)],
        'p': profile,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode('utf-8')).hexdigest()[:32]
    return f'ors:matrix:{digest}'


def _chunks(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def driving_route_metrics(origin, destinations: Iterable[dict], profile='driving-car') -> dict:
    """Retourne distance routière (km) et durée (minutes) depuis une origine.

    ``destinations`` contient des dictionnaires ``{"id": ..., "coordinates":
    (lat, lng)}``. L'appel fournisseur est fait côté Django pour ne jamais
    exposer la clé openrouteservice au navigateur.

    Les résultats sont mis en cache par paire origine/destination. Si le
    fournisseur est indisponible ou non configuré, un dictionnaire vide est
    renvoyé : l'appelant peut alors conserver la distance géodésique locale.
    """
    api_key = getattr(settings, 'OPENROUTESERVICE_API_KEY', '').strip()
    if not api_key or not origin:
        return {}

    normalized = []
    for item in destinations:
        try:
            lat, lng = item['coordinates']
            lat = float(lat)
            lng = float(lng)
            identifier = str(item['id'])
        except (KeyError, TypeError, ValueError):
            continue
        normalized.append({'id': identifier, 'lat': lat, 'lng': lng})

    if not normalized:
        return {}

    result = {}
    missing = []
    cache_seconds = int(getattr(settings, 'OPENROUTESERVICE_CACHE_SECONDS', 900))

    for item in normalized:
        key = _cache_key(origin, (item['lat'], item['lng']), profile)
        cached = cache.get(key)
        if cached is not None:
            result[item['id']] = cached
        else:
            item['cache_key'] = key
            missing.append(item)

    if not missing:
        return result

    base_url = getattr(
        settings,
        'OPENROUTESERVICE_BASE_URL',
        'https://api.heigit.org/openrouteservice',
    ).rstrip('/')
    timeout = float(getattr(settings, 'OPENROUTESERVICE_TIMEOUT_SECONDS', 6))
    max_destinations = max(1, int(getattr(settings, 'OPENROUTESERVICE_MATRIX_MAX_DESTINATIONS', 100)))
    endpoint = f'{base_url}/v2/matrix/{profile}'

    # ORS attend les coordonnées dans l'ordre longitude, latitude.
    origin_lng_lat = [float(origin[1]), float(origin[0])]

    for batch in _chunks(missing, max_destinations):
        locations = [origin_lng_lat] + [[item['lng'], item['lat']] for item in batch]
        payload = {
            'locations': locations,
            'sources': ['0'],
            'destinations': [str(index) for index in range(1, len(locations))],
            'metrics': ['distance', 'duration'],
            'units': 'km',
        }

        try:
            response = requests.post(
                endpoint,
                headers={
                    'Authorization': api_key,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            body = response.json()
            distances = (body.get('distances') or [[]])[0]
            durations = (body.get('durations') or [[]])[0]
        except (requests.RequestException, ValueError, TypeError, IndexError) as exc:
            logger.warning('openrouteservice matrix indisponible: %s', exc)
            continue

        for index, item in enumerate(batch):
            try:
                distance = distances[index]
                duration = durations[index]
                if distance is None or duration is None:
                    continue
                metric = {
                    'distance_km': round(float(distance), 2),
                    'duration_minutes': max(1, int(round(float(duration) / 60))),
                }
            except (IndexError, TypeError, ValueError):
                continue

            result[item['id']] = metric
            cache.set(item['cache_key'], metric, cache_seconds)

    return result


def driving_route_geometry(origin, destination, profile='driving-car') -> dict:
    """Retourne la géométrie GeoJSON et le résumé d'un trajet routier.

    La clé openrouteservice reste côté backend. ``origin`` et ``destination``
    sont fournis sous la forme ``(latitude, longitude)``. Un dictionnaire vide
    est renvoyé quand le fournisseur n'est pas configuré ou indisponible.
    """
    api_key = getattr(settings, 'OPENROUTESERVICE_API_KEY', '').strip()
    if not api_key or not origin or not destination:
        return {}

    try:
        origin_lat, origin_lng = float(origin[0]), float(origin[1])
        destination_lat, destination_lng = float(destination[0]), float(destination[1])
    except (TypeError, ValueError, IndexError):
        return {}

    payload_key = {
        'o': [round(origin_lat, 5), round(origin_lng, 5)],
        'd': [round(destination_lat, 5), round(destination_lng, 5)],
        'p': profile,
        'kind': 'geometry',
    }
    digest = hashlib.sha256(json.dumps(payload_key, sort_keys=True).encode('utf-8')).hexdigest()[:32]
    cache_key = f'ors:directions:{digest}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    base_url = getattr(
        settings,
        'OPENROUTESERVICE_BASE_URL',
        'https://api.heigit.org/openrouteservice',
    ).rstrip('/')
    timeout = float(getattr(settings, 'OPENROUTESERVICE_TIMEOUT_SECONDS', 6))
    cache_seconds = int(getattr(settings, 'OPENROUTESERVICE_CACHE_SECONDS', 900))
    endpoint = f'{base_url}/v2/directions/{profile}/geojson'

    try:
        response = requests.post(
            endpoint,
            headers={
                'Authorization': api_key,
                'Accept': 'application/geo+json, application/json',
                'Content-Type': 'application/json',
            },
            json={
                'coordinates': [
                    [origin_lng, origin_lat],
                    [destination_lng, destination_lat],
                ],
                'instructions': False,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        body = response.json()
        feature = (body.get('features') or [None])[0]
        if not feature or not feature.get('geometry'):
            return {}
        summary = (feature.get('properties') or {}).get('summary') or {}
        distance_meters = summary.get('distance')
        duration_seconds = summary.get('duration')
        result = {
            'geometry': feature['geometry'],
            'distance_km': round(float(distance_meters) / 1000, 2) if distance_meters is not None else None,
            'duration_minutes': max(1, int(round(float(duration_seconds) / 60))) if duration_seconds is not None else None,
            'profile': profile,
        }
    except (requests.RequestException, ValueError, TypeError, IndexError, KeyError) as exc:
        logger.warning('openrouteservice directions indisponible: %s', exc)
        return {}

    cache.set(cache_key, result, cache_seconds)
    return result


def driving_isochrone(origin, minutes, profile='driving-car') -> dict:
    """Retourne la zone GeoJSON accessible en voiture depuis ``origin``.

    ``origin`` est fourni sous la forme ``(latitude, longitude)`` et ``minutes``
    représente le temps de trajet maximal. La réponse du fournisseur est mise
    en cache afin que les auto-refreshs de la marketplace ne consomment pas le
    quota openrouteservice inutilement.
    """
    api_key = getattr(settings, 'OPENROUTESERVICE_API_KEY', '').strip()
    if not api_key or not origin:
        return {}

    try:
        origin_lat, origin_lng = float(origin[0]), float(origin[1])
        minutes_value = int(minutes)
    except (TypeError, ValueError, IndexError):
        return {}

    if not (-90 <= origin_lat <= 90 and -180 <= origin_lng <= 180):
        return {}
    if minutes_value <= 0 or minutes_value > 120:
        return {}

    payload_key = {
        'o': [round(origin_lat, 5), round(origin_lng, 5)],
        'm': minutes_value,
        'p': profile,
        'kind': 'isochrone',
    }
    digest = hashlib.sha256(json.dumps(payload_key, sort_keys=True).encode('utf-8')).hexdigest()[:32]
    cache_key = f'ors:isochrone:{digest}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    base_url = getattr(
        settings,
        'OPENROUTESERVICE_BASE_URL',
        'https://api.heigit.org/openrouteservice',
    ).rstrip('/')
    timeout = float(getattr(settings, 'OPENROUTESERVICE_TIMEOUT_SECONDS', 6))
    cache_seconds = int(getattr(settings, 'OPENROUTESERVICE_CACHE_SECONDS', 900))
    endpoint = f'{base_url}/v2/isochrones/{profile}'

    try:
        response = requests.post(
            endpoint,
            headers={
                'Authorization': api_key,
                'Accept': 'application/geo+json, application/json',
                'Content-Type': 'application/json',
            },
            json={
                'locations': [[origin_lng, origin_lat]],
                'range': [minutes_value * 60],
                'range_type': 'time',
            },
            timeout=timeout,
        )
        response.raise_for_status()
        body = response.json()
        feature = (body.get('features') or [None])[0]
        geometry = feature.get('geometry') if feature else None
        if not geometry or geometry.get('type') not in {'Polygon', 'MultiPolygon'}:
            return {}

        result = {
            'geometry': geometry,
            'travel_time_minutes': minutes_value,
            'profile': profile,
        }
    except (requests.RequestException, ValueError, TypeError, IndexError, KeyError) as exc:
        logger.warning('openrouteservice isochrone indisponible: %s', exc)
        return {}

    cache.set(cache_key, result, cache_seconds)
    return result
