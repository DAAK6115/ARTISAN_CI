"""Compatibilité avec d'anciens imports GeniusPay.

Le paiement en ligne via GeniusPay n'est plus utilisé par le workflow actuel
d'ARTISAN_CI. Les règlements sont déclarés manuellement par l'artisan après
la prestation. Ce module reste importable afin qu'un ancien fichier local ne
fasse pas échouer le démarrage de Django.
"""

from rest_framework.exceptions import ValidationError


_DISABLED_MESSAGE = (
    "Le paiement GeniusPay n'est pas actif dans cette version d'ARTISAN_CI. "
    "Le règlement est déclaré manuellement par l'artisan après la prestation."
)


def _disabled(*args, **kwargs):
    raise ValidationError(_DISABLED_MESSAGE)


def reconcile_geniuspay_transaction(*args, **kwargs):
    return _disabled(*args, **kwargs)


def initiate_checkout(*args, **kwargs):
    return _disabled(*args, **kwargs)


def retrieve_and_reconcile(*args, **kwargs):
    return _disabled(*args, **kwargs)
