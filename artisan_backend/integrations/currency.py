import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

PRIMARY_TEMPLATE = getattr(
    settings,
    'CURRENCY_API_PRIMARY_TEMPLATE',
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.min.json',
)
FALLBACK_TEMPLATE = getattr(
    settings,
    'CURRENCY_API_FALLBACK_TEMPLATE',
    'https://latest.currency-api.pages.dev/v1/currencies/{base}.min.json',
)
TIMEOUT_SECONDS = int(getattr(settings, 'CURRENCY_API_TIMEOUT_SECONDS', 5))
CACHE_SECONDS = int(getattr(settings, 'CURRENCY_API_CACHE_SECONDS', 21600))


def _normalise(code):
    return str(code or '').strip().lower()


def get_exchange_rate(base_currency, target_currency):
    base = _normalise(base_currency)
    target = _normalise(target_currency)
    if not base or not target:
        return None
    if base == target:
        return Decimal('1')

    cache_key = f'artisan-ci:fx:{base}:{target}'
    cached = cache.get(cache_key)
    if cached is not None:
        try:
            return Decimal(str(cached))
        except (InvalidOperation, TypeError, ValueError):
            cache.delete(cache_key)

    for template in (PRIMARY_TEMPLATE, FALLBACK_TEMPLATE):
        try:
            response = requests.get(template.format(base=base), timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            payload = response.json()
            value = (payload.get(base) or {}).get(target)
            if value is None:
                continue
            rate = Decimal(str(value))
            if rate <= 0:
                continue
            cache.set(cache_key, str(rate), CACHE_SECONDS)
            return rate
        except (requests.RequestException, ValueError, InvalidOperation, TypeError):
            logger.warning('Impossible de récupérer le taux %s -> %s via %s', base, target, template)

    return None


def convert_amount(amount, base_currency, target_currency):
    try:
        source_amount = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError):
        return None

    rate = get_exchange_rate(base_currency, target_currency)
    if rate is None:
        return None

    return (source_amount * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
