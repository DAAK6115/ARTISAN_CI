from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0002_message_audio_message_media"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="content",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(model_name="message", name="delivered_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="message", name="read_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="message", name="edited_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="message", name="deleted_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="message", name="location_lat", field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
        migrations.AddField(model_name="message", name="location_lng", field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
        migrations.AddField(
            model_name="message",
            name="reply_to",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="replies", to="chat.message"),
        ),
        migrations.CreateModel(
            name="ChatBlock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("blocked", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_blocks_received", to=settings.AUTH_USER_MODEL)),
                ("blocker", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_blocks_created", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="ChatPresence",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("connection_count", models.PositiveIntegerField(default=0)),
                ("last_seen_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="chat_presence", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="WebSocketTicket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token_hash", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="websocket_tickets", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="chatblock",
            constraint=models.UniqueConstraint(fields=("blocker", "blocked"), name="unique_chat_block"),
        ),
        migrations.AddIndex(model_name="message", index=models.Index(fields=["sender", "receiver", "timestamp"], name="chat_sender_recv_idx")),
        migrations.AddIndex(model_name="message", index=models.Index(fields=["receiver", "is_read", "timestamp"], name="chat_receiver_read_idx")),
        migrations.AddIndex(model_name="websocketticket", index=models.Index(fields=["expires_at"], name="ws_ticket_exp_idx")),
    ]
