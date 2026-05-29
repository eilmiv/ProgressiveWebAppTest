import uuid

from django.conf import settings
from django.db import models


class Counter(models.Model):
    counter_id = models.UUIDField(default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='counters')
    name = models.CharField(max_length=120)
    value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'counter_id'], name='uniq_counter_id_per_user'),
        ]

    def __str__(self) -> str:
        return f"{self.user.username}:{self.counter_id}:{self.name}={self.value}"
