from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        # Import tardif pour éviter les cycles pendant l'initialisation Django.
        from . import signals  # noqa: F401
