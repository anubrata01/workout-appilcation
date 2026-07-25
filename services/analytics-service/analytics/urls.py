from django.urls import path

from . import views

urlpatterns = [
    path("v1/analytics/prs/", views.PRListView.as_view()),
    path("v1/analytics/reports/", views.ReportView.as_view()),
    path("v1/analytics/streak/", views.StreakView.as_view()),
    path("v1/analytics/exercises/<str:name>/progress/", views.ExerciseProgressView.as_view()),
]
