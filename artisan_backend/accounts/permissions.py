from rest_framework.permissions import BasePermission


class IsArtisan(BasePermission):
    message = "Accès réservé aux artisans."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "artisan"
        )


class IsClient(BasePermission):
    message = "Accès réservé aux clients."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "client"
        )


class IsAdmin(BasePermission):
    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "admin"
        )


class IsArtisanOrAdmin(BasePermission):
    message = "Accès réservé aux artisans ou administrateurs."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role in {"artisan", "admin"}
        )
