import json
import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL")
CHANNEL = "set_logged"


def publish_set_logged(user_id: str, date: str, day_data: dict) -> None:
    """
    Fanned out to Analytics (recompute PRs/volume/streak) and Notification
    (streak nudges) — schema doc 2/3. Carries the full day payload (event-carried
    state transfer) rather than just an id, so consumers never need to call back
    into this service's API (or, worse, its database) to get what they need —
    every service still only ever reads its own data store. Best-effort: a save
    must never fail because the event bus hiccupped.
    """
    if not REDIS_URL:
        logger.info("REDIS_URL not configured; skipping set_logged publish for %s/%s", user_id, date)
        return
    try:
        import redis

        client = redis.from_url(REDIS_URL)
        client.publish(CHANNEL, json.dumps({"user_id": str(user_id), "date": date, "day": day_data}))
    except Exception:
        logger.exception("Failed to publish set_logged event for %s/%s", user_id, date)
