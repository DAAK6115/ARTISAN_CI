import logging
import re

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_CACHE_KEY = 'artisan_ci:reference:countries:v1'
_FALLBACK_COUNTRIES = [
    {
        'code': 'CI',
        'name': "Côte d’Ivoire",
        'dial_code': '+225',
        'currency': 'XOF',
        'flag': '🇨🇮',
    }
]


def _flag_emoji(code):
    code = str(code or '').upper()
    if len(code) != 2 or not code.isalpha():
        return ''
    return ''.join(chr(127397 + ord(char)) for char in code)


def _clean_dial_code(value):
    value = re.sub(r'\s+', '', str(value or '').strip())
    return value if value.startswith('+') else f'+{value}' if value else ''


def _from_restcountries_v5():
    api_key = str(getattr(settings, 'RESTCOUNTRIES_API_KEY', '') or '').strip()
    if not api_key:
        return []

    url = f"{settings.RESTCOUNTRIES_V5_BASE_URL.rstrip('/')}/countries/v5"
    countries = []
    offset = 0
    while True:
        response = requests.get(
            url,
            params={
                'limit': 100,
                'offset': offset,
                'response_fields': 'names.common,codes.alpha_2,currencies,calling_codes,flag.emoji',
            },
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=settings.COUNTRY_REFERENCE_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        objects = payload.get('data', {}).get('objects', []) if isinstance(payload, dict) else []
        if not objects:
            break
        for item in objects:
            code = str(item.get('codes', {}).get('alpha_2') or '').upper()
            if len(code) != 2:
                continue
            currencies = item.get('currencies') or {}
            currency = next(iter(currencies.keys()), '') if isinstance(currencies, dict) else ''
            calling = item.get('calling_codes') or []
            dial_code = _clean_dial_code(calling[0] if calling else '')
            name = item.get('names', {}).get('common') or code
            flag = item.get('flag', {}).get('emoji') or _flag_emoji(code)
            countries.append({'code': code, 'name': name, 'dial_code': dial_code, 'currency': currency, 'flag': flag})
        if len(objects) < 100:
            break
        offset += 100
    return countries


def _from_restcountries_legacy():
    response = requests.get(
        settings.RESTCOUNTRIES_LEGACY_URL,
        params={'fields': 'name,cca2,currencies,idd,flag'},
        timeout=settings.COUNTRY_REFERENCE_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, list):
        return []

    countries = []
    for item in payload:
        code = str(item.get('cca2') or '').upper()
        if len(code) != 2:
            continue
        currencies = item.get('currencies') or {}
        currency = next(iter(currencies.keys()), '') if isinstance(currencies, dict) else ''
        idd = item.get('idd') or {}
        root = str(idd.get('root') or '')
        suffixes = idd.get('suffixes') or []
        dial_code = _clean_dial_code(f'{root}{suffixes[0]}' if root and suffixes else root)
        countries.append({
            'code': code,
            'name': (item.get('name') or {}).get('common') or code,
            'dial_code': dial_code,
            'currency': str(currency or '').upper(),
            'flag': item.get('flag') or _flag_emoji(code),
        })
    return countries


def _from_countriesnow():
    base_url = settings.COUNTRIESNOW_BASE_URL.rstrip('/')
    codes_response = requests.get(
        f'{base_url}/api/v0.1/countries/codes',
        timeout=settings.COUNTRY_REFERENCE_TIMEOUT_SECONDS,
    )
    currency_response = requests.get(
        f'{base_url}/api/v0.1/countries/currency',
        timeout=settings.COUNTRY_REFERENCE_TIMEOUT_SECONDS,
    )
    codes_response.raise_for_status()
    currency_response.raise_for_status()
    codes_payload = codes_response.json().get('data', [])
    currencies_payload = currency_response.json().get('data', [])

    currencies = {}
    names = {}
    for item in currencies_payload:
        code = str(item.get('iso2') or '').upper()
        if len(code) == 2:
            currencies[code] = str(item.get('currency') or '').upper()
            names[code] = item.get('name') or code

    countries = []
    for item in codes_payload:
        code = str(item.get('code') or '').upper()
        if code == 'EL':
            code = 'GR'
        if len(code) != 2:
            continue
        countries.append({
            'code': code,
            'name': names.get(code) or item.get('name') or code,
            'dial_code': _clean_dial_code(item.get('dial_code')),
            'currency': currencies.get(code, ''),
            'flag': _flag_emoji(code),
        })
    return countries


def get_countries(*, force=False):
    if not force:
        cached = cache.get(_CACHE_KEY)
        if cached:
            return cached

    providers = (_from_restcountries_v5, _from_restcountries_legacy, _from_countriesnow)
    for provider in providers:
        try:
            countries = provider()
            countries = [item for item in countries if item.get('code') and item.get('dial_code')]
            if countries:
                unique = {}
                for item in countries:
                    code = item['code']
                    current = unique.get(code)
                    if current is None or (not current.get('currency') and item.get('currency')):
                        unique[code] = item
                countries = sorted(unique.values(), key=lambda item: (item.get('name') or item['code']).casefold())
                cache.set(_CACHE_KEY, countries, settings.COUNTRY_REFERENCE_CACHE_SECONDS)
                return countries
        except Exception:
            logger.warning('Fournisseur de pays indisponible: %s', provider.__name__, exc_info=True)

    return list(_FALLBACK_COUNTRIES)


def get_country(code):
    normalized = str(code or '').strip().upper()
    if len(normalized) != 2:
        return None
    return next((item for item in get_countries() if item['code'] == normalized), None)
