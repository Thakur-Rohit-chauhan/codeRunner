from __future__ import annotations

from dataclasses import dataclass

from anyio import to_thread
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token


@dataclass(slots=True)
class GoogleIdentity:
    subject: str
    email: str
    email_verified: bool
    display_name: str


def _verify_google_id_token_sync(credential: str, client_id: str) -> GoogleIdentity:
    claims = google_id_token.verify_oauth2_token(credential, GoogleRequest(), client_id)
    issuer = str(claims.get("iss", "")).strip()
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("Invalid Google token issuer")

    email = str(claims.get("email", "")).strip().lower()
    if not email:
        raise ValueError("Google account did not provide an email address")

    subject = str(claims.get("sub", "")).strip()
    if not subject:
        raise ValueError("Google token subject is missing")

    display_name = str(claims.get("name") or email.split("@")[0]).strip()
    return GoogleIdentity(
        subject=subject,
        email=email,
        email_verified=bool(claims.get("email_verified")),
        display_name=display_name or "Google User",
    )


async def verify_google_id_token(credential: str, client_id: str) -> GoogleIdentity:
    return await to_thread.run_sync(_verify_google_id_token_sync, credential, client_id)
