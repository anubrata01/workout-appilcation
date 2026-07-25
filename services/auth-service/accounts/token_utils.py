import hashlib


def hash_token(raw_token: str) -> str:
    """Refresh/reset tokens are stored as a hash — never the raw value (schema doc 1)."""
    return hashlib.sha256(raw_token.encode()).hexdigest()
