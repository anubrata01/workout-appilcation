from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .events import publish_set_logged
from .models import CustomTag, Exercise, ExerciseLibraryItem, TemplateExerciseItem, WorkoutDay, WorkoutTemplate
from .serializers import (
    CustomTagSerializer,
    ExerciseLibraryItemSerializer,
    WorkoutDaySerializer,
    WorkoutTemplateSerializer,
)


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
    """GET /api/v1/workouts/library/?search=&tag=&muscle_group= — curated items + the caller's own custom ones."""

    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "workout-write" if self.request.method == "POST" else "workout-read"
        return super().get_throttles()

    def get(self, request):
        qs = ExerciseLibraryItem.objects.filter(
            Q(owner_user_id__isnull=True) | Q(owner_user_id=request.user.id)
        )
        search = request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        tag = request.query_params.get("tag")
        if tag:
            qs = qs.filter(primary_tag=tag)
        muscle_group = request.query_params.get("muscle_group")
        if muscle_group:
            qs = qs.filter(muscle_group__iexact=muscle_group)
        return Response(ExerciseLibraryItemSerializer(qs, many=True).data)

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


class WorkoutTemplateApplyView(APIView):
    """POST /api/v1/workouts/templates/<id>/apply/ — returns the exercise list to seed into a day (app flow doc 2.7)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workout-write"

    def post(self, request, template_id):
        template = get_object_or_404(WorkoutTemplate, id=template_id, user_id=request.user.id)
        items = TemplateExerciseItem.objects.filter(template=template).order_by("order")
        return Response([{"name": i.name} for i in items])


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
                    "sets": [{"weight": s.weight, "reps": s.reps, "done": s.done} for s in exercise.sets.all()],
                }
        return Response(results)


class CustomTagListView(APIView):
    """GET/POST /api/v1/workouts/tags/ — a user's own session tags, alongside the 6 built-in ones."""

    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "workout-write" if self.request.method == "POST" else "workout-read"
        return super().get_throttles()

    def get(self, request):
        tags = CustomTag.objects.filter(user_id=request.user.id)
        return Response(CustomTagSerializer(tags, many=True).data)

    def post(self, request):
        serializer = CustomTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tag = serializer.save(user_id=request.user.id)
        return Response(CustomTagSerializer(tag).data, status=status.HTTP_201_CREATED)
