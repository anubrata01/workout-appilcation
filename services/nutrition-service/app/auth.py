import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import JWT_ISSUER, JWT_PUBLIC_KEY

# JWT verification only — this service never signs a token, only checks one
# signed by Auth Service against its public key. Mirrors what
# JWTTokenUserAuthentication does in the Django services: no local DB lookup,
# the token's own claims are trusted directly once the signature verifies.
bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, user_id: uuid.UUID):
        self.id = user_id


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication credentials were not provided.")

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_PUBLIC_KEY,
            algorithms=["RS256"],
            issuer=JWT_ISSUER,
            options={"require": ["exp", "sub", "token_type"]},
        )
        if payload.get("token_type") != "access":
            raise jwt.InvalidTokenError("not an access token")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token subject.")

    return CurrentUser(user_id)
