import time
import uuid
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

import jwt
from django.test import TestCase
from rest_framework.test import APITestCase

from .management.commands.send_due_reminders import Command as ReminderCommand
from .models import DeviceToken, NotificationLog, ReminderPreference

DEV_PRIVATE_KEY = (Path(__file__).resolve().parent.parent.parent.parent / "infra" / "dev-keys" / "jwt-private.pem").read_text()


def make_access_token(user_id):
    now = int(time.time())
    payload = {
        "token_type": "access",
        "exp": now + 900,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "sub": str(user_id),
        "iss": "loaded-auth-service",
    }
    return jwt.encode(payload, DEV_PRIVATE_KEY, algorithm="RS256")


class ReminderPreferenceTests(APITestCase):
    def test_defaults_are_opt_out(self):
        user_id = str(uuid.uuid4())
        auth = f"Bearer {make_access_token(user_id)}"
        resp = self.client.get("/api/v1/notifications/preferences/", HTTP_AUTHORIZATION=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["enabled"])  # opt-in only, per PRD 8

    def test_update_preferences(self):
        user_id = str(uuid.uuid4())
        auth = f"Bearer {make_access_token(user_id)}"
        resp = self.client.put(
            "/api/v1/notifications/preferences/",
            {"enabled": True, "days_of_week": [0, 2, 4], "time_of_day": "18:00", "timezone": "Asia/Kolkata"},
            format="json",
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(ReminderPreference.objects.get(user_id=user_id).enabled)


class DeviceTokenTests(APITestCase):
    def test_register_and_remove_device_token(self):
        user_id = str(uuid.uuid4())
        auth = f"Bearer {make_access_token(user_id)}"

        register = self.client.post(
            "/api/v1/notifications/device-token/", {"fcm_token": "tok-abc"}, HTTP_AUTHORIZATION=auth
        )
        self.assertEqual(register.status_code, 204)
        self.assertTrue(DeviceToken.objects.filter(user_id=user_id, fcm_token="tok-abc").exists())

        remove = self.client.delete(
            "/api/v1/notifications/device-token/", {"fcm_token": "tok-abc"}, HTTP_AUTHORIZATION=auth, format="json"
        )
        self.assertEqual(remove.status_code, 204)
        self.assertFalse(DeviceToken.objects.filter(fcm_token="tok-abc").exists())


class ReminderSchedulerTests(TestCase):
    """
    Uses the real current time (in Asia/Kolkata) rather than a fixed
    timestamp, so these stay correct regardless of what day this suite runs
    on — same approach used for the other services' date-dependent tests.
    """

    def setUp(self):
        self.now = datetime.now(ZoneInfo("Asia/Kolkata"))
        self.user_id = str(uuid.uuid4())

    def _make_pref(self, **overrides):
        defaults = {
            "user_id": self.user_id,
            "enabled": True,
            "days_of_week": [self.now.weekday()],
            "time_of_day": self.now.time().replace(second=0, microsecond=0),
            "timezone": "Asia/Kolkata",
        }
        defaults.update(overrides)
        return ReminderPreference.objects.create(**defaults)

    @patch("notifications.management.commands.send_due_reminders.send_push", return_value=True)
    def test_due_reminder_with_device_sends_and_logs(self, mock_send):
        self._make_pref()
        DeviceToken.objects.create(user_id=self.user_id, fcm_token="tok-1")

        ReminderCommand()._check_once()

        mock_send.assert_called_once()
        self.assertTrue(NotificationLog.objects.filter(user_id=self.user_id, kind="reminder", status="sent").exists())
        pref = ReminderPreference.objects.get(user_id=self.user_id)
        self.assertEqual(pref.last_sent_date, self.now.date())

    @patch("notifications.management.commands.send_due_reminders.send_push")
    def test_already_sent_today_is_not_resent(self, mock_send):
        self._make_pref(last_sent_date=self.now.date())
        DeviceToken.objects.create(user_id=self.user_id, fcm_token="tok-1")

        ReminderCommand()._check_once()

        mock_send.assert_not_called()

    @patch("notifications.management.commands.send_due_reminders.send_push")
    def test_wrong_day_is_skipped(self, mock_send):
        other_day = (self.now.weekday() + 1) % 7
        self._make_pref(days_of_week=[other_day])
        DeviceToken.objects.create(user_id=self.user_id, fcm_token="tok-1")

        ReminderCommand()._check_once()

        mock_send.assert_not_called()

    @patch("notifications.management.commands.send_due_reminders.send_push")
    def test_disabled_reminder_is_skipped(self, mock_send):
        self._make_pref(enabled=False)
        DeviceToken.objects.create(user_id=self.user_id, fcm_token="tok-1")

        ReminderCommand()._check_once()

        mock_send.assert_not_called()

    @patch("notifications.management.commands.send_due_reminders.send_push")
    def test_no_device_token_skips_send_but_marks_checked(self, mock_send):
        self._make_pref()

        ReminderCommand()._check_once()

        mock_send.assert_not_called()
        pref = ReminderPreference.objects.get(user_id=self.user_id)
        self.assertEqual(pref.last_sent_date, self.now.date())
