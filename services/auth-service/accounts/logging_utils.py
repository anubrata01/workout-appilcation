import json
import logging
import time


class JsonFormatter(logging.Formatter):
    """One JSON object per log line — request id, service name, level, message (TRD 3)."""

    def format(self, record):
        from django.conf import settings

        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "service": getattr(settings, "SERVICE_NAME", "unknown-service"),
            "message": record.getMessage(),
            "logger": record.name,
        }
        for attr in ("request_id", "user_id", "path", "method", "status_code", "latency_ms"):
            if hasattr(record, attr):
                payload[attr] = getattr(record, attr)
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload)


class RequestLoggingMiddleware:
    """
    Logs one structured line per request. Honors an inbound X-Request-Id (set by
    the gateway once Kong is in front of this service — TRD 5) so one user action
    is traceable across services, and generates one locally when called direct.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger("request")

    def __call__(self, request):
        import uuid

        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        request.request_id = request_id
        start = time.monotonic()
        response = self.get_response(request)
        latency_ms = round((time.monotonic() - start) * 1000, 2)
        user_id = getattr(getattr(request, "user", None), "id", None)
        self.logger.info(
            "request completed",
            extra={
                "request_id": request_id,
                "user_id": str(user_id) if user_id else None,
                "path": request.path,
                "method": request.method,
                "status_code": response.status_code,
                "latency_ms": latency_ms,
            },
        )
        response["X-Request-Id"] = request_id
        return response
