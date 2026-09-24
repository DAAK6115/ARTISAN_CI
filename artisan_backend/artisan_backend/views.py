import secrets

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse


def health_check(request):
    checks = {"database": "ok"}
    status_code = 200

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        checks["database"] = "unavailable"
        status_code = 503

    # En production Redis est critique pour le chat temps réel et les tickets WS.
    if getattr(settings, "REDIS_URL", ""):
        try:
            key = f"health:{secrets.token_hex(4)}"
            cache.set(key, "ok", timeout=10)
            if cache.get(key) != "ok":
                raise RuntimeError("cache round-trip failed")
            cache.delete(key)
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "unavailable"
            status_code = 503

    return JsonResponse(
        {
            "status": "ok" if status_code == 200 else "degraded",
            **checks,
        },
        status=status_code,
    )
