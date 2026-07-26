import time
from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand

from notifications.fcm import send_push
from notifications.models import DeviceToken, NotificationLog, ReminderPreference


class Command(BaseCommand):
    """
    Long-running loop (same shape as the analytics/workout services'
    listen_for_events — a plain management command instead of standing up
    Celery + beat for a single scheduled job, TRD 1.3's simplicity call).
    Every REMINDER_CHECK_INTERVAL_SECONDS, checks which enabled reminders are
    due *right now* in the user's own timezone and sends one push each.
    """

    help = "Polls ReminderPreference and sends a push to anyone whose reminder is due right now."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Checking for due reminders every " f"{settings.REMINDER_CHECK_INTERVAL_SECONDS}s..."))
        while True:
            self._check_once()
            time.sleep(settings.REMINDER_CHECK_INTERVAL_SECONDS)

    def _check_once(self):
        for pref in ReminderPreference.objects.filter(enabled=True, time_of_day__isnull=False):
            try:
                now_local = datetime.now(ZoneInfo(pref.timezone))
            except Exception:
                continue  # bad/unknown timezone string — skip rather than crash the loop

            today_local = now_local.date()
            if pref.last_sent_date == today_local:
                continue  # already sent today
            if now_local.weekday() not in (pref.days_of_week or []):
                continue
            if not self._time_matches(now_local.time(), pref.time_of_day):
                continue

            self._send_reminder(pref)
            pref.last_sent_date = today_local
            pref.save(update_fields=["last_sent_date"])

    @staticmethod
    def _time_matches(now_time, target_time) -> bool:
        """Matches to the minute — the loop runs every ~30s, finer than that isn't meaningful here."""
        return now_time.hour == target_time.hour and now_time.minute == target_time.minute

    @staticmethod
    def _send_reminder(pref: ReminderPreference) -> None:
        tokens = DeviceToken.objects.filter(user_id=pref.user_id)
        if not tokens.exists():
            return  # opted in but no device registered yet — nothing to send to

        any_sent = False
        for device in tokens:
            ok = send_push(
                device.fcm_token,
                title="Time to train",
                body="You usually train around now — log today's session in LOADED.",
            )
            any_sent = any_sent or ok

        NotificationLog.objects.create(
            user_id=pref.user_id, kind="reminder", status="sent" if any_sent else "failed"
        )
