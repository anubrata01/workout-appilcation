import time
import uuid
from pathlib import Path

import jwt
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import DailyVolumeSnapshot, ExerciseDailyBest, PersonalRecord, StreakState
from .recompute import recompute_for_day

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


PUSH_DAY = {
    "tag": "push",
    "exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": True}]}],
}


class RecomputeTests(TestCase):
    def test_first_log_creates_pr_snapshot_and_streak(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-25", PUSH_DAY)

        pr = PersonalRecord.objects.get(user_id=user_id, exercise_name="Bench Press")
        self.assertEqual(pr.best_weight, 60)
        self.assertEqual(pr.trend, "up")

        snapshot = DailyVolumeSnapshot.objects.get(user_id=user_id, date="2026-07-25")
        self.assertEqual(snapshot.volume, 480)  # 60kg x 8 reps

        streak = StreakState.objects.get(user_id=user_id)
        self.assertEqual(streak.current_streak, 1)

    def test_consecutive_days_extend_streak(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-23", PUSH_DAY)
        recompute_for_day(user_id, "2026-07-24", PUSH_DAY)
        recompute_for_day(user_id, "2026-07-25", PUSH_DAY)

        streak = StreakState.objects.get(user_id=user_id)
        self.assertEqual(streak.current_streak, 3)
        self.assertEqual(streak.longest_streak, 3)

    def test_heavier_set_sets_new_pr_lighter_does_not(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-20", PUSH_DAY)  # 60kg

        heavier = {
            "tag": "push",
            "exercises": [{"name": "Bench Press", "sets": [{"weight": 65, "reps": 5, "done": True}]}],
        }
        recompute_for_day(user_id, "2026-07-22", heavier)
        pr = PersonalRecord.objects.get(user_id=user_id, exercise_name="Bench Press")
        self.assertEqual(pr.best_weight, 65)
        self.assertEqual(pr.trend, "up")
        self.assertEqual(pr.previous_weight, 60)

        lighter = {
            "tag": "push",
            "exercises": [{"name": "Bench Press", "sets": [{"weight": 40, "reps": 5, "done": True}]}],
        }
        recompute_for_day(user_id, "2026-07-23", lighter)
        pr.refresh_from_db()
        self.assertEqual(pr.best_weight, 65)  # unchanged — 40kg wasn't a new best
        self.assertEqual(pr.trend, "down")

    def test_last_performed_tracks_most_recent_regardless_of_pr(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-20", PUSH_DAY)  # 60kg — also the PR

        lighter = {
            "tag": "push",
            "exercises": [{"name": "Bench Press", "sets": [{"weight": 40, "reps": 5, "done": True}]}],
        }
        recompute_for_day(user_id, "2026-07-24", lighter)  # not a PR, but the most recent session
        pr = PersonalRecord.objects.get(user_id=user_id, exercise_name="Bench Press")
        self.assertEqual(pr.best_weight, 60)  # PR unchanged
        self.assertEqual(pr.last_weight, 40)  # last session reflects the lighter, more recent one
        self.assertEqual(str(pr.last_date), "2026-07-24")

    def test_editing_an_older_day_does_not_move_last_performed_backward(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-24", PUSH_DAY)

        older_edit = {
            "tag": "push",
            "exercises": [{"name": "Bench Press", "sets": [{"weight": 55, "reps": 8, "done": True}]}],
        }
        recompute_for_day(user_id, "2026-07-20", older_edit)  # editing a day before the most recent one
        pr = PersonalRecord.objects.get(user_id=user_id, exercise_name="Bench Press")
        self.assertEqual(str(pr.last_date), "2026-07-24")  # still the more recent date, not the one just edited
        self.assertEqual(pr.last_weight, 60)

    def test_removing_the_only_logged_set_deletes_the_pr(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-25", PUSH_DAY)
        self.assertTrue(PersonalRecord.objects.filter(user_id=user_id, exercise_name="Bench Press").exists())

        emptied_day = {"tag": "push", "exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 8, "done": False}]}]}
        recompute_for_day(user_id, "2026-07-25", emptied_day)  # set unmarked as done, not deleted from the payload
        self.assertFalse(PersonalRecord.objects.filter(user_id=user_id, exercise_name="Bench Press").exists())
        self.assertFalse(ExerciseDailyBest.objects.filter(user_id=user_id, exercise_name="Bench Press").exists())

    def test_removing_exercise_entirely_from_payload_also_deletes_the_pr(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-25", PUSH_DAY)

        day_without_bench = {"tag": "push", "exercises": []}
        recompute_for_day(user_id, "2026-07-25", day_without_bench)
        self.assertFalse(PersonalRecord.objects.filter(user_id=user_id, exercise_name="Bench Press").exists())

    def test_deleting_the_pr_setting_day_falls_back_to_next_best(self):
        user_id = str(uuid.uuid4())
        heavier = {"tag": "push", "exercises": [{"name": "Bench Press", "sets": [{"weight": 65, "reps": 5, "done": True}]}]}
        recompute_for_day(user_id, "2026-07-20", PUSH_DAY)  # 60kg
        recompute_for_day(user_id, "2026-07-22", heavier)  # 65kg — the new PR
        pr = PersonalRecord.objects.get(user_id=user_id, exercise_name="Bench Press")
        self.assertEqual(pr.best_weight, 65)

        # Delete the 65kg day entirely (e.g. the user removed that exercise from that day).
        recompute_for_day(user_id, "2026-07-22", {"tag": "push", "exercises": []})
        pr.refresh_from_db()
        self.assertEqual(pr.best_weight, 60)  # falls back to the 20th's 60kg — no longer stuck at a value that no longer exists
        self.assertEqual(str(pr.best_date), "2026-07-20")

    def test_deleting_last_remaining_history_removes_the_pr_and_snapshot_volume(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-25", PUSH_DAY)
        recompute_for_day(user_id, "2026-07-25", {"tag": "push", "exercises": []})

        self.assertFalse(PersonalRecord.objects.filter(user_id=user_id, exercise_name="Bench Press").exists())
        snapshot = DailyVolumeSnapshot.objects.get(user_id=user_id, date="2026-07-25")
        self.assertEqual(snapshot.volume, 0)  # reports should reflect the deletion too, not just PRs
        streak = StreakState.objects.get(user_id=user_id)
        self.assertEqual(streak.current_streak, 0)  # no logged days left


class AnalyticsApiTests(APITestCase):
    def test_reports_and_prs_reflect_recomputed_data(self):
        user_id = str(uuid.uuid4())
        recompute_for_day(user_id, "2026-07-25", PUSH_DAY)
        auth = f"Bearer {make_access_token(user_id)}"

        prs = self.client.get("/api/v1/analytics/prs/", HTTP_AUTHORIZATION=auth)
        self.assertEqual(prs.status_code, 200)
        self.assertEqual(prs.data[0]["name"], "Bench Press")
        self.assertEqual(prs.data[0]["lastWeight"], 60)
        self.assertEqual(prs.data[0]["lastDate"], "2026-07-25")

        streak = self.client.get("/api/v1/analytics/streak/", HTTP_AUTHORIZATION=auth)
        self.assertEqual(streak.data["currentStreak"], 1)

    def test_another_user_sees_no_data(self):
        user_a = str(uuid.uuid4())
        user_b = str(uuid.uuid4())
        recompute_for_day(user_a, "2026-07-25", PUSH_DAY)

        prs = self.client.get("/api/v1/analytics/prs/", HTTP_AUTHORIZATION=f"Bearer {make_access_token(user_b)}")
        self.assertEqual(prs.data, [])

    def test_custom_tag_name_is_not_mangled_in_reports(self):
        from datetime import date as _date

        user_id = str(uuid.uuid4())
        today_str = _date.today().isoformat()
        recompute_for_day(
            user_id,
            today_str,
            {"tag": "HIIT Day", "exercises": [{"name": "Kettlebell Swing", "sets": [{"weight": 16, "reps": 20, "done": True}]}]},
        )

        report = self.client.get(
            "/api/v1/analytics/reports/?range=week", HTTP_AUTHORIZATION=f"Bearer {make_access_token(user_id)}"
        )
        tags = {entry["tag"] for entry in report.data["tagSplit"]}
        self.assertIn("HIIT Day", tags)  # not "Hiit Day" — a custom tag's casing is never reformatted

    def test_built_in_tag_gets_its_display_label(self):
        from datetime import date as _date

        user_id = str(uuid.uuid4())
        today_str = _date.today().isoformat()
        recompute_for_day(user_id, today_str, PUSH_DAY)  # tag: "push"

        report = self.client.get(
            "/api/v1/analytics/reports/?range=week", HTTP_AUTHORIZATION=f"Bearer {make_access_token(user_id)}"
        )
        tags = {entry["tag"] for entry in report.data["tagSplit"]}
        self.assertIn("Push", tags)
