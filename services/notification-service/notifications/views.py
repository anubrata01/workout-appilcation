from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import DeviceToken, ReminderPreference
from .serializers import DeviceTokenLookupSerializer, DeviceTokenSerializer, ReminderPreferenceSerializer


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": settings.SERVICE_NAME})


class ReminderPreferenceView(APIView):
    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = "notifications-write" if self.request.method == "PUT" else "notifications-read"
        return super().get_throttles()

    def get(self, request):
        pref, _ = ReminderPreference.objects.get_or_create(user_id=request.user.id)
        return Response(ReminderPreferenceSerializer(pref).data)

    def put(self, request):
        pref, _ = ReminderPreference.objects.get_or_create(user_id=request.user.id)
        serializer = ReminderPreferenceSerializer(pref, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DeviceTokenView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "notifications-write"

    def post(self, request):
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        DeviceToken.objects.update_or_create(
            fcm_token=serializer.validated_data["fcm_token"], defaults={"user_id": request.user.id}
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request):
        serializer = DeviceTokenLookupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        DeviceToken.objects.filter(
            fcm_token=serializer.validated_data["fcm_token"], user_id=request.user.id
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
