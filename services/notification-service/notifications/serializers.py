from rest_framework import serializers

from .models import DeviceToken, ReminderPreference


class ReminderPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderPreference
        fields = ["enabled", "days_of_week", "time_of_day", "timezone"]

    def validate_days_of_week(self, value):
        if not isinstance(value, list) or not all(isinstance(d, int) and 0 <= d <= 6 for d in value):
            raise serializers.ValidationError("days_of_week must be a list of integers 0 (Mon) to 6 (Sun).")
        return value


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["fcm_token"]


class DeviceTokenLookupSerializer(serializers.Serializer):
    """Used to remove an existing token — deliberately not a ModelSerializer, since
    that would attach a UniqueValidator that rejects the very token we're looking
    up to delete."""

    fcm_token = serializers.CharField()
