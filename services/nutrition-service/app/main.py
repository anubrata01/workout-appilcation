from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ALLOWED_ORIGINS, LOG_LEVEL, SERVICE_NAME
from .logging_utils import RequestLoggingMiddleware, configure_logging
from .routers import nutrition

configure_logging(LOG_LEVEL)

app = FastAPI(title=SERVICE_NAME)

app.add_middleware(CORSMiddleware, allow_origins=CORS_ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(RequestLoggingMiddleware)

app.include_router(nutrition.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": SERVICE_NAME}
