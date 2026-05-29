import uuid

from django.db import migrations, models


def fill_counter_ids(apps, schema_editor):
    Counter = apps.get_model('api', 'Counter')
    for counter in Counter.objects.filter(counter_id__isnull=True):
        counter.counter_id = uuid.uuid4()
        counter.save(update_fields=['counter_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='counter',
            name='counter_id',
            field=models.UUIDField(null=True),
        ),
        migrations.RunPython(fill_counter_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='counter',
            name='counter_id',
            field=models.UUIDField(),
        ),
        migrations.AddConstraint(
            model_name='counter',
            constraint=models.UniqueConstraint(fields=('user', 'counter_id'), name='uniq_counter_id_per_user'),
        ),
    ]
