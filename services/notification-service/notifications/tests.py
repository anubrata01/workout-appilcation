import time
import uuid
from pathlib import Path

import jwt
from rest_framework.test import APITestCase

from .models import DeviceToken, ReminderPreference

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
