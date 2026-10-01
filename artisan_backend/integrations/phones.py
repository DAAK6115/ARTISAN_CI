"""Normalisation internationale des numéros de téléphone ARTISAN_CI.

Les numéros sont stockés au format E.164 afin que le web, Flutter, WhatsApp
et les futurs fournisseurs Mobile Money partagent la même représentation.
"""


class InvalidPhoneNumber(ValueError):
    pass


def _library():
    try:
        import phonenumbers
        return phonenumbers
    except ImportError as exc:
        raise InvalidPhoneNumber(
            'La validation internationale des numéros n’est pas installée sur le serveur.'
        ) from exc


def normalize_phone_number(value, *, country_code=None, required=False):
    """Retourne *value* au format E.164.

    - Un numéro international (+33..., +225...) est interprété tel quel.
    - Un numéro local est interprété avec le code ISO-2 du pays du compte.
    - ``00`` est accepté comme préfixe international humain.
    """
    if value is None:
        if required:
            raise InvalidPhoneNumber('Le numéro de téléphone est requis.')
        return None

    raw = str(value).strip()
    if not raw:
        if required:
            raise InvalidPhoneNumber('Le numéro de téléphone est requis.')
        return ''

    if raw.startswith('00'):
        raw = f'+{raw[2:]}'

    phonenumbers = _library()
    region = str(country_code or '').strip().upper() or None
    try:
        parsed = phonenumbers.parse(raw, None if raw.startswith('+') else region)
    except phonenumbers.NumberParseException as exc:
        raise InvalidPhoneNumber('Numéro de téléphone invalide pour le pays sélectionné.') from exc

    if not phonenumbers.is_possible_number(parsed) or not phonenumbers.is_valid_number(parsed):
        raise InvalidPhoneNumber('Numéro de téléphone invalide pour le pays sélectionné.')

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def format_phone_national(value, *, country_code=None):
    if not value:
        return ''
    try:
        phonenumbers = _library()
        parsed = phonenumbers.parse(str(value), None)
    except (InvalidPhoneNumber, Exception):
        return str(value)
    if country_code and str(country_code).upper() != phonenumbers.region_code_for_number(parsed):
        return str(value)
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)

def example_phone_national(country_code):
    """Retourne un numéro d'exemple local pour un code ISO-2.

    Les exemples proviennent des métadonnées libphonenumber et servent
    uniquement d'aide de saisie : ils ne sont jamais enregistrés.
    """
    region = str(country_code or '').strip().upper()
    if len(region) != 2:
        return ''
    try:
        phonenumbers = _library()
        from phonenumbers import PhoneNumberType
        candidate = (
            phonenumbers.example_number_for_type(region, PhoneNumberType.MOBILE)
            or phonenumbers.example_number_for_type(region, PhoneNumberType.FIXED_LINE_OR_MOBILE)
            or phonenumbers.example_number(region)
        )
        if not candidate:
            return ''
        return phonenumbers.format_number(candidate, phonenumbers.PhoneNumberFormat.NATIONAL)
    except Exception:
        return ''

