from django.urls import path

from .views import (
    ClientProfileView,
    ConfirmPasswordResetView,
    GetUserIdByUsernameView,
    ListArtisansView,
    ListClientsView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    RequestArtisanVerificationView,
    RequestPasswordResetView,
    SecureTokenRefreshView,
    UpdateProfileView,
)

from .session_views import (
    BrowserSessionLoginView,
    BrowserSessionLogoutView,
    BrowserSessionRefreshView,
)


urlpatterns = [
    # Authentification historique
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", SecureTokenRefreshView.as_view(), name="token_refresh"),

    # Authentification sécurisée PWA / mobile
    path(
        "session/login/",
        BrowserSessionLoginView.as_view(),
        name="browser-session-login",
    ),
    path(
        "session/refresh/",
        BrowserSessionRefreshView.as_view(),
        name="browser-session-refresh",
    ),
    path(
        "session/logout/",
        BrowserSessionLogoutView.as_view(),
        name="browser-session-logout",
    ),

    # Profil
    path("me/", MeView.as_view(), name="me"),
    path("me/update/", UpdateProfileView.as_view(), name="update-profile"),
    path("profile/me/", ClientProfileView.as_view(), name="client-profile"),
    path("profile/update/", ClientProfileView.as_view(), name="update-client-update"),

    # Administration
    path("list/artisans/", ListArtisansView.as_view(), name="list-artisans"),
    path("list/clients/", ListClientsView.as_view(), name="list-clients"),

    # Vérification artisan
    path(
        "artisan/verification/request/",
        RequestArtisanVerificationView.as_view(),
        name="request-artisan-verification",
    ),

    # Mot de passe
    path(
        "password-reset/request/",
        RequestPasswordResetView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        ConfirmPasswordResetView.as_view(),
        name="password-reset-confirm",
    ),

    path(
        "get-id/<str:username>/",
        GetUserIdByUsernameView.as_view(),
        name="get-user-id",
    ),
]