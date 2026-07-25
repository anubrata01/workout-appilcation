from django.urls import path

from . import views

urlpatterns = [
    path("v1/workouts/days/<str:date_str>/", views.WorkoutDayView.as_view()),
    path("v1/workouts/library/", views.ExerciseLibraryView.as_view()),
    path("v1/workouts/templates/", views.WorkoutTemplateListView.as_view()),
    path("v1/workouts/templates/<uuid:template_id>/apply/", views.WorkoutTemplateApplyView.as_view()),
    path("v1/workouts/tags/", views.CustomTagListView.as_view()),
    path("v1/workouts/exercises/last-sessions/", views.ExerciseLastSessionsView.as_view()),
]
