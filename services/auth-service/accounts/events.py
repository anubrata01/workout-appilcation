import json
import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL")
CHANNEL = "account_deleted"


def publish_account_deleted(user_id: str) -> None:
    """
    Fans out to Workout/Analytics/Notification services so they purge their own
    user-scoped data (TRD 7). Best-effort: a Redis hiccup must not block the
    delete request the user is waiting on — Auth has already flipped is_active
    to False and revoked all refresh tokens, which is the part that matters
    immediately. Consumers are expected to reconcile via a periodic sweep too,
    not rely on this pub/sub message alone (TRD 7's retry/dead-letter note).
    """
    if not REDIS_URL:
        logger.warning("REDIS_URL not configured; skipping account_deleted publish for %s", user_id)
        return
    try:
        import redis

        client = redis.from_url(REDIS_URL)
        client.publish(CHANNEL, json.dumps({"user_id": str(user_id)}))
    except Exception:
        logger.exception("Failed to publish account_deleted event for %s", user_id)
