from django.contrib import admin

from .models import DailyVolumeSnapshot, ExerciseDailyBest, PersonalRecord, StreakState


@admin.register(PersonalRecord)
class PersonalRecordAdmin(admin.ModelAdmin):
    list_display = ["user_id", "exercise_name", "best_weight", "best_reps", "trend", "best_date"]
    search_fields = ["exercise_name"]


@admin.register(ExerciseDailyBest)
class ExerciseDailyBestAdmin(admin.ModelAdmin):
    list_display = ["user_id", "exercise_name", "date", "weight", "reps"]
    search_fields = ["exercise_name"]


@admin.register(DailyVolumeSnapshot)
class DailyVolumeSnapshotAdmin(admin.ModelAdmin):
    list_display = ["user_id", "date", "volume", "calories"]


@admin.register(StreakState)
class StreakStateAdmin(admin.ModelAdmin):
    list_display = ["user_id", "current_streak", "longest_streak", "last_logged_date"]
