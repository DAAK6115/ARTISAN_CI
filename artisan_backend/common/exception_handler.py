import logging
import secrets

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def safe_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    error_id = secrets.token_hex(6)
    request = context.get("request")
    view = context.get("view")
    method = getattr(request, "method", "?")
    path = getattr(request, "path", "?")
    view_name = view.__class__.__name__ if view else "vue inconnue"

    logger.error(
        "Erreur API non gérée id=%s method=%s path=%s view=%s",
        error_id,
        method,
        path,
        view_name,
        exc_info=(type(exc), exc, exc.__traceback__),
    )

    return Response(
        {
            "detail": "Une erreur interne est survenue. Veuillez réessayer.",
            "error_id": error_id,
        },
        status=500,
    )
