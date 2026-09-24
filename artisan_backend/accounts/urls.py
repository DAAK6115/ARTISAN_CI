from django.urls import path

from .views import (
    ClientProfileView,
    ConfirmPasswordResetView,
    GetUserIdByUsernameView,
    ListArtisansView,
    ListClientsView,
    LoginView,
    MeView,
    RegisterView,
    RequestPasswordResetView,
    SecureTokenRefreshView,
    UpdateProfileView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", SecureTokenRefreshView.as_view(), name="token_refresh"),

    path("me/", MeView.as_view(), name="me"),
    path("me/update/", UpdateProfileView.as_view(), name="update-profile"),
    path("profile/me/", ClientProfileView.as_view(), name="client-profile"),
    path("profile/update/", ClientProfileView.as_view(), name="update-client-update"),

    path("list/artisans/", ListArtisansView.as_view(), name="list-artisans"),
    path("list/clients/", ListClientsView.as_view(), name="list-clients"),

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
