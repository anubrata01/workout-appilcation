import time
import uuid
from datetime import date, timedelta
from pathlib import Path

import jwt
from rest_framework.test import APITestCase

from .models import WorkoutDay

DEV_PRIVATE_KEY = (Path(__file__).resolve().parent.parent.parent.parent / "infra" / "dev-keys" / "jwt-private.pem").read_text()

TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def make_access_token(user_id, email="lifter@example.com"):
    """
    Test-only: mints a token the same shape Auth Service issues, signed with the
    same dev keypair this service verifies against. Real tokens always come from
    Auth Service — this service never signs one itself (schema doc 5).
    """
    now = int(time.time())
    payload = {
        "token_type": "access",
        "exp": now + 900,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "sub": str(user_id),
        "email": email,
        "iss": "loaded-auth-service",
    }
    return jwt.encode(payload, DEV_PRIVATE_KEY, algorithm="RS256")


class WorkoutDayIsolationTests(APITestCase):
    """The highest security-consequence check per implementation plan Phase 2:
    one user must never be able to read or write another user's day."""

    def setUp(self):
        self.user_a = str(uuid.uuid4())
        self.user_b = str(uuid.uuid4())
        self.auth_a = f"Bearer {make_access_token(self.user_a)}"
        self.auth_b = f"Bearer {make_access_token(self.user_b)}"

    def test_save_and_read_own_day(self):
        payload = {
            "duration_seconds": 1800,
            "exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": True}]}],
        }
        put = self.client.put(
            f"/api/v1/workouts/days/{TODAY}/", payload, format="json", HTTP_AUTHORIZATION=self.auth_a
        )
        self.assertEqual(put.status_code, 200)
        self.assertEqual(put.data["duration_seconds"], 1800)
        self.assertEqual(len(put.data["exercises"]), 1)

        get = self.client.get(f"/api/v1/workouts/days/{TODAY}/", HTTP_AUTHORIZATION=self.auth_a)
        self.assertEqual(get.status_code, 200)
        self.assertEqual(get.data["exercises"][0]["name"], "Bench Press")

    def test_user_b_cannot_see_user_a_day(self):
        payload = {"exercises": []}
        self.client.put(f"/api/v1/workouts/days/{TODAY}/", payload, format="json", HTTP_AUTHORIZATION=self.auth_a)

        get_as_b = self.client.get(f"/api/v1/workouts/days/{TODAY}/", HTTP_AUTHORIZATION=self.auth_b)
        self.assertEqual(get_as_b.status_code, 200)
        self.assertIsNone(get_as_b.data)

    def test_unauthenticated_request_rejected(self):
        resp = self.client.get(f"/api/v1/workouts/days/{TODAY}/")
        self.assertEqual(resp.status_code, 401)

    def test_can_edit_today_and_past(self):
        payload = {"exercises": []}
        for d in (TODAY, YESTERDAY):
            resp = self.client.put(f"/api/v1/workouts/days/{d}/", payload, format="json", HTTP_AUTHORIZATION=self.auth_a)
            self.assertEqual(resp.status_code, 200, f"expected {d} to be editable")

    def test_cannot_edit_future_date(self):
        payload = {"exercises": []}
        resp = self.client.put(
            f"/api/v1/workouts/days/{TOMORROW}/", payload, format="json", HTTP_AUTHORIZATION=self.auth_a
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(WorkoutDay.objects.filter(date=TOMORROW).exists())


class ExerciseLibraryTests(APITestCase):
    def setUp(self):
        self.user_a = str(uuid.uuid4())
        self.auth_a = f"Bearer {make_access_token(self.user_a)}"

    def test_add_custom_exercise_and_find_it(self):
        create = self.client.post(
            "/api/v1/workouts/library/", {"name": "Zercher Squat"}, HTTP_AUTHORIZATION=self.auth_a
        )
        self.assertEqual(create.status_code, 201)

        listed = self.client.get("/api/v1/workouts/library/?search=Zercher", HTTP_AUTHORIZATION=self.auth_a)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

    def test_seeded_curated_library_is_searchable(self):
        from django.core.management import call_command

        call_command("seed_exercise_library")
        listed = self.client.get("/api/v1/workouts/library/?category=strength", HTTP_AUTHORIZATION=self.auth_a)
        self.assertEqual(listed.status_code, 200)
        self.assertGreater(len(listed.data), 5)
        self.assertTrue(all(item["is_curated"] for item in listed.data))

    def test_seeded_library_includes_cardio_and_bodyweight(self):
        from django.core.management import call_command

        call_command("seed_exercise_library")
        cardio = self.client.get("/api/v1/workouts/library/?category=cardio", HTTP_AUTHORIZATION=self.auth_a)
        self.assertGreater(len(cardio.data), 0)

        pushups = self.client.get("/api/v1/workouts/library/?search=Push-Ups", HTTP_AUTHORIZATION=self.auth_a)
        self.assertTrue(any(item["is_bodyweight"] for item in pushups.data))


class ExerciseLastSessionsTests(APITestCase):
    def setUp(self):
        self.user_a = str(uuid.uuid4())
        self.user_b = str(uuid.uuid4())
        self.auth_a = f"Bearer {make_access_token(self.user_a)}"
        self.auth_b = f"Bearer {make_access_token(self.user_b)}"

    def test_returns_full_set_list_from_most_recent_session(self):
        multi_set_day = {
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": [
                        {"weight": 60, "reps": 8, "done": True},
                        {"weight": 65, "reps": 6, "done": True},
                        {"weight": 70, "reps": 4, "done": False},
                    ],
                }
            ],
        }
        self.client.put(f"/api/v1/workouts/days/{YESTERDAY}/", multi_set_day, format="json", HTTP_AUTHORIZATION=self.auth_a)

        resp = self.client.post(
            "/api/v1/workouts/exercises/last-sessions/", {"names": ["Bench Press"]}, format="json", HTTP_AUTHORIZATION=self.auth_a
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["Bench Press"]["date"], YESTERDAY)
        self.assertEqual(len(resp.data["Bench Press"]["sets"]), 3)  # entire set list, not just the best one

    def test_unlogged_exercise_returns_null_not_fabricated_data(self):
        resp = self.client.post(
            "/api/v1/workouts/exercises/last-sessions/",
            {"names": ["Never Logged Exercise"]},
            format="json",
            HTTP_AUTHORIZATION=self.auth_a,
        )
        self.assertIsNone(resp.data["Never Logged Exercise"])

    def test_uses_most_recent_of_multiple_sessions(self):
        older = {"exercises": [{"name": "Squat", "sets": [{"weight": 80, "reps": 5, "done": True}]}]}
        newer = {"exercises": [{"name": "Squat", "sets": [{"weight": 90, "reps": 3, "done": True}]}]}
        self.client.put(f"/api/v1/workouts/days/2026-07-20/", older, format="json", HTTP_AUTHORIZATION=self.auth_a)
        self.client.put(f"/api/v1/workouts/days/{YESTERDAY}/", newer, format="json", HTTP_AUTHORIZATION=self.auth_a)

        resp = self.client.post(
            "/api/v1/workouts/exercises/last-sessions/", {"names": ["Squat"]}, format="json", HTTP_AUTHORIZATION=self.auth_a
        )
        self.assertEqual(resp.data["Squat"]["date"], YESTERDAY)
        self.assertEqual(resp.data["Squat"]["sets"][0]["weight"], 90)

    def test_isolated_per_user(self):
        day = {"exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": True}]}]}
        self.client.put(f"/api/v1/workouts/days/{YESTERDAY}/", day, format="json", HTTP_AUTHORIZATION=self.auth_a)

        resp = self.client.post(
            "/api/v1/workouts/exercises/last-sessions/", {"names": ["Bench Press"]}, format="json", HTTP_AUTHORIZATION=self.auth_b
        )
        self.assertIsNone(resp.data["Bench Press"])
