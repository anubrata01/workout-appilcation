import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = os.environ.get("DEBUG", "False") == "True"


def _normalize_db_url(url: str) -> str:
    """SQLAlchemy needs the psycopg3 dialect spelled out — the other
    services' DATABASE_URL convention (postgres:// or plain postgresql://)
    doesn't specify a driver, since Django's dj_database_url picks one on its
    own."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = _normalize_db_url(os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"))

CORS_ALLOWED_ORIGINS = [o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o]

# --- JWT verification only — this service never signs a token, only checks
# one signed by Auth Service (same convention as the Django services). ---
JWT_ISSUER = os.environ.get("JWT_ISSUER", "loaded-auth-service")


def _read_key() -> str:
    inline = os.environ.get("JWT_PUBLIC_KEY")
    if inline:
        return inline.replace("\\n", "\n")
    path = os.environ["JWT_PUBLIC_KEY_PATH"]
    return Path(path).read_text()


JWT_PUBLIC_KEY = _read_key()

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
SERVICE_NAME = "nutrition-service"
