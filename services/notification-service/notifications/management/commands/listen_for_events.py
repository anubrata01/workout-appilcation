import json
import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from notifications.models import DeviceToken, ReminderPreference

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Subscribes to account_deleted and purges this service's slice of user data (TRD 7)."""

    help = "Subscribes to account_deleted and purges reminder prefs/device tokens for deleted accounts."

    def handle(self, *args, **options):
        import redis

        if not settings.REDIS_URL:
            raise SystemExit("REDIS_URL is not configured — nothing to listen to.")

        client = redis.from_url(settings.REDIS_URL)
        pubsub = client.pubsub()
        pubsub.subscribe("account_deleted")
        self.stdout.write(self.style.SUCCESS("Listening for account_deleted events..."))

        for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                payload = json.loads(message["data"])
                user_id = payload["user_id"]
                ReminderPreference.objects.filter(user_id=user_id).delete()
                DeviceToken.objects.filter(user_id=user_id).delete()
            except Exception:
                logger.exception("Failed to process account_deleted event")
