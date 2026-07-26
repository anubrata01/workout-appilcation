import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_app = None


def _get_firebase_app():
    """Lazily initializes the Firebase Admin SDK — not at import time, since
    tests and local dev without FCM configured should never need it."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    import firebase_admin
    from firebase_admin import credentials

    if settings.FCM_SERVICE_ACCOUNT_JSON_PATH:
        cred = credentials.Certificate(settings.FCM_SERVICE_ACCOUNT_JSON_PATH)
    elif settings.FCM_SERVICE_ACCOUNT_JSON:
        cred = credentials.Certificate(json.loads(settings.FCM_SERVICE_ACCOUNT_JSON))
    else:
        raise RuntimeError(
            "Neither FCM_SERVICE_ACCOUNT_JSON nor FCM_SERVICE_ACCOUNT_JSON_PATH is set — "
            "can't send push notifications without Firebase credentials."
        )

    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def send_push(fcm_token: str, title: str, body: str) -> bool:
    """Sends one push message. Returns True on success, False on failure —
    callers log the outcome to NotificationLog either way (schema doc 4)."""
    from firebase_admin import messaging
    from firebase_admin.exceptions import FirebaseError

    try:
        app = _get_firebase_app()
        message = messaging.Message(
            token=fcm_token,
            notification=messaging.Notification(title=title, body=body),
        )
        messaging.send(message, app=app)
        return True
    except FirebaseError:
        logger.exception("FCM send failed for token ending in ...%s", fcm_token[-8:])
        return False
