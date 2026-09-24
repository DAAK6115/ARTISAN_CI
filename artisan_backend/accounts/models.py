from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est requis.")
        if not password:
            raise ValueError("Le mot de passe est requis.")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un superutilisateur doit avoir is_superuser=True.")
        if extra_fields.get("role") != "admin":
            raise ValueError("Un superutilisateur doit avoir le rôle admin.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ("client", "Client"),
        ("artisan", "Artisan"),
        ("admin", "Admin"),
    )

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="client")
    is_active = models.BooleanField(default=True)
    ARTISAN_VERIFICATION_CHOICES = (
        ("unverified", "Non vérifié"),
        ("pending", "En vérification"),
        ("verified", "Vérifié"),
        ("rejected", "Refusé"),
    )

    numero_momo = models.CharField(max_length=20, blank=True, null=True)
    qr_wave = models.ImageField(upload_to="qr_codes/", blank=True, null=True)
    verification_status = models.CharField(
        max_length=16,
        choices=ARTISAN_VERIFICATION_CHOICES,
        default="unverified",
        db_index=True,
    )
    verification_requested_at = models.DateTimeField(blank=True, null=True)
    verification_reviewed_at = models.DateTimeField(blank=True, null=True)
    verification_reviewed_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="artisan_verification_reviews",
    )
    verification_note = models.TextField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = CustomUserManager()

    def __str__(self):
        return self.email


class PasswordResetCode(models.Model):
    MAX_ATTEMPTS = 5
    LIFETIME_MINUTES = 5

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"], name="pwd_reset_user_created_idx"),
        ]

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=self.LIFETIME_MINUTES)

    def is_usable(self):
        return (
            self.used_at is None
            and not self.is_expired()
            and self.attempts < self.MAX_ATTEMPTS
        )

    def register_failed_attempt(self):
        self.attempts = min(self.attempts + 1, self.MAX_ATTEMPTS)
        self.save(update_fields=["attempts"])

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    def __str__(self):
        return f"Code de réinitialisation pour {self.user.email} ({self.created_at:%Y-%m-%d %H:%M})"
