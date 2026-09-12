import uuid

from django.db import models

CATEGORY_CHOICES = [
    ("strength", "Strength"),
    ("cardio", "Cardio"),
]


class WorkoutDay(models.Model):
    """One row per user per calendar date (schema doc 2). user_id is not a DB FK —
    Auth Service owns that table; ownership is enforced at the application layer.

    `duration_seconds` is set once, when a session is finished — sessions are
    no longer autosaved incrementally, so this is null until then."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    date = models.DateField()
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["user_id", "date"], name="unique_user_date")]

    def __str__(self):
        return f"{self.user_id} · {self.date}"


class ExerciseLibraryItem(models.Model):
    """Curated (owner_user_id=None) or user-added custom exercises (schema doc 2)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner_user_id = models.UUIDField(null=True, blank=True, db_index=True)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="strength")
    is_bodyweight = models.BooleanField(default=False)
    muscle_group = models.CharField(max_length=60, blank=True)
    equipment = models.CharField(max_length=60, blank=True)
    image_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    is_curated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["owner_user_id", "name"], name="unique_owner_exercise_name")
        ]

    def __str__(self):
        return self.name


class Exercise(models.Model):
    """A logged exercise instance within a day (schema doc 2)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day = models.ForeignKey(WorkoutDay, related_name="exercises", on_delete=models.CASCADE)
    library_item = models.ForeignKey(
        ExerciseLibraryItem, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    name = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class SetEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exercise = models.ForeignKey(Exercise, related_name="sets", on_delete=models.CASCADE)
    weight = models.FloatField(default=0)
    reps = models.PositiveIntegerField(default=0)
    done = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.weight}kg x {self.reps}"


class WorkoutTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user_id", "name"], name="unique_user_template_name")]

    def __str__(self):
        return self.name


class TemplateExerciseItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(WorkoutTemplate, related_name="items", on_delete=models.CASCADE)
    library_item = models.ForeignKey(
        ExerciseLibraryItem, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    name = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
