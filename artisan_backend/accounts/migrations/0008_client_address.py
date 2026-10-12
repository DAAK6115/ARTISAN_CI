from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_existing_primary_addresses(apps, schema_editor):
    CustomUser = apps.get_model("accounts", "CustomUser")
    ClientAddress = apps.get_model("accounts", "ClientAddress")

    users = (
        CustomUser.objects.filter(role="client")
        .exclude(primary_address="")
        .exclude(primary_latitude__isnull=True)
        .exclude(primary_longitude__isnull=True)
    )

    for user in users.iterator():
        ClientAddress.objects.create(
            user_id=user.pk,
            label="Maison",
            address=user.primary_address,
            city=user.city or "",
            country_code=(user.country_code or "CI").upper()[:2],
            latitude=user.primary_latitude,
            longitude=user.primary_longitude,
            is_default=True,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_client_profile_preferences"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClientAddress",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("label", models.CharField(max_length=40)),
                ("address", models.CharField(max_length=255)),
                ("city", models.CharField(blank=True, max_length=120)),
                ("country_code", models.CharField(db_index=True, default="CI", max_length=2)),
                ("latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("is_default", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_addresses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-is_default", "label", "id"],
                "indexes": [
                    models.Index(
                        fields=["user", "-is_default"],
                        name="client_addr_user_def_idx",
                    )
                ],
                "constraints": [
                    models.UniqueConstraint(
                        condition=models.Q(("is_default", True)),
                        fields=("user",),
                        name="one_default_client_addr",
                    )
                ],
            },
        ),
        migrations.RunPython(seed_existing_primary_addresses, migrations.RunPython.noop),
    ]
