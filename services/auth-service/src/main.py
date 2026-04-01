from __future__ import annotations

from base64 import urlsafe_b64decode, urlsafe_b64encode
from copy import deepcopy
from datetime import datetime, timezone
import json
from threading import Lock
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


TOKEN_PREFIX = "coderunner."
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_EMAIL = "admin@gmail.com"
DEFAULT_ADMIN_PASSWORD = "Admin123"


def normalize_username(value: str = "") -> str:
    return (
        value.strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


def build_stable_user_id(username: str, email: str) -> str:
    normalized_username = normalize_username(username)
    normalized_email = email.strip().lower()
    return f"user:{normalized_username or normalized_email or 'anonymous'}"


def username_seed(username: str = "user") -> int:
    return sum(ord(char) for char in username)


def build_user_from_seed(username: str, email: str, display_name: str | None = None) -> dict[str, Any]:
    seed = username_seed(username)
    ratings = ["Novice", "Apprentice", "Guardian", "Elite", "Legend"]
    rank = ratings[seed % len(ratings)]
    rating = 1200 + (seed % 900)
    global_ranking = 1000 + (seed % 200000)
    contests = 1 + (seed % 18)
    top_percent = f"{(2 + (seed % 90) / 10):.1f}"
    streak = 1 + (seed % 45)
    solved_problems = 40 + (seed % 220)
    total_problems = 500 + (seed % 5000)

    return {
        "id": build_stable_user_id(username, email),
        "username": username,
        "email": email,
        "displayName": display_name or username,
        "role": "user",
        "isAdmin": False,
        "isOnline": False,
        "lastSeenAt": None,
        "avatar": None,
        "rank": rank,
        "rating": rating,
        "globalRanking": global_ranking,
        "solvedProblems": solved_problems,
        "totalProblems": total_problems,
        "easy": min(solved_problems, 10 + (seed % 120)),
        "medium": min(solved_problems, 8 + (seed % 90)),
        "hard": min(solved_problems, 3 + (seed % 50)),
        "streak": streak,
        "contests": contests,
        "topPercent": top_percent,
        "languages": [
            {"name": "Python", "count": 15 + (seed % 60)},
            {"name": "C++", "count": 8 + (seed % 40)},
            {"name": "JavaScript", "count": 3 + (seed % 25)},
        ],
        "location": "India",
        "github": "",
        "linkedin": "",
        "views": 100 + (seed % 9000),
        "solutions": 2 + (seed % 60),
        "discussions": 1 + (seed % 40),
        "reputation": 20 + (seed % 900),
        "followers": 0,
        "following": 0,
        "gender": "Male",
        "birthday": "",
        "websites": "",
        "x": "",
        "readme": "",
        "work": "",
        "education": "",
        "skills": "",
        "recentAC": True,
        "heatmap": True,
    }


def default_user() -> dict[str, Any]:
    return {
        "id": build_stable_user_id("coderunner", "user@coderunner.dev"),
        "username": "coderunner",
        "email": "user@coderunner.dev",
        "displayName": "Code Runner",
        "role": "user",
        "isAdmin": False,
        "isOnline": False,
        "lastSeenAt": None,
        "avatar": None,
        "rank": "Guardian",
        "rating": 1847,
        "globalRanking": 12453,
        "solvedProblems": 146,
        "totalProblems": 3859,
        "easy": 65,
        "medium": 58,
        "hard": 23,
        "streak": 14,
        "contests": 12,
        "topPercent": "8.2",
        "languages": [
            {"name": "C++", "count": 82},
            {"name": "Python", "count": 45},
            {"name": "Java", "count": 19},
        ],
        "location": "San Francisco, CA",
        "github": "coderunnerdev",
        "linkedin": "coderunnerdev",
        "views": 2340,
        "solutions": 34,
        "discussions": 12,
        "reputation": 456,
        "followers": 128,
        "following": 43,
        "gender": "Male",
        "birthday": "",
        "websites": "",
        "x": "",
        "readme": "",
        "work": "",
        "education": "",
        "skills": "",
        "recentAC": True,
        "heatmap": True,
    }


def default_admin_user() -> dict[str, Any]:
    user = build_user_from_seed(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, "Admin")
    user.update({
        "rank": "Admin",
        "role": "admin",
        "isAdmin": True,
        "isOnline": False,
        "lastSeenAt": None,
    })
    return user


def is_default_admin_username(username: str | None) -> bool:
    return normalize_username(username or "") == DEFAULT_ADMIN_USERNAME


def issue_token(username: str) -> str:
    payload = {
        "sub": normalize_username(username),
        "iat": datetime.now(timezone.utc).isoformat(),
    }
    encoded = urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    return f"{TOKEN_PREFIX}{encoded}"


def decode_token(token: str) -> str:
    if not token or not token.startswith(TOKEN_PREFIX):
        raise HTTPException(status_code=401, detail="Invalid token")

    encoded = token[len(TOKEN_PREFIX):]
    padding = "=" * (-len(encoded) % 4)

    try:
        payload = json.loads(urlsafe_b64decode(f"{encoded}{padding}".encode("utf-8")).decode("utf-8"))
    except Exception as exc:  # pragma: no cover - defensive parsing
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    username = normalize_username(str(payload.get("sub") or ""))
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    return username


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    prefix, _, token = authorization.partition(" ")
    if prefix.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return token


def copy_user(user: dict[str, Any]) -> dict[str, Any]:
    return deepcopy(user)


def sorted_users() -> list[dict[str, Any]]:
    ensure_default_admin_account()
    return [copy_user(_users[key]) for key in sorted(_users.keys())]


def auth_response(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "user": copy_user(user),
        "token": issue_token(user["username"]),
        "users": sorted_users(),
    }


def find_user(identifier: str) -> dict[str, Any] | None:
    ensure_default_admin_account()
    key = identifier.strip().lower()
    if not key:
        return None

    for user in _users.values():
        if user["username"] == key or user["email"].lower() == key:
            return user
    return None


def mark_user_presence(user: dict[str, Any], *, is_online: bool) -> dict[str, Any]:
    user["isOnline"] = bool(is_online)
    user["lastSeenAt"] = datetime.now(timezone.utc).isoformat()
    return user


def get_current_user(authorization: str | None) -> dict[str, Any]:
    ensure_default_admin_account()
    token = extract_bearer_token(authorization)
    username = decode_token(token)
    user = _users.get(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(authorization: str | None) -> dict[str, Any]:
    user = get_current_user(authorization)
    if not user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def count_admins() -> int:
    return sum(1 for user in _users.values() if user.get("isAdmin"))


def ensure_default_admin_account() -> None:
    admin_defaults = default_admin_user()
    existing_admin = _users.get(DEFAULT_ADMIN_USERNAME)

    if existing_admin:
        preserved_fields = {
            key: value
            for key, value in existing_admin.items()
            if key not in {"username", "email", "displayName", "role", "isAdmin", "rank"}
        }
        _users[DEFAULT_ADMIN_USERNAME] = {
            **admin_defaults,
            **preserved_fields,
            "username": DEFAULT_ADMIN_USERNAME,
            "email": DEFAULT_ADMIN_EMAIL,
            "displayName": "Admin",
            "role": "admin",
            "isAdmin": True,
            "rank": "Admin",
        }
    else:
        _users[DEFAULT_ADMIN_USERNAME] = admin_defaults

    _passwords[DEFAULT_ADMIN_USERNAME] = DEFAULT_ADMIN_PASSWORD


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    displayName: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class SocialLoginRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    displayName: str | None = None
    provider: str = "google"


class UserAdminUpdateRequest(BaseModel):
    isAdmin: bool


app = FastAPI(title="Auth Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_lock = Lock()
_users: dict[str, dict[str, Any]] = {
    "coderunner": default_user(),
    "admin": default_admin_user(),
}
_passwords: dict[str, str] = {
    "coderunner": "password123",
    "admin": DEFAULT_ADMIN_PASSWORD,
}


@app.get("/health")
def health() -> dict[str, str]:
    ensure_default_admin_account()
    return {"status": "ok"}


@app.get("/auth/users")
def list_users() -> dict[str, list[dict[str, Any]]]:
    return {"users": sorted_users()}


@app.post("/auth/register")
def register(payload: RegisterRequest) -> dict[str, Any]:
    username = normalize_username(payload.username)
    email = payload.email.strip().lower()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    with _lock:
        if username in _users:
            raise HTTPException(status_code=409, detail="Username already exists")
        if any(user["email"].lower() == email for user in _users.values()):
            raise HTTPException(status_code=409, detail="Email already exists")

        user = build_user_from_seed(username, email, payload.displayName or username)
        mark_user_presence(user, is_online=True)
        _users[username] = user
        _passwords[username] = payload.password
        return auth_response(user)


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    user = find_user(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    username = normalize_username(user["username"])
    if _passwords.get(username) != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    with _lock:
        mark_user_presence(user, is_online=True)
        return auth_response(user)


@app.post("/auth/social-login")
def social_login(payload: SocialLoginRequest) -> dict[str, Any]:
    fallback_username = normalize_username(payload.username or (payload.email or "google_user").split("@")[0]) or "google_user"
    fallback_email = payload.email.strip().lower() if payload.email else f"{fallback_username}@coderunner.dev"

    with _lock:
        user = _users.get(fallback_username)
        if not user:
            user = next((entry for entry in _users.values() if entry["email"].lower() == fallback_email), None)

        if not user:
            user = build_user_from_seed(
                fallback_username,
                fallback_email,
                payload.displayName or fallback_username,
            )
            _users[fallback_username] = user
            _passwords[fallback_username] = f"{payload.provider}-oauth"
        elif payload.displayName:
            user["displayName"] = payload.displayName

        mark_user_presence(user, is_online=True)
        return auth_response(user)


@app.get("/auth/me")
def me(authorization: str | None = Header(default=None)) -> dict[str, dict[str, Any]]:
    return {"user": copy_user(get_current_user(authorization))}


@app.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, bool]:
    user = get_current_user(authorization)
    with _lock:
        mark_user_presence(user, is_online=False)
    return {"ok": True}


@app.patch("/auth/me")
def update_me(payload: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, dict[str, Any]]:
    allowed_fields = {
        "displayName",
        "avatar",
        "gender",
        "location",
        "birthday",
        "websites",
        "github",
        "linkedin",
        "x",
        "readme",
        "work",
        "education",
        "skills",
        "recentAC",
        "heatmap",
        "languages",
        "followers",
        "following",
    }

    user = get_current_user(authorization)
    updates = {key: value for key, value in payload.items() if key in allowed_fields}
    if not updates:
        return {"user": copy_user(user)}

    with _lock:
        user.update(updates)
        return {"user": copy_user(user)}


@app.patch("/auth/users/{username}")
def update_user_admin_status(
    username: str,
    payload: UserAdminUpdateRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    admin = require_admin(authorization)
    normalized_username = normalize_username(username)

    with _lock:
        ensure_default_admin_account()
        user = _users.get(normalized_username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if is_default_admin_username(normalized_username):
            raise HTTPException(status_code=400, detail="The default admin cannot be modified")

        if normalized_username == normalize_username(admin["username"]) and not payload.isAdmin:
            raise HTTPException(status_code=400, detail="You cannot remove your own admin access")

        if user.get("isAdmin") and not payload.isAdmin and count_admins() <= 1:
            raise HTTPException(status_code=400, detail="At least one admin must remain in the system")

        user["isAdmin"] = bool(payload.isAdmin)
        user["role"] = "admin" if user["isAdmin"] else "user"

        return {
            "user": copy_user(user),
            "users": sorted_users(),
        }


@app.delete("/auth/users/{username}")
def delete_user(username: str, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    admin = require_admin(authorization)
    normalized_username = normalize_username(username)

    with _lock:
        ensure_default_admin_account()
        if normalized_username == normalize_username(admin["username"]):
            raise HTTPException(status_code=400, detail="You cannot delete your own account")

        if is_default_admin_username(normalized_username):
            raise HTTPException(status_code=400, detail="The default admin cannot be deleted")

        user = _users.get(normalized_username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.get("isAdmin") and count_admins() <= 1:
            raise HTTPException(status_code=400, detail="At least one admin must remain in the system")

        _users.pop(normalized_username, None)
        _passwords.pop(normalized_username, None)

        return {"ok": True, "users": sorted_users()}
