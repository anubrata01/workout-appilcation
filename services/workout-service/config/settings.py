import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ["SECRET_KEY"]
DEBUG = os.environ.get("DEBUG", "False") == "True"
# "*" is fine for local dev (lets a phone on your LAN reach this by IP) — the
# guard below makes it impossible to accidentally run this way in production.
ALLOWED_HOSTS = [h for h in os.environ.get("ALLOWED_HOSTS", "*").split(",") if h]

if not DEBUG:
    if "*" in ALLOWED_HOSTS:
        raise ImproperlyConfigured(
            "ALLOWED_HOSTS must not be '*' when DEBUG=False — set it to your real domain(s)."
        )
    if len(SECRET_KEY) < 50:
        raise ImproperlyConfigured(
            "SECRET_KEY is too short/predictable for production. Generate one with:\n"
            "  python -c \"from django.core.management.utils import get_random_secret_key; "
            'print(get_random_secret_key())"'
        )

    # Kong terminates TLS in front of this service (TRD 2) — trust its
    # X-Forwarded-Proto header rather than requiring this service to see TLS
    # directly, which would otherwise redirect-loop behind a proxy.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    # The Docker HEALTHCHECK hits this container directly on its plain-HTTP
    # port, bypassing Caddy — so it never has X-Forwarded-Proto and would
    # otherwise get redirected to an https:// URL nothing on this port serves.
    SECURE_REDIRECT_EXEMPT = [r"^healthz$"]
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "workouts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "workouts.logging_utils.RequestLoggingMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# NOTE: django.contrib.auth's User model stays the *default* here, but it is only
# ever used for Django admin staff logins (e.g. curating the exercise library).
# Real app users are never rows in this service's DB — see schema doc 5: no
# service queries another service's database directly. API requests are
# authenticated statelessly against Auth Service's public key (below).

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o]

# --- JWT verification only — this service never signs a token, only checks one
# signed by Auth Service. JWTTokenUserAuthentication skips any local DB lookup
# and hands the view a stateless TokenUser built straight from the claims. ---
def _read_key(env_var, path_env_var):
    inline = os.environ.get(env_var)
    if inline:
        return inline.replace("\\n", "\n")
    path = os.environ[path_env_var]
    return Path(path).read_text()


SIMPLE_JWT = {
    "ALGORITHM": "RS256",
    "VERIFYING_KEY": _read_key("JWT_PUBLIC_KEY", "JWT_PUBLIC_KEY_PATH"),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "sub",
    "ISSUER": os.environ.get("JWT_ISSUER", "loaded-auth-service"),
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTTokenUserAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "workout-write": "120/min",
        "workout-read": "300/min",
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "workouts.logging_utils.JsonFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}

SERVICE_NAME = "workout-service"

REDIS_URL = os.environ.get("REDIS_URL")
