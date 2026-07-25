import uuid

from django.db import models


class PersonalRecord(models.Model):
    """Best completed set per exercise name, per user (schema doc 3)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    exercise_name = models.CharField(max_length=120)
    best_weight = models.FloatField()
    best_reps = models.PositiveIntegerField()
    best_date = models.DateField()
    previous_weight = models.FloatField(null=True, blank=True)
    trend = models.CharField(max_length=10, choices=[("up", "up"), ("down", "down"), ("same", "same")])
    # Distinct from best_* — the most recent time this exercise was logged at
    # all, whether or not it was a PR (app flow doc: "show the last date of
    # exercise and my record" when picking an exercise to log again).
    last_weight = models.FloatField(null=True, blank=True)
    last_reps = models.PositiveIntegerField(null=True, blank=True)
    last_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-best_date"]
        constraints = [
            models.UniqueConstraint(fields=["user_id", "exercise_name"], name="unique_user_exercise_pr")
        ]


class ExerciseDailyBest(models.Model):
    """
    The source of truth PersonalRecord is recomputed from — one row per
    (user, exercise, date), holding that day's best set for that exercise.

    PersonalRecord alone can only ever grow if it's updated incrementally
    (compare today's set to the stored best); it has no way to *shrink* when a
    set or a whole exercise gets deleted, because it doesn't remember what any
    other day looked like. This table does, so a deletion can correctly fall
    the record back to whatever the next-best remaining day was — or drop it
    to nothing if there's no history left at all.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    exercise_name = models.CharField(max_length=120)
    date = models.DateField()
    weight = models.FloatField()
    reps = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "exercise_name", "date"], name="unique_user_exercise_date_best"
            )
        ]


class DailyVolumeSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    date = models.DateField()
    volume = models.FloatField(default=0)
    calories = models.PositiveIntegerField(default=0)
    tag = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["user_id", "date"], name="unique_user_date_snapshot")
        ]


class StreakState(models.Model):
    user_id = models.UUIDField(primary_key=True)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_logged_date = models.DateField(null=True, blank=True)
