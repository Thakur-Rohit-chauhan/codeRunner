from __future__ import annotations

from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json


TOKEN_PREFIX = "platform."


def normalize_username(value: str = "") -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def issue_token(*, user_id: str, username: str, secret_key: str, ttl_seconds: int) -> str:
    payload = {
        "sub": user_id,
        "username": normalize_username(username),
        "exp": int((datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)).timestamp()),
    }
    body = urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    signature = hmac.new(secret_key.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{TOKEN_PREFIX}{body}.{signature}"


def decode_token(token: str, secret_key: str) -> dict[str, str | int]:
    if not token.startswith(TOKEN_PREFIX):
        raise ValueError("invalid token prefix")

    raw_token = token[len(TOKEN_PREFIX):]
    body, separator, signature = raw_token.partition(".")
    if separator != "." or not signature:
        raise ValueError("malformed token")

    expected_signature = hmac.new(secret_key.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("invalid token signature")

    padded = body + "=" * (-len(body) % 4)
    payload = json.loads(urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))

    expires_at = int(payload.get("exp", 0))
    if expires_at <= int(datetime.now(timezone.utc).timestamp()):
        raise ValueError("expired token")

    return payload


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise ValueError("missing authorization header")

    prefix, _, token = authorization.partition(" ")
    if prefix.lower() != "bearer" or not token:
        raise ValueError("invalid authorization header")
    return token
