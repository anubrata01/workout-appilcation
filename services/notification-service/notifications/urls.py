from django.urls import path

from . import views

urlpatterns = [
    path("v1/notifications/preferences/", views.ReminderPreferenceView.as_view()),
    path("v1/notifications/device-token/", views.DeviceTokenView.as_view()),
]
