from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "common"

    def ready(self):
        # Importe les checks au démarrage de Django afin qu'ils soient disponibles
        # via `python manage.py check --deploy`.
        from . import checks  # noqa: F401
