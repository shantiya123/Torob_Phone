from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("shopping", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="basketitem",
            name="unit_price",
            field=models.PositiveIntegerField(default=0),
            preserve_default=False,
        ),
    ]
