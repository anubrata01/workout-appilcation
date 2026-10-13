import time
import uuid
from datetime import date, timedelta
from pathlib import Path

import jwt
from django.core.cache import cache
from django.utils.dateparse import parse_datetime
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

    def test_single_session_with_multiple_distinct_exercises_all_saved(self):
        """One Finish can log more than one exercise in the same PUT (this is
        the normal case -- add two exercises to the active session, then hit
        Finish once) -- all of them must come back, not just the first."""
        payload = {
            "duration_seconds": 1800,
            "exercises": [
                {"name": "Squat", "sets": [{"weight": 80, "reps": 5, "done": True}]},
                {"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": True}]},
                {"name": "Pull-Up", "sets": [{"weight": 0, "reps": 10, "done": True}]},
            ],
        }
        put = self.client.put(f"/api/v1/workouts/days/{TODAY}/", payload, format="json", HTTP_AUTHORIZATION=self.auth_a)
        self.assertEqual(put.status_code, 200)
        names = [ex["name"] for ex in put.data["exercises"]]
        self.assertEqual(names, ["Squat", "Bench Press", "Pull-Up"])

        get = self.client.get(f"/api/v1/workouts/days/{TODAY}/", HTTP_AUTHORIZATION=self.auth_a)
        self.assertEqual(get.status_code, 200)
        get_names = [ex["name"] for ex in get.data["exercises"]]
        self.assertEqual(get_names, ["Squat", "Bench Press", "Pull-Up"])

    def test_second_session_same_day_appends_and_accumulates_duration(self):
        """The bug this fixes: a second Finish the same day used to silently
        wipe the first session's exercises. Now both are kept, and their
        durations sum — the gap between the two sessions is never counted,
        since it was never part of either session's own elapsed timer."""
        morning = {
            "duration_seconds": 1800,
            "started_at": "2026-09-13T07:00:00Z",
            "finished_at": "2026-09-13T07:30:00Z",
            "exercises": [{"name": "Squat", "sets": [{"weight": 80, "reps": 5, "done": True}]}],
        }
        evening = {
            "duration_seconds": 2400,
            "started_at": "2026-09-13T18:00:00Z",
            "finished_at": "2026-09-13T18:40:00Z",
            "exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": True}]}],
        }
        self.client.put(f"/api/v1/workouts/days/{TODAY}/", morning, format="json", HTTP_AUTHORIZATION=self.auth_a)
        resp = self.client.put(f"/api/v1/workouts/days/{TODAY}/", evening, format="json", HTTP_AUTHORIZATION=self.auth_a)

        self.assertEqual(resp.status_code, 200)
        names = {ex["name"] for ex in resp.data["exercises"]}
        self.assertEqual(names, {"Squat", "Bench Press"})  # both sessions kept, not overwritten
        self.assertEqual(resp.data["duration_seconds"], 1800 + 2400)  # summed, gap between them excluded
        # Compare as actual instants, not strings — DRF renders these in the
        # server's local timezone (Asia/Kolkata), not passed-through UTC.
        self.assertEqual(parse_datetime(resp.data["started_at"]), parse_datetime("2026-09-13T07:00:00Z"))
        self.assertEqual(parse_datetime(resp.data["finished_at"]), parse_datetime("2026-09-13T18:40:00Z"))


class ExerciseLibraryTests(APITestCase):
    def setUp(self):
        cache.clear()  # the curated-library cache is process-wide; keep tests independent
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


