import uuid

from django.db import models


class ReminderPreference(models.Model):
    user_id = models.UUIDField(primary_key=True)
    enabled = models.BooleanField(default=False)  # opt-in only (PRD 8)
    days_of_week = models.JSONField(default=list)  # [0..6], 0=Mon
    time_of_day = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default="Asia/Kolkata")
    # De-dupes sends within the same matching minute across scheduler loop
    # ticks — a reminder fires at most once per calendar day (in the user's
    # own timezone), not once per loop iteration that happens to match.
    last_sent_date = models.DateField(null=True, blank=True)


class DeviceToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    fcm_token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)


class NotificationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    kind = models.CharField(max_length=30)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[("sent", "sent"), ("failed", "failed")])
