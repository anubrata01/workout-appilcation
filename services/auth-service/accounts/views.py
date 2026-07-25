from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.utils import timezone as dj_timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken as SimpleJWTRefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .events import publish_account_deleted
from .models import PasswordResetToken, RefreshToken, User
from .serializers import (
    GoogleAuthSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RefreshRequestSerializer,
    SignupSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .token_utils import hash_token


def issue_tokens(user: User, device_info: str = "") -> dict:
    """Issues an access+refresh JWT pair and records the refresh token's hash (schema doc 1)."""
    refresh = SimpleJWTRefreshToken.for_user(user)
    refresh["email"] = user.email
    access = refresh.access_token
    access["email"] = user.email

    expires_at = datetime.fromtimestamp(refresh["exp"], tz=timezone.utc)
    RefreshToken.objects.create(
        user=user,
        token_hash=hash_token(str(refresh)),
        expires_at=expires_at,
        device_info=device_info[:120],
    )
    return {"access": str(access), "refresh": str(refresh)}


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": settings.SERVICE_NAME})


class SignupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-write"

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = issue_tokens(user, device_info=request.headers.get("User-Agent", ""))
        return Response(
            {"user": UserSerializer(user).data, **tokens}, status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-write"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = issue_tokens(user, device_info=request.headers.get("User-Agent", ""))
        return Response({"user": UserSerializer(user).data, **tokens})


class GoogleAuthView(APIView):
    """Verifies a Google-issued ID token and logs in / creates the account (TRD 1.3)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-write"

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        try:
            claims = google_id_token.verify_oauth2_token(
                serializer.validated_data["id_token"],
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_401_UNAUTHORIZED)

        google_sub = claims["sub"]
        email = claims["email"].lower()

        user = User.objects.filter(google_sub=google_sub).first()
        if user is None:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "google_sub": google_sub,
                    "display_name": claims.get("name", ""),
                    "avatar_url": claims.get("picture", ""),
                    "email_verified": claims.get("email_verified", False),
                },
            )
            if not created and not user.google_sub:
                # Existing email/password account linking a Google identity.
                user.google_sub = google_sub
                user.save(update_fields=["google_sub"])

        if not user.is_active:
            return Response({"detail": "Account is deactivated."}, status=status.HTTP_403_FORBIDDEN)

        tokens = issue_tokens(user, device_info=request.headers.get("User-Agent", ""))
        return Response({"user": UserSerializer(user).data, **tokens})


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-write"

    def post(self, request):
        serializer = RefreshRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_refresh = serializer.validated_data["refresh"]

        try:
            token = SimpleJWTRefreshToken(raw_refresh)
        except TokenError:
            return Response({"detail": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED)

        record = RefreshToken.objects.filter(token_hash=hash_token(raw_refresh), revoked_at__isnull=True).first()
        if record is None or record.expires_at < dj_timezone.now():
            return Response({"detail": "Refresh token has been revoked or expired."}, status=status.HTTP_401_UNAUTHORIZED)

        user = User.objects.filter(id=token["sub"], is_active=True).first()
        if user is None:
            return Response({"detail": "Account no longer active."}, status=status.HTTP_401_UNAUTHORIZED)

        # Rotation: this refresh token is single-use (TRD 1.3 ROTATE_REFRESH_TOKENS).
        record.revoked_at = dj_timezone.now()
        record.save(update_fields=["revoked_at"])

        tokens = issue_tokens(user, device_info=request.headers.get("User-Agent", ""))
        return Response(tokens)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RefreshRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        RefreshToken.objects.filter(
            user=request.user,
            token_hash=hash_token(serializer.validated_data["refresh"]),
            revoked_at__isnull=True,
        ).update(revoked_at=dj_timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-read"

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PasswordResetRequestView(APIView):
    """Always returns 200 regardless of whether the email exists, to avoid account enumeration."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-write"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"].lower(), is_active=True).first()

        if user is not None:
            import secrets

            raw_token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token_hash=hash_token(raw_token),
                expires_at=dj_timezone.now() + timedelta(hours=1),
            )
            _send_password_reset_email(user, raw_token)

        return Response({"detail": "If that email exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-write"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record = PasswordResetToken.objects.filter(
            token_hash=hash_token(serializer.validated_data["token"]), used_at__isnull=True
        ).first()
        if record is None or record.expires_at < dj_timezone.now():
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        user = record.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        record.used_at = dj_timezone.now()
        record.save(update_fields=["used_at"])
        # A password reset invalidates every existing session, not just the one that requested it.
        RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=dj_timezone.now())

        return Response({"detail": "Password has been reset."})


class AccountDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_active = False
        user.deleted_at = dj_timezone.now()
        user.save(update_fields=["is_active", "deleted_at"])
        RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=dj_timezone.now())
        publish_account_deleted(str(user.id))
        return Response(status=status.HTTP_204_NO_CONTENT)


def _send_password_reset_email(user: User, raw_token: str) -> None:
    from django.core.mail import send_mail

    reset_link = f"{settings.FRONTEND_PASSWORD_RESET_URL}?token={raw_token}"
    send_mail(
        subject="Reset your LOADED password",
        message=f"Tap the link below to reset your password. It expires in 1 hour.\n\n{reset_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
