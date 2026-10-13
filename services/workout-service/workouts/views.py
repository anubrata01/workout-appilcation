from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .events import publish_set_logged
from .models import Exercise, ExerciseLibraryItem, TemplateExerciseItem, WorkoutDay, WorkoutTemplate
from .serializers import (
    ExerciseLibraryItemListSerializer,
    ExerciseLibraryItemSerializer,
    WorkoutDaySerializer,
    WorkoutTemplateSerializer,
)

# The curated catalogue is ~900 static rows that only change when the seed
# command runs, so each (search, category, muscle) combination is cached in
# process memory instead of being re-queried on every picker open. Per-user
# custom exercises are tiny and always read fresh, then merged in. It is a
# per-worker LocMem cache, so a re-seed becomes visible within one TTL.
LIBRARY_CACHE_SECONDS = 600
LIBRARY_DEFAULT_LIMIT = 100
LIBRARY_MAX_LIMIT = 500


def _int_param(request, name, default, minimum=0, maximum=None):
    try:
        value = int(request.query_params.get(name, default))
    except (TypeError, ValueError):
        return default
    value = max(minimum, value)
    return min(value, maximum) if maximum is not None else value


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": settings.SERVICE_NAME})


class WorkoutDayView(APIView):
    """
    GET  /api/v1/workouts/days/<date>/  -> the caller's day, or null if nothing logged
    PUT  /api/v1/workouts/days/<date>/  -> upserts the whole day, scoped to request.user.id

    Same upsert-the-whole-day contract as the prototype's WorkoutDayView (app flow
    doc 2.6) — the change with the highest security consequence versus the
    prototype is that every query below is scoped to request.user.id, never to a
    client-supplied id (implementation plan Phase 2).
    """

    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "workout-write" if self.request.method == "PUT" else "workout-read"
        return super().get_throttles()

    def get(self, request, date_str):
        day = WorkoutDay.objects.filter(user_id=request.user.id, date=date_str).first()
        if day is None:
            return Response(None)
        return Response(WorkoutDaySerializer(day).data)

    def put(self, request, date_str):
        payload = dict(request.data)
        payload["date"] = date_str
        serializer = WorkoutDaySerializer(data=payload, context={"user_id": request.user.id})
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["date"] > timezone.localdate():
            return Response(
                {"detail": "Can't log or edit a future date."}, status=status.HTTP_400_BAD_REQUEST
            )

        day = serializer.save()
        result = WorkoutDaySerializer(day).data

        # Always publish, even when nothing is "done" (or the day is now
        # empty) — Analytics Service needs to hear about removals too, not
        # just new PRs, so it can recompute (and correctly drop) stale data
        # instead of only ever growing (backend schema doc 3).
        publish_set_logged(str(request.user.id), date_str, result)

        return Response(result)


