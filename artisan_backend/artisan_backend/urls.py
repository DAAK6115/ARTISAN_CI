from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from .views import health_check

urlpatterns = [
    path("api/health/", health_check, name="health"),
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/services/", include("services.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/portfolio/", include("portfolio.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/blog/", include("blog.urls")),
    path("api/support/", include("support.urls")),
    path("api/moderation/", include("moderation.urls")),
    path("api/certifications/", include("certifications.urls")),
    path("api/favoris/", include("favoris.urls")),
    path("api/likes/", include("likes.urls")),
    path("api/chat/", include("chat.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
