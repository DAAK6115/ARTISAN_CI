# À intégrer dans artisan_backend/artisan_backend/settings.py
# La PWA utilise des cookies de refresh HttpOnly ; CORS doit donc autoriser les credentials.
CORS_ALLOW_CREDENTIALS = True

AUTH_REFRESH_COOKIE_NAME = os.getenv("AUTH_REFRESH_COOKIE_NAME", "artisan_refresh")
AUTH_REFRESH_COOKIE_PATH = "/api/accounts/session/"
AUTH_REFRESH_COOKIE_SECURE = env_bool("AUTH_REFRESH_COOKIE_SECURE", IS_PRODUCTION)
AUTH_REFRESH_COOKIE_SAMESITE = os.getenv("AUTH_REFRESH_COOKIE_SAMESITE", "Lax")

if AUTH_REFRESH_COOKIE_SAMESITE not in {"Lax", "Strict", "None"}:
    raise ImproperlyConfigured(
        "AUTH_REFRESH_COOKIE_SAMESITE doit valoir Lax, Strict ou None."
    )

if AUTH_REFRESH_COOKIE_SAMESITE == "None" and not AUTH_REFRESH_COOKIE_SECURE:
    raise ImproperlyConfigured(
        "SameSite=None exige un cookie Secure."
    )
