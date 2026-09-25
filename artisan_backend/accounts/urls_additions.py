# À intégrer dans artisan_backend/accounts/urls.py
from .session_views import (
    BrowserSessionLoginView,
    BrowserSessionLogoutView,
    BrowserSessionRefreshView,
)

# À ajouter à urlpatterns :
SESSION_URLPATTERNS = [
    path("session/login/", BrowserSessionLoginView.as_view(), name="browser-session-login"),
    path("session/refresh/", BrowserSessionRefreshView.as_view(), name="browser-session-refresh"),
    path("session/logout/", BrowserSessionLogoutView.as_view(), name="browser-session-logout"),
]
