# Read-only monetary conversion; never change contractual amounts.
from decimal import Decimal
from integrations.currency import get_exchange_rate


def money_display(amount, original_currency, request=None):
    source = str(original_currency or 'XOF').upper()
    user = getattr(request, 'user', None)
    target = source
    if user and user.is_authenticated and getattr(user, 'role', None) == 'client':
        target = str(getattr(user, 'currency_code', '') or source).upper()
    original = Decimal(str(amount))
    if target == source:
        return {'amount': original, 'currency': source, 'converted': False}
    rate = get_exchange_rate(source, target)
    if rate is None:
        return {'amount': original, 'currency': source, 'converted': False}
    return {
        'amount': (original * rate).quantize(Decimal('0.01')),
        'currency': target,
        'converted': True,
    }
