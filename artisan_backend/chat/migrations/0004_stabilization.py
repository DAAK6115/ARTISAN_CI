from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0003_sprint8_chat"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="message",
            options={"ordering": ["timestamp", "id"]},
        ),
        migrations.AlterField(
            model_name="message",
            name="timestamp",
            field=models.DateTimeField(
                db_index=True,
                default=django.utils.timezone.now,
            ),
        ),
        migrations.AddConstraint(
            model_name="chatblock",
            constraint=models.CheckConstraint(
                condition=~models.Q(blocker=models.F("blocked")),
                name="prevent_self_chat_block",
            ),
        ),
    ]
