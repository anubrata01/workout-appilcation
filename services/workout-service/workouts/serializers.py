from rest_framework import serializers

from .models import Exercise, ExerciseLibraryItem, SetEntry, TemplateExerciseItem, WorkoutDay, WorkoutTemplate


class SetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SetEntry
        fields = ["weight", "reps", "duration_minutes", "distance_km", "rest_seconds", "done"]


class ExerciseSerializer(serializers.ModelSerializer):
    sets = SetEntrySerializer(many=True)
    id = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = ["id", "name", "category", "sets"]

    def get_id(self, obj):
        return f"ex-{obj.id}"


class WorkoutDaySerializer(serializers.ModelSerializer):
    date = serializers.DateField()
    duration_seconds = serializers.IntegerField(required=False, allow_null=True)
    started_at = serializers.DateTimeField(required=False, allow_null=True)
    finished_at = serializers.DateTimeField(required=False, allow_null=True)
    exercises = ExerciseSerializer(many=True)

    class Meta:
        model = WorkoutDay
        fields = ["date", "duration_seconds", "started_at", "finished_at", "exercises"]

    def create(self, validated_data):
        """
        Each PUT represents one FINISHED SESSION's worth of new data (app
        flow doc 2.6), not the day's complete state. A second session the
        same day appends its exercises to what's already logged and adds its
        own elapsed time to the day's running total, instead of overwriting
        the first session — that was a real bug: two workouts in one day
        used to silently erase the first one's log. The gap between two
        sessions is never counted, since neither session's own timer ran
        during it — summing each session's own elapsed time already excludes
        it, with no extra bookkeeping needed.
        """
        user_id = self.context["user_id"]
        exercises_data = validated_data.pop("exercises", [])
        incoming_duration = validated_data.get("duration_seconds") or 0
        incoming_started = validated_data.get("started_at")
        incoming_finished = validated_data.get("finished_at")

        day = WorkoutDay.objects.filter(user_id=user_id, date=validated_data["date"]).first()
        if day is None:
            day = WorkoutDay.objects.create(
                user_id=user_id,
                date=validated_data["date"],
                duration_seconds=incoming_duration,
                started_at=incoming_started,
                finished_at=incoming_finished,
            )
            next_order = 0
        else:
            day.duration_seconds = (day.duration_seconds or 0) + incoming_duration
            if day.started_at is None:
                day.started_at = incoming_started
            day.finished_at = incoming_finished
            day.save(update_fields=["duration_seconds", "started_at", "finished_at"])
            next_order = day.exercises.count()

        for i, ex in enumerate(exercises_data):
            sets_data = ex.pop("sets", [])
            exercise = Exercise.objects.create(
                day=day, name=ex["name"], category=ex.get("category", "strength"), order=next_order + i
            )
            for j, s in enumerate(sets_data):
                SetEntry.objects.create(exercise=exercise, order=j, **s)
        return day


class ExerciseLibraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseLibraryItem
        fields = [
            "id",
            "name",
            "category",
            "is_bodyweight",
            "muscle_group",
            "equipment",
            "image_url",
            "description",
            "is_curated",
        ]
        read_only_fields = ["id", "is_curated"]


class TemplateExerciseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateExerciseItem
        fields = ["name", "order"]


class WorkoutTemplateSerializer(serializers.ModelSerializer):
    items = TemplateExerciseItemSerializer(many=True)

    class Meta:
        model = WorkoutTemplate
        fields = ["id", "name", "items", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user_id = self.context["user_id"]
        items_data = validated_data.pop("items", [])
        template = WorkoutTemplate.objects.create(user_id=user_id, name=validated_data["name"])
        for i, item in enumerate(items_data):
            TemplateExerciseItem.objects.create(template=template, name=item["name"], order=item.get("order", i))
        return template
