from rest_framework import serializers

from .models import CustomTag, Exercise, ExerciseLibraryItem, SetEntry, TemplateExerciseItem, WorkoutDay, WorkoutTemplate


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
    exercises = ExerciseSerializer(many=True)

    class Meta:
        model = WorkoutDay
        fields = ["date", "tag", "exercises"]

    def create(self, validated_data):
        """
        The client always PUTs the *whole* day on every change (app flow doc 2.6),
        same contract as the prototype's WorkoutDaySerializer. Upsert the day
        scoped to user_id (passed in via context, never trusted from the payload),
        then wipe and rewrite its exercises/sets from what was sent.
        """
        user_id = self.context["user_id"]
        exercises_data = validated_data.pop("exercises", [])
        day, _ = WorkoutDay.objects.update_or_create(
            user_id=user_id,
            date=validated_data["date"],
            defaults={"tag": validated_data.get("tag")},
        )
        day.exercises.all().delete()
        for i, ex in enumerate(exercises_data):
            sets_data = ex.pop("sets", [])
            exercise = Exercise.objects.create(day=day, name=ex["name"], order=i)
            for j, s in enumerate(sets_data):
                SetEntry.objects.create(exercise=exercise, order=j, **s)
        return day


class CustomTagSerializer(serializers.ModelSerializer):
    color = serializers.RegexField(regex=r"^#[0-9A-Fa-f]{6}$")

    class Meta:
        model = CustomTag
        fields = ["id", "name", "color", "created_at"]
        read_only_fields = ["id", "created_at"]


class ExerciseLibraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseLibraryItem
        fields = ["id", "name", "primary_tag", "muscle_group", "equipment", "image_url", "description", "is_curated"]
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