class ExerciseLibraryView(APIView):
    """GET /api/v1/workouts/library/?search=&category=&muscle_group= — curated items + the caller's own custom ones."""

    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "workout-write" if self.request.method == "POST" else "workout-read"
        return super().get_throttles()

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        category = request.query_params.get("category", "").strip()
        muscle_group = request.query_params.get("muscle_group", "").strip()
        limit = _int_param(request, "limit", LIBRARY_DEFAULT_LIMIT, minimum=1, maximum=LIBRARY_MAX_LIMIT)
        offset = _int_param(request, "offset", 0)

        def filtered(qs):
            if search:
                qs = qs.filter(name__icontains=search)
            if category:
                qs = qs.filter(category=category)
            if muscle_group:
                qs = qs.filter(muscle_group__iexact=muscle_group)
            return qs

        cache_key = f"lib:curated:{search.lower()}:{category}:{muscle_group.lower()}"
        curated = cache.get(cache_key)
        if curated is None:
            qs = filtered(ExerciseLibraryItem.objects.filter(owner_user_id__isnull=True))
            curated = [dict(row) for row in ExerciseLibraryItemListSerializer(qs, many=True).data]
            cache.set(cache_key, curated, LIBRARY_CACHE_SECONDS)

        own_qs = filtered(ExerciseLibraryItem.objects.filter(owner_user_id=request.user.id))
        own = [dict(row) for row in ExerciseLibraryItemListSerializer(own_qs, many=True).data]
        own_names = {row["name"].lower() for row in own}
        merged = own + [row for row in curated if row["name"].lower() not in own_names]
        merged.sort(key=lambda row: row["name"].lower())

        response = Response(merged[offset : offset + limit])
        response["Cache-Control"] = "private, max-age=60"
        return response

    def post(self, request):
        serializer = ExerciseLibraryItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(owner_user_id=request.user.id, is_curated=False)
        return Response(ExerciseLibraryItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WorkoutTemplateListView(APIView):
    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "workout-write" if self.request.method == "POST" else "workout-read"
        return super().get_throttles()

    def get(self, request):
        templates = WorkoutTemplate.objects.filter(user_id=request.user.id).prefetch_related("items")
        return Response(WorkoutTemplateSerializer(templates, many=True).data)

    def post(self, request):
        serializer = WorkoutTemplateSerializer(data=request.data, context={"user_id": request.user.id})
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        return Response(WorkoutTemplateSerializer(template).data, status=status.HTTP_201_CREATED)


class WorkoutTemplateDetailView(APIView):
    """GET/PUT/DELETE /api/v1/workouts/templates/<id>/ - always scoped to request.user.id."""

    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "workout-read" if self.request.method == "GET" else "workout-write"
        return super().get_throttles()

    def _get(self, request, template_id):
        return get_object_or_404(WorkoutTemplate, id=template_id, user_id=request.user.id)

    def get(self, request, template_id):
        return Response(WorkoutTemplateSerializer(self._get(request, template_id)).data)

    def put(self, request, template_id):
        template = self._get(request, template_id)
        serializer = WorkoutTemplateSerializer(template, data=request.data, context={"user_id": request.user.id})
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        return Response(WorkoutTemplateSerializer(template).data)

    def delete(self, request, template_id):
        self._get(request, template_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkoutTemplateApplyView(APIView):
    """POST /api/v1/workouts/templates/<id>/apply/ - returns the exercise list to seed into a session (app flow doc 2.7)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workout-write"

    def post(self, request, template_id):
        template = get_object_or_404(WorkoutTemplate, id=template_id, user_id=request.user.id)
        items = TemplateExerciseItem.objects.filter(template=template).order_by("order")
        return Response(
            [
                {
                    "name": i.name,
                    "category": i.category,
                    "is_bodyweight": i.is_bodyweight,
                    "default_sets": i.default_sets,
                }
                for i in items
            ]
        )


class ExerciseDetailView(APIView):
    """GET /api/v1/workouts/library/detail/?name= - the full library entry (description, equipment) for one exercise.
    The list endpoint omits description to keep ~900 rows light."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workout-read"

    def get(self, request):
        name = request.query_params.get("name", "").strip()
        if not name:
            return Response({"detail": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        item = (
            ExerciseLibraryItem.objects.filter(name__iexact=name)
            .filter(Q(owner_user_id__isnull=True) | Q(owner_user_id=request.user.id))
            .order_by("-owner_user_id")
            .first()
        )
        if item is None:
            return Response(None)
        response = Response(ExerciseLibraryItemSerializer(item).data)
        response["Cache-Control"] = "private, max-age=300"
        return response


class MuscleDistributionView(APIView):
    """
    GET /api/v1/workouts/muscle-distribution/?range=week|month|quarter

    Sets (and volume) per muscle group over the window, counting only done,
    non-warm-up strength sets. Muscle group comes from joining the logged
    exercise's name against the library (the caller's own entry wins over the
    curated one); a logged name with no library match lands in "other".
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workout-read"
    RANGE_DAYS = {"week": 7, "month": 30, "quarter": 90}

    def get(self, request):
        range_param = request.query_params.get("range", "week")
        days = self.RANGE_DAYS.get(range_param, 7)
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)

        muscle_by_name = {}
        library = ExerciseLibraryItem.objects.filter(
            Q(owner_user_id__isnull=True) | Q(owner_user_id=request.user.id)
        ).values_list("name", "muscle_group", "owner_user_id")
        for name, muscle, owner in sorted(library, key=lambda r: r[2] is not None):
            muscle_by_name[name.lower()] = muscle or "other"

        groups = {}
        total_sets = 0
        exercises = Exercise.objects.filter(
            day__user_id=request.user.id, day__date__gte=start, day__date__lte=today, category="strength"
        ).prefetch_related("sets")
        for exercise in exercises:
            muscle = muscle_by_name.get(exercise.name.lower(), "other")
            for s in exercise.sets.all():
                if not s.done or s.set_type == "warmup":
                    continue
                entry = groups.setdefault(muscle, {"muscle_group": muscle, "sets": 0, "volume": 0.0})
                entry["sets"] += 1
                entry["volume"] += s.weight * s.reps
                total_sets += 1

        ordered = sorted(groups.values(), key=lambda g: g["sets"], reverse=True)
        return Response({"range": range_param, "total_sets": total_sets, "groups": ordered})


class ExerciseLastSessionsView(APIView):
    """
    POST /api/v1/workouts/exercises/last-sessions/  body: {"names": [...]}
    -> {"<name>": {"date": "...", "sets": [{weight, reps, done}, ...]} | None, ...}

    The exercise picker's "last time you did this" detail (app flow doc §2.7)
    needs the *entire* set list from the most recent session, not just the
    single best set — that's raw log data Workout Service actually owns, so
    it's served from here rather than Analytics Service, which deliberately
    only keeps derived best-per-day aggregates (schema doc 3), not full set
    history. A name with no matching history returns null — never fabricated
    or stale data; if it's not really in the log, it's not "linked".
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workout-read"

    def post(self, request):
        names = request.data.get("names", [])
        if not isinstance(names, list):
            return Response({})

        results = {}
        for name in names[:50]:  # sane cap — this is for one picker's visible/filtered results, not a bulk export
            exercise = (
                Exercise.objects.filter(day__user_id=request.user.id, name=name)
                .select_related("day")
                .prefetch_related("sets")
                .order_by("-day__date")
                .first()
            )
            if exercise is None or not exercise.sets.exists():
                results[name] = None
            else:
                results[name] = {
                    "date": str(exercise.day.date),
                    "sets": [
                        {
                            "weight": s.weight,
                            "reps": s.reps,
                            "duration_minutes": s.duration_minutes,
                            "distance_km": s.distance_km,
                            "rest_seconds": s.rest_seconds,
                            "done": s.done,
                        }
                        for s in exercise.sets.all()
                    ],
                }
        return Response(results)
