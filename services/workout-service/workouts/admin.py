from django.contrib import admin

from .models import ExerciseLibraryItem, WorkoutDay, WorkoutTemplate


@admin.register(ExerciseLibraryItem)
class ExerciseLibraryItemAdmin(admin.ModelAdmin):
    """Curated exercise library is managed here by staff (owner_user_id left blank)."""

    list_display = ["name", "category", "is_bodyweight", "muscle_group", "is_curated"]
    list_filter = ["category", "is_bodyweight", "is_curated"]
    search_fields = ["name"]


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ["user_id", "date", "duration_seconds"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(WorkoutTemplate)
class WorkoutTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "user_id", "created_at"]
