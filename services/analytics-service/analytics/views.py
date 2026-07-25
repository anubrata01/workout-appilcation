from datetime import date, timedelta

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import DailyVolumeSnapshot, PersonalRecord, StreakState


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": settings.SERVICE_NAME})


class PRListView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-read"

    def get(self, request):
        records = PersonalRecord.objects.filter(user_id=request.user.id)
        return Response(
            [
                {
                    "name": r.exercise_name,
                    "weight": r.best_weight,
                    "reps": r.best_reps,
                    "date": str(r.best_date),
                    "trend": r.trend,
                    "lastWeight": r.last_weight,
                    "lastReps": r.last_reps,
                    "lastDate": str(r.last_date) if r.last_date else None,
                }
                for r in records
            ]
        )


class ExerciseProgressView(APIView):
    """GET /api/v1/analytics/exercises/<name>/progress/ — best weight over time for one exercise."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-read"

    def get(self, request, name):
        record = PersonalRecord.objects.filter(user_id=request.user.id, exercise_name=name).first()
        if record is None:
            return Response([])
        # v2.0 keeps only the current best per exercise (schema doc 3) — a full
        # weight-over-time series needs a history table, flagged as a v2.1 candidate.
        return Response([{"date": str(record.best_date), "weight": record.best_weight, "reps": record.best_reps}])


# Display labels for the 6 built-in tags only — mirrors workout-service's
# TAG_CHOICES (accepted duplication for a solo build, TRD/implementation plan
# Phase 2 note). A custom tag's name IS its display label already (whatever
# the user typed when creating it) and must never be reformatted — doing so
# was exactly the bug where Reports showed a mangled tag name that didn't
# match what the Log tab shows for the same tag.
BUILT_IN_TAG_LABELS = {
    "push": "Push",
    "pull": "Pull",
    "legs": "Legs",
    "upper": "Upper",
    "lower": "Lower",
    "full": "Full Body",
}


def _tag_display_label(tag: str) -> str:
    return BUILT_IN_TAG_LABELS.get(tag, tag)


class ReportView(APIView):
    """GET /api/v1/analytics/reports/?range=week|month (app flow doc 2.9)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-read"

    def get(self, request):
        range_param = request.query_params.get("range", "week")
        days = 7 if range_param == "week" else 30
        today = date.today()
        start = today - timedelta(days=days - 1)

        snapshots = DailyVolumeSnapshot.objects.filter(
            user_id=request.user.id, date__gte=start, date__lte=today
        )
        by_date = {s.date: s for s in snapshots}

        volume_by_day = []
        total_calories = 0
        sessions = 0
        tag_counts: dict[str, int] = {}

        for i in range(days):
            d = start + timedelta(days=i)
            snap = by_date.get(d)
            volume = snap.volume if snap else 0
            calories = snap.calories if snap else 0
            total_calories += calories
            if snap and snap.volume > 0:
                sessions += 1
                tag_key = snap.tag or "Untagged"
                tag_counts[tag_key] = tag_counts.get(tag_key, 0) + 1
            volume_by_day.append({"label": d.strftime("%a"), "volume": volume})

        tag_split = [{"tag": _tag_display_label(t), "value": c} for t, c in tag_counts.items()]

        return Response(
            {
                "volumeByDay": volume_by_day,
                "caloriesThisWeek": total_calories,
                "sessionsThisWeek": sessions,
                "tagSplit": tag_split,
            }
        )


class StreakView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-read"

    def get(self, request):
        streak = StreakState.objects.filter(user_id=request.user.id).first()
        if streak is None:
            return Response({"currentStreak": 0, "longestStreak": 0, "lastLoggedDate": None})
        return Response(
            {
                "currentStreak": streak.current_streak,
                "longestStreak": streak.longest_streak,
                "lastLoggedDate": str(streak.last_logged_date) if streak.last_logged_date else None,
            }
        )
