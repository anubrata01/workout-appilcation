import json
import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from analytics.models import DailyVolumeSnapshot, ExerciseDailyBest, PersonalRecord, StreakState
from analytics.recompute import recompute_for_day

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Long-running consumer for the Redis pub/sub event bus (TRD 2). Run one of
    these per environment (`python manage.py listen_for_events`) alongside the
    web process — it is not an HTTP-serving process itself.
    """

    help = "Subscribes to set_logged and account_deleted and keeps analytics data in sync."

    def handle(self, *args, **options):
        import redis

        if not settings.REDIS_URL:
            raise SystemExit("REDIS_URL is not configured — nothing to listen to.")

        client = redis.from_url(settings.REDIS_URL)
        pubsub = client.pubsub()
        pubsub.subscribe("set_logged", "account_deleted")
        self.stdout.write(self.style.SUCCESS("Listening for set_logged / account_deleted events..."))

        for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                payload = json.loads(message["data"])
                if message["channel"] == b"set_logged":
                    recompute_for_day(payload["user_id"], payload["date"], payload["day"])
                elif message["channel"] == b"account_deleted":
                    self._purge_user(payload["user_id"])
            except Exception:
                logger.exception("Failed to process event on channel %s", message["channel"])

    @staticmethod
    def _purge_user(user_id: str) -> None:
        """Cross-service account deletion (TRD 7) — this service's slice of the purge."""
        PersonalRecord.objects.filter(user_id=user_id).delete()
        ExerciseDailyBest.objects.filter(user_id=user_id).delete()
        DailyVolumeSnapshot.objects.filter(user_id=user_id).delete()
        StreakState.objects.filter(user_id=user_id).delete()
