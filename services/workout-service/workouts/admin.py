from django.contrib import admin

from .models import CustomTag, ExerciseLibraryItem, WorkoutDay, WorkoutTemplate


@admin.register(CustomTag)
class CustomTagAdmin(admin.ModelAdmin):
    list_display = ["name", "user_id", "color", "created_at"]


@admin.register(ExerciseLibraryItem)
class ExerciseLibraryItemAdmin(admin.ModelAdmin):
    """Curated exercise library is managed here by staff (owner_user_id left blank)."""

    list_display = ["name", "primary_tag", "muscle_group", "is_curated"]
    list_filter = ["primary_tag", "is_curated"]
    search_fields = ["name"]


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ["user_id", "date", "tag"]
    list_filter = ["tag"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(WorkoutTemplate)
class WorkoutTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "user_id", "created_at"]