class SetTypeAndNoteTests(APITestCase):
    def setUp(self):
        self.user = str(uuid.uuid4())
        self.auth = f"Bearer {make_access_token(self.user)}"

    def test_set_type_and_exercise_note_round_trip(self):
        payload = {
            "exercises": [
                {
                    "name": "Bench Press",
                    "note": "pause at the bottom",
                    "sets": [
                        {"weight": 40, "reps": 10, "done": True, "set_type": "warmup"},
                        {"weight": 60, "reps": 8, "done": True},
                    ],
                }
            ]
        }
        put = self.client.put(f"/api/v1/workouts/days/{TODAY}/", payload, format="json", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(put.status_code, 200)
        exercise = put.data["exercises"][0]
        self.assertEqual(exercise["note"], "pause at the bottom")
        self.assertEqual([s["set_type"] for s in exercise["sets"]], ["warmup", "normal"])  # defaults to normal

    def test_invalid_set_type_rejected(self):
        payload = {"exercises": [{"name": "Squat", "sets": [{"weight": 1, "reps": 1, "set_type": "banana"}]}]}
        put = self.client.put(f"/api/v1/workouts/days/{TODAY}/", payload, format="json", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(put.status_code, 400)


class RoutineTests(APITestCase):
    def setUp(self):
        self.user_a = str(uuid.uuid4())
        self.user_b = str(uuid.uuid4())
        self.auth_a = f"Bearer {make_access_token(self.user_a)}"
        self.auth_b = f"Bearer {make_access_token(self.user_b)}"
        self.push_day = {
            "name": "Push Day",
            "items": [
                {"name": "Bench Press", "category": "strength", "is_bodyweight": False, "default_sets": 4},
                {"name": "Push-Ups", "category": "strength", "is_bodyweight": True},
            ],
        }

    def _create(self, auth=None, body=None):
        return self.client.post(
            "/api/v1/workouts/templates/", body or self.push_day, format="json", HTTP_AUTHORIZATION=auth or self.auth_a
        )

    def test_create_list_and_apply(self):
        created = self._create()
        self.assertEqual(created.status_code, 201)
        self.assertEqual([i["name"] for i in created.data["items"]], ["Bench Press", "Push-Ups"])
        self.assertEqual(created.data["items"][1]["default_sets"], 3)  # defaulted

        listed = self.client.get("/api/v1/workouts/templates/", HTTP_AUTHORIZATION=self.auth_a)
        self.assertEqual(len(listed.data), 1)

        applied = self.client.post(
            f"/api/v1/workouts/templates/{created.data['id']}/apply/", format="json", HTTP_AUTHORIZATION=self.auth_a
        )
        self.assertEqual(applied.status_code, 200)
        self.assertEqual(
            applied.data[0], {"name": "Bench Press", "category": "strength", "is_bodyweight": False, "default_sets": 4}
        )
        self.assertTrue(applied.data[1]["is_bodyweight"])

    def test_duplicate_name_rejected_but_other_users_may_reuse_it(self):
        self.assertEqual(self._create().status_code, 201)
        self.assertEqual(self._create().status_code, 400)
        self.assertEqual(self._create(auth=self.auth_b).status_code, 201)

    def test_routine_needs_at_least_one_exercise(self):
        self.assertEqual(self._create(body={"name": "Empty", "items": []}).status_code, 400)

    def test_update_replaces_items_and_can_keep_same_name(self):
        created = self._create()
        url = f"/api/v1/workouts/templates/{created.data['id']}/"
        updated = self.client.put(
            url,
            {"name": "Push Day", "items": [{"name": "Overhead Press", "default_sets": 5}]},
            format="json",
            HTTP_AUTHORIZATION=self.auth_a,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual([i["name"] for i in updated.data["items"]], ["Overhead Press"])

    def test_delete_and_isolation(self):
        created = self._create()
        url = f"/api/v1/workouts/templates/{created.data['id']}/"
        self.assertEqual(self.client.get(url, HTTP_AUTHORIZATION=self.auth_b).status_code, 404)
        self.assertEqual(self.client.delete(url, HTTP_AUTHORIZATION=self.auth_b).status_code, 404)
        self.assertEqual(self.client.delete(url, HTTP_AUTHORIZATION=self.auth_a).status_code, 204)
        self.assertEqual(self.client.get(url, HTTP_AUTHORIZATION=self.auth_a).status_code, 404)


class LibraryCatalogTests(APITestCase):
    def setUp(self):
        from django.core.management import call_command

        cache.clear()
        call_command("seed_exercise_library")
        self.user = str(uuid.uuid4())
        self.auth = f"Bearer {make_access_token(self.user)}"

    def test_catalogue_is_large_and_has_images(self):
        everything = self.client.get("/api/v1/workouts/library/?limit=500", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(everything.status_code, 200)
        self.assertEqual(len(everything.data), 500)  # capped by limit, catalogue is bigger
        bench = self.client.get("/api/v1/workouts/library/?search=Bench Press", HTTP_AUTHORIZATION=self.auth)
        curated_bench = next(i for i in bench.data if i["name"] == "Bench Press")
        self.assertTrue(curated_bench["image_url"].startswith("https://"))

    def test_list_omits_description_but_detail_includes_it(self):
        listed = self.client.get("/api/v1/workouts/library/?search=Bench Press", HTTP_AUTHORIZATION=self.auth)
        self.assertNotIn("description", listed.data[0])
        detail = self.client.get("/api/v1/workouts/library/detail/?name=bench press", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["name"], "Bench Press")
        self.assertTrue(detail.data["description"])

    def test_detail_requires_name_and_unknown_is_null(self):
        self.assertEqual(
            self.client.get("/api/v1/workouts/library/detail/", HTTP_AUTHORIZATION=self.auth).status_code, 400
        )
        self.assertIsNone(
            self.client.get("/api/v1/workouts/library/detail/?name=Nope Nope", HTTP_AUTHORIZATION=self.auth).data
        )

    def test_pagination_and_muscle_filter(self):
        first = self.client.get("/api/v1/workouts/library/?limit=5", HTTP_AUTHORIZATION=self.auth)
        second = self.client.get("/api/v1/workouts/library/?limit=5&offset=5", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(len(first.data), 5)
        self.assertTrue({i["id"] for i in first.data}.isdisjoint({i["id"] for i in second.data}))
        chest = self.client.get("/api/v1/workouts/library/?muscle_group=chest&limit=50", HTTP_AUTHORIZATION=self.auth)
        self.assertTrue(chest.data)
        self.assertTrue(all(i["muscle_group"] == "chest" for i in chest.data))

    def test_bad_limit_falls_back_instead_of_erroring(self):
        resp = self.client.get("/api/v1/workouts/library/?limit=abc&offset=-3", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(resp.status_code, 200)

    def test_second_identical_request_is_served_from_memory(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        self.client.get("/api/v1/workouts/library/?search=squat", HTTP_AUTHORIZATION=self.auth)
        with CaptureQueriesContext(connection) as queries:
            self.client.get("/api/v1/workouts/library/?search=squat", HTTP_AUTHORIZATION=self.auth)
        # Only the caller's own (tiny) custom-exercise query hits the DB; the curated ~800 are cached.
        self.assertLessEqual(len(queries), 1)

    def test_users_own_custom_exercise_shadows_curated_one_of_the_same_name(self):
        self.client.post("/api/v1/workouts/library/", {"name": "Bench Press"}, HTTP_AUTHORIZATION=self.auth)
        bench = self.client.get("/api/v1/workouts/library/?search=Bench Press", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual([i["name"] for i in bench.data].count("Bench Press"), 1)
        self.assertFalse(next(i for i in bench.data if i["name"] == "Bench Press")["is_curated"])


class MuscleDistributionTests(APITestCase):
    def setUp(self):
        from django.core.management import call_command

        cache.clear()
        call_command("seed_exercise_library")
        self.user = str(uuid.uuid4())
        self.auth = f"Bearer {make_access_token(self.user)}"

    def test_counts_done_non_warmup_sets_by_muscle_group(self):
        payload = {
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": [
                        {"weight": 40, "reps": 10, "done": True, "set_type": "warmup"},
                        {"weight": 60, "reps": 8, "done": True},
                        {"weight": 60, "reps": 8, "done": True},
                        {"weight": 60, "reps": 8, "done": False},
                    ],
                },
                {"name": "Lat Pulldown", "sets": [{"weight": 50, "reps": 10, "done": True}]},
                {"name": "Totally Made Up Move", "sets": [{"weight": 5, "reps": 5, "done": True}]},
            ]
        }
        self.client.put(f"/api/v1/workouts/days/{TODAY}/", payload, format="json", HTTP_AUTHORIZATION=self.auth)

        resp = self.client.get("/api/v1/workouts/muscle-distribution/?range=week", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(resp.status_code, 200)
        groups = {g["muscle_group"]: g for g in resp.data["groups"]}
        self.assertEqual(groups["chest"]["sets"], 2)  # warm-up and not-done excluded
        self.assertEqual(groups["chest"]["volume"], 60 * 8 * 2)
        self.assertEqual(groups["back"]["sets"], 1)
        self.assertEqual(groups["other"]["sets"], 1)  # unknown names are not dropped
        self.assertEqual(resp.data["total_sets"], 4)
        self.assertEqual(resp.data["groups"][0]["muscle_group"], "chest")  # busiest first

    def test_only_the_callers_own_data_counts(self):
        other = f"Bearer {make_access_token(uuid.uuid4())}"
        self.client.put(
            f"/api/v1/workouts/days/{TODAY}/",
            {"exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": True}]}]},
            format="json",
            HTTP_AUTHORIZATION=other,
        )
        resp = self.client.get("/api/v1/workouts/muscle-distribution/?range=month", HTTP_AUTHORIZATION=self.auth)
        self.assertEqual(resp.data["total_sets"], 0)
        self.assertEqual(resp.data["groups"], [])
        # An unknown range quietly means the default week instead of erroring.
        self.assertEqual(
            self.client.get("/api/v1/workouts/muscle-distribution/?range=bogus", HTTP_AUTHORIZATION=self.auth).status_code,
            200,
        )
