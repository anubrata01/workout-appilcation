from datetime import date, timedelta

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import DailyVolumeSnapshot, ExerciseDailyBest, PersonalRecord, StreakState


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
    """
    GET /api/v1/analytics/exercises/<name>/progress/ — best weight/reps per
    day for one exercise, oldest first. ExerciseDailyBest already holds
    exactly this (schema doc 3 — it's what PersonalRecord's fallback logic
    is recomputed from when a day's data is deleted), so no new table or
    migration is needed here — this just reads it in order instead of only
    ever looking at the single current-best row.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-read"

    def get(self, request, name):
        rows = (
            ExerciseDailyBest.objects.filter(user_id=request.user.id, exercise_name=name)
            .order_by("date")[:100]  # a long enough history to chart without being unbounded
        )
        return Response([{"date": str(r.date), "weight": r.weight, "reps": r.reps} for r in rows])


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

        for i in range(days):
            d = start + timedelta(days=i)
            snap = by_date.get(d)
            volume = snap.volume if snap else 0
            calories = snap.calories if snap else 0
            total_calories += calories
            if snap and snap.volume > 0:
                sessions += 1
            volume_by_day.append({"label": d.strftime("%a"), "volume": volume})

        return Response(
            {
                "volumeByDay": volume_by_day,
                "caloriesThisWeek": total_calories,
                "sessionsThisWeek": sessions,
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
