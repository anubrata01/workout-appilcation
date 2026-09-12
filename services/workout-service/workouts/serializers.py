from rest_framework import serializers

from .models import Exercise, ExerciseLibraryItem, SetEntry, TemplateExerciseItem, WorkoutDay, WorkoutTemplate


class SetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SetEntry
        fields = ["weight", "reps", "done"]


class ExerciseSerializer(serializers.ModelSerializer):
    sets = SetEntrySerializer(many=True)
    id = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = ["id", "name", "sets"]

    def get_id(self, obj):
        return f"ex-{obj.id}"


class WorkoutDaySerializer(serializers.ModelSerializer):
    date = serializers.DateField()
    duration_seconds = serializers.IntegerField(required=False, allow_null=True)
    exercises = ExerciseSerializer(many=True)

    class Meta:
        model = WorkoutDay
        fields = ["date", "duration_seconds", "exercises"]

    def create(self, validated_data):
        """
        The client PUTs the whole finished session in one call (app flow doc
        2.6 — no more incremental autosave). Upsert the day scoped to user_id
        (passed in via context, never trusted from the payload), then wipe
        and rewrite its exercises/sets from what was sent.
        """
        user_id = self.context["user_id"]
        exercises_data = validated_data.pop("exercises", [])
        day, _ = WorkoutDay.objects.update_or_create(
            user_id=user_id,
            date=validated_data["date"],
            defaults={"duration_seconds": validated_data.get("duration_seconds")},
        )
        day.exercises.all().delete()
        for i, ex in enumerate(exercises_data):
            sets_data = ex.pop("sets", [])
            exercise = Exercise.objects.create(day=day, name=ex["name"], order=i)
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
