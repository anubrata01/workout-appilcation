from rest_framework import serializers

from .models import Exercise, ExerciseLibraryItem, SetEntry, TemplateExerciseItem, WorkoutDay, WorkoutTemplate


class SetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SetEntry
        fields = ["weight", "reps", "duration_minutes", "distance_km", "rest_seconds", "done", "set_type"]


class ExerciseSerializer(serializers.ModelSerializer):
    sets = SetEntrySerializer(many=True)
    id = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = ["id", "name", "category", "note", "sets"]

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
                day=day,
                name=ex["name"],
                category=ex.get("category", "strength"),
                note=ex.get("note", ""),
                order=next_order + i,
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


class ExerciseLibraryItemListSerializer(serializers.ModelSerializer):
    """Lean shape for list responses, no description, so ~900 rows stay small."""

    class Meta:
        model = ExerciseLibraryItem
        fields = ["id", "name", "category", "is_bodyweight", "muscle_group", "equipment", "image_url", "is_curated"]


class TemplateExerciseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateExerciseItem
        fields = ["name", "order", "category", "is_bodyweight", "default_sets"]
        extra_kwargs = {"order": {"required": False}}


class WorkoutTemplateSerializer(serializers.ModelSerializer):
    items = TemplateExerciseItemSerializer(many=True)

    class Meta:
        model = WorkoutTemplate
        fields = ["id", "name", "items", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Routine needs a name.")
        user_id = self.context.get("user_id")
        qs = WorkoutTemplate.objects.filter(user_id=user_id, name=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if user_id is not None and qs.exists():
            raise serializers.ValidationError("You already have a routine with that name.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("A routine needs at least one exercise.")
        return value

    @staticmethod
    def _write_items(template, items_data):
        for i, item in enumerate(items_data):
            TemplateExerciseItem.objects.create(
                template=template,
                name=item["name"],
                order=i,
                category=item.get("category", "strength"),
                is_bodyweight=item.get("is_bodyweight", False),
                default_sets=item.get("default_sets", 3),
            )

    def create(self, validated_data):
        user_id = self.context["user_id"]
        items_data = validated_data.pop("items", [])
        template = WorkoutTemplate.objects.create(user_id=user_id, name=validated_data["name"])
        self._write_items(template, items_data)
        return template

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        if "name" in validated_data:
            instance.name = validated_data["name"]
            instance.save(update_fields=["name", "updated_at"])
        if items_data is not None:
            instance.items.all().delete()
            self._write_items(instance, items_data)
        return instance
