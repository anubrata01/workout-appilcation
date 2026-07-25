from django.contrib import admin

from .models import DeviceToken, NotificationLog, ReminderPreference


@admin.register(ReminderPreference)
class ReminderPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user_id", "enabled", "time_of_day", "timezone"]


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ["user_id", "created_at", "last_seen_at"]


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ["user_id", "kind", "status", "sent_at"]
    list_filter = ["kind", "status"]
