from django.contrib import admin
from django.urls import include, path

from notifications.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", HealthView.as_view()),
    path("api/", include("notifications.urls")),
]
