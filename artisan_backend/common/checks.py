import os

from django.conf import settings
from django.core.checks import Error, Tags, Warning, register


@register(Tags.security, deploy=True)
def artisan_ci_deployment_checks(app_configs, **kwargs):
    """Checks spécifiques à ARTISAN_CI, actifs uniquement en environnement production."""

    if getattr(settings, "ARTISAN_ENV", "development") != "production":
        return []

    issues = []

    if settings.DEBUG:
        issues.append(
            Error(
                "DEBUG doit être désactivé en production.",
                id="artisan_ci.E001",
            )
        )

    if not os.getenv("DATABASE_URL", "").strip():
        issues.append(
            Error(
                "DATABASE_URL est obligatoire en production afin d'utiliser PostgreSQL.",
                id="artisan_ci.E002",
            )
        )

    if not os.getenv("REDIS_URL", "").strip():
        issues.append(
            Error(
                "REDIS_URL est obligatoire en production pour Channels et le cache partagé.",
                id="artisan_ci.E003",
            )
        )

    if "*" in settings.ALLOWED_HOSTS:
        issues.append(
            Error(
                "ALLOWED_HOSTS ne doit pas contenir '*' en production.",
                id="artisan_ci.E004",
            )
        )

    if len(settings.SECRET_KEY) < 50:
        issues.append(
            Warning(
                "DJANGO_SECRET_KEY devrait contenir au moins 50 caractères aléatoires.",
                id="artisan_ci.W001",
            )
        )

    if settings.SECURE_HSTS_SECONDS <= 0:
        issues.append(
            Warning(
                "HSTS est désactivé. Activez DJANGO_HSTS_SECONDS après validation HTTPS du domaine.",
                id="artisan_ci.W002",
            )
        )

    if settings.EMAIL_BACKEND.endswith("console.EmailBackend"):
        issues.append(
            Warning(
                "Le backend email console est encore actif en production.",
                id="artisan_ci.W003",
            )
        )

    local_origins = {
        origin
        for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        if "localhost" in origin or "127.0.0.1" in origin
    }
    if local_origins:
        issues.append(
            Warning(
                "Des origines locales sont présentes dans CORS_ALLOWED_ORIGINS en production.",
                hint=", ".join(sorted(local_origins)),
                id="artisan_ci.W004",
            )
        )

    return issues
