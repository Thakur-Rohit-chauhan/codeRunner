from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from threading import Lock
from typing import Any, Literal
from uuid import uuid4
import os

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    MetaData,
    String,
    Text,
    UniqueConstraint,
    and_,
    func,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.orm import selectinload


DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_EMAIL = "admin@gmail.com"
DEFAULT_ADMIN_PASSWORD = "Admin123"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv(
        "AUTH_DATABASE_URL",
        "postgresql+asyncpg://auth_user:auth_password@postgres:5432/auth_db",
    ),
)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "30"))
VERIFY_TOKEN_HOURS = int(os.getenv("VERIFY_TOKEN_HOURS", "24"))

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {
        "users:read",
        "users:write",
        "roles:manage",
        "profile:read",
        "profile:write",
        "profile:delete",
        "session:read",
        "session:write",
    },
    "moderator": {
        "users:read",
        "profile:read",
        "profile:write",
        "profile:delete",
        "session:read",
    },
    "user": {
        "profile:read",
        "profile:write",
        "profile:delete",
        "session:read",
    },
}

DEFAULT_PROFILE: dict[str, Any] = {
    "avatar": None,
    "rank": "Novice",
    "rating": 1200,
    "globalRanking": 100000,
    "solvedProblems": 0,
    "totalProblems": 5000,
    "easy": 0,
    "medium": 0,
    "hard": 0,
    "streak": 0,
    "contests": 0,
    "topPercent": "100.0",
    "languages": [],
    "location": "",
    "github": "",
    "linkedin": "",
    "views": 0,
    "solutions": 0,
    "discussions": 0,
    "reputation": 0,
    "followers": 0,
    "following": 0,
    "gender": "",
    "birthday": "",
    "websites": "",
    "x": "",
    "readme": "",
    "work": "",
    "education": "",
    "skills": "",
    "recentAC": True,
    "heatmap": True,
    "privacy": {
        "showEmail": False,
        "showLocation": True,
        "profileVisibility": "public",
    },
}

OAUTH_PROVIDER_MAP = {
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "scope": "openid email profile",
    },
    "github": {
        "auth_url": "https://github.com/login/oauth/authorize",
        "scope": "read:user user:email",
    },
    "discord": {
        "auth_url": "https://discord.com/oauth2/authorize",
        "scope": "identify email",
    },
    "microsoft": {
        "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "scope": "openid profile email",
    },
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
metadata = MetaData()


class Base(DeclarativeBase):
    metadata = metadata


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str] = mapped_column(String(100))
    bio: Mapped[str] = mapped_column(Text, default="")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verification_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email_verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    profile_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    settings_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    oauth_provider: Mapped[str | None] = mapped_column(String(30), nullable=True)
    oauth_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    roles: Mapped[list["Role"]] = relationship(
        secondary="user_roles",
        back_populates="users",
        lazy="selectin",
    )


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), default="")

    users: Mapped[list[User]] = relationship(
        secondary="user_roles",
        back_populates="roles",
        lazy="selectin",
    )


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), default="")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    role_id: Mapped[str] = mapped_column(String(36), ForeignKey("roles.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint("token_jti", name="uq_refresh_jti"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    token_jti: Mapped[str] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
startup_lock = Lock()


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    displayName: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)


class SocialLoginRequest(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    displayName: str | None = None
    provider: Literal["google", "github", "discord", "microsoft"] = "google"


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8, max_length=128)


class UserAdminUpdateRequest(BaseModel):
    isAdmin: bool


class UserRoleUpdateRequest(BaseModel):
    role: Literal["admin", "moderator", "user"]


class PrivacyUpdateRequest(BaseModel):
    showEmail: bool | None = None
    showLocation: bool | None = None
    profileVisibility: Literal["public", "followers", "private"] | None = None


class OAuthAuthorizeResponse(BaseModel):
    provider: str
    authorization_url: str


class EmailVerifyRequest(BaseModel):
    token: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="allow")


app = FastAPI(title="Auth Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def normalize_username(value: str = "") -> str:
    return "".join(ch for ch in value.strip().lower().replace(" ", "_").replace("-", "_") if ch.isalnum() or ch == "_")


def hash_value(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def token_payload(*, user: User, token_type: Literal["access", "refresh"], roles: list[str], scopes: list[str], session_id: str, expires_delta: timedelta, jti: str | None = None) -> dict[str, Any]:
    issued_at = now_utc()
    payload = {
        "sub": user.id,
        "username": user.username,
        "email": user.email,
        "roles": roles,
        "scopes": scopes,
        "type": token_type,
        "session_id": session_id,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + expires_delta).timestamp()),
        "jti": jti or str(uuid4()),
    }
    return payload


def encode_token(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str, *, verify_exp: bool = True) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": verify_exp},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


async def get_db() -> AsyncSession:
    async with AsyncSessionFactory() as session:
        yield session


async def fetch_user_by_username_or_email(session: AsyncSession, identifier: str) -> User | None:
    key = identifier.strip().lower()
    if not key:
        return None
    statement = select(User).options(selectinload(User.roles)).where(
        and_(
            User.deleted_at.is_(None),
            (User.username == normalize_username(key)) | (User.email == key),
        )
    )
    return await session.scalar(statement)


async def fetch_user_by_id(session: AsyncSession, user_id: str) -> User | None:
    statement = select(User).options(selectinload(User.roles)).where(
        and_(User.id == user_id, User.deleted_at.is_(None), User.is_active.is_(True))
    )
    return await session.scalar(statement)


async def fetch_roles_by_names(session: AsyncSession, role_names: list[str]) -> list[Role]:
    statement = select(Role).where(Role.name.in_(role_names))
    results = await session.scalars(statement)
    return list(results)


async def role_names_for_user(session: AsyncSession, user_id: str) -> list[str]:
    names = list(
        await session.scalars(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
    )
    return sorted(names) if names else ["user"]


def scopes_for_roles(roles: list[str]) -> list[str]:
    permission_set: set[str] = set()
    for role in roles:
        permission_set.update(ROLE_PERMISSIONS.get(role, set()))
    return sorted(permission_set)


def primary_role(roles: list[str]) -> str:
    if "admin" in roles:
        return "admin"
    if "moderator" in roles:
        return "moderator"
    return "user"


def seeded_profile(username: str, email: str, display_name: str) -> dict[str, Any]:
    seed = sum(ord(ch) for ch in username)
    profile = dict(DEFAULT_PROFILE)
    profile.update(
        {
            "displayName": display_name,
            "location": "India",
            "rank": ["Novice", "Apprentice", "Guardian", "Elite", "Legend"][seed % 5],
            "rating": 1200 + (seed % 900),
            "globalRanking": 1000 + (seed % 200000),
            "solvedProblems": 40 + (seed % 220),
            "totalProblems": 500 + (seed % 5000),
            "easy": 10 + (seed % 120),
            "medium": 8 + (seed % 90),
            "hard": 3 + (seed % 50),
            "streak": 1 + (seed % 45),
            "contests": 1 + (seed % 18),
            "topPercent": f"{(2 + (seed % 90) / 10):.1f}",
            "languages": [
                {"name": "Python", "count": 15 + (seed % 60)},
                {"name": "C++", "count": 8 + (seed % 40)},
                {"name": "JavaScript", "count": 3 + (seed % 25)},
            ],
            "followers": 0,
            "following": 0,
        }
    )
    profile["email"] = email
    profile["username"] = username
    return profile


def user_to_response(user: User, role_names: list[str] | None = None) -> dict[str, Any]:
    roles = sorted(role_names) if role_names else (sorted([role.name for role in user.roles]) if user.roles else ["user"])
    primary = primary_role(roles)
    profile = dict(DEFAULT_PROFILE)
    profile.update(user.profile_data or {})
    profile.pop("displayName", None)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "displayName": user.display_name,
        "bio": user.bio,
        "role": primary,
        "roles": roles,
        "isAdmin": "admin" in roles,
        "emailVerified": user.email_verified,
        "isOnline": user.is_online,
        "lastSeenAt": user.last_seen_at.isoformat() if user.last_seen_at else None,
        **profile,
    }


async def list_users_payload(session: AsyncSession) -> list[dict[str, Any]]:
    statement = (
        select(User)
        .options(selectinload(User.roles))
        .where(and_(User.deleted_at.is_(None), User.is_active.is_(True)))
        .order_by(User.username.asc())
    )
    users = list(await session.scalars(statement))
    return [user_to_response(user) for user in users]


async def issue_auth_tokens(
    session: AsyncSession,
    user: User,
    *,
    session_id: str | None = None,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict[str, str]:
    role_names = await role_names_for_user(session, user.id)
    scopes = scopes_for_roles(role_names)
    sid = session_id or str(uuid4())

    access_payload = token_payload(
        user=user,
        token_type="access",
        roles=role_names,
        scopes=scopes,
        session_id=sid,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_MINUTES),
    )
    refresh_payload = token_payload(
        user=user,
        token_type="refresh",
        roles=role_names,
        scopes=["session:write"],
        session_id=sid,
        expires_delta=timedelta(days=REFRESH_TOKEN_DAYS),
    )

    refresh_record = RefreshToken(
        user_id=user.id,
        session_id=sid,
        token_jti=hash_value(refresh_payload["jti"]),
        expires_at=datetime.fromtimestamp(refresh_payload["exp"], tz=timezone.utc),
        revoked_at=None,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    session.add(refresh_record)

    return {
        "token": encode_token(access_payload),
        "refresh_token": encode_token(refresh_payload),
    }


def get_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    prefix, _, token = authorization.partition(" ")
    if prefix.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    return token


async def get_current_user_token(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, dict[str, Any]]:
    raw_token = get_bearer_token(authorization)
    payload = decode_token(raw_token, verify_exp=True)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = await fetch_user_by_id(db, str(payload.get("sub") or ""))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user.is_online = True
    user.last_seen_at = now_utc()
    await db.commit()
    await db.refresh(user)
    return user, payload


def require_scopes(*required_scopes: str):
    async def dependency(user_and_token: tuple[User, dict[str, Any]] = Depends(get_current_user_token)) -> tuple[User, dict[str, Any]]:
        _, payload = user_and_token
        token_scopes = set(payload.get("scopes") or [])
        missing = [scope for scope in required_scopes if scope not in token_scopes]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required scopes: {', '.join(missing)}",
            )
        return user_and_token

    return dependency


def require_roles(*allowed_roles: str):
    async def dependency(user_and_token: tuple[User, dict[str, Any]] = Depends(get_current_user_token)) -> tuple[User, dict[str, Any]]:
        user, _ = user_and_token
        roles = {role.name for role in user.roles}
        if not roles.intersection(set(allowed_roles)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user_and_token

    return dependency


async def ensure_role_seed(session: AsyncSession, name: str, description: str) -> Role:
    role = await session.scalar(select(Role).where(Role.name == name))
    if role:
        return role
    role = Role(name=name, description=description)
    session.add(role)
    await session.flush()
    return role


async def ensure_permission_seed(session: AsyncSession, name: str, description: str) -> Permission:
    permission = await session.scalar(select(Permission).where(Permission.name == name))
    if permission:
        return permission
    permission = Permission(name=name, description=description)
    session.add(permission)
    await session.flush()
    return permission


async def assign_role_if_missing(session: AsyncSession, user: User, role_name: str) -> None:
    role = await session.scalar(select(Role).where(Role.name == role_name))
    if not role:
        raise HTTPException(status_code=500, detail=f"Role '{role_name}' is not initialized")
    has_role = await session.scalar(
        select(UserRole).where(and_(UserRole.user_id == user.id, UserRole.role_id == role.id))
    )
    if has_role:
        return
    session.add(UserRole(user_id=user.id, role_id=role.id))


async def upsert_default_admin(session: AsyncSession) -> None:
    admin_user = await session.scalar(
        select(User).options(selectinload(User.roles)).where(User.username == DEFAULT_ADMIN_USERNAME)
    )
    if admin_user:
        if not admin_user.email_verified:
            admin_user.email_verified = True
        admin_user.display_name = "Admin"
        admin_user.email = DEFAULT_ADMIN_EMAIL
        admin_user.hashed_password = hash_password(DEFAULT_ADMIN_PASSWORD)
        admin_user.profile_data = {
            **seeded_profile(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, "Admin"),
            "rank": "Admin",
        }
        await assign_role_if_missing(session, admin_user, "admin")
        return

    admin_user = User(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
        display_name="Admin",
        bio="",
        email_verified=True,
        profile_data={
            **seeded_profile(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, "Admin"),
            "rank": "Admin",
        },
        settings_data={},
        is_online=False,
    )
    session.add(admin_user)
    await session.flush()
    await assign_role_if_missing(session, admin_user, "admin")


async def initialize_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionFactory() as session:
        for role_name, description in [
            ("admin", "Platform administrator"),
            ("moderator", "Community moderator"),
            ("user", "Default user role"),
        ]:
            await ensure_role_seed(session, role_name, description)

        for permission_name in sorted({perm for perms in ROLE_PERMISSIONS.values() for perm in perms}):
            await ensure_permission_seed(session, permission_name, f"Permission {permission_name}")

        await upsert_default_admin(session)
        await session.commit()


@app.on_event("startup")
async def on_startup() -> None:
    with startup_lock:
        pass
    await initialize_database()


@app.middleware("http")
async def jwt_refresh_middleware(request: Request, call_next):
    response = await call_next(request)

    if response.status_code != status.HTTP_401_UNAUTHORIZED:
        return response

    refresh_token = request.headers.get("x-refresh-token")
    authorization = request.headers.get("authorization")
    if not refresh_token or not authorization:
        return response

    try:
        access_token = get_bearer_token(authorization)
        decode_token(access_token, verify_exp=False)
        refresh_payload = decode_token(refresh_token, verify_exp=True)
        if refresh_payload.get("type") != "refresh":
            return response

        async with AsyncSessionFactory() as session:
            token_hash = hash_value(str(refresh_payload.get("jti") or ""))
            refresh_record = await session.scalar(
                select(RefreshToken).where(
                    and_(
                        RefreshToken.token_jti == token_hash,
                        RefreshToken.revoked_at.is_(None),
                        RefreshToken.expires_at > now_utc(),
                    )
                )
            )
            if not refresh_record:
                return response

            user = await fetch_user_by_id(session, str(refresh_payload.get("sub") or ""))
            if not user:
                return response

            refresh_record.revoked_at = now_utc()
            tokens = await issue_auth_tokens(
                session,
                user,
                session_id=refresh_record.session_id,
                user_agent=request.headers.get("user-agent"),
                ip_address=request.client.host if request.client else None,
            )
            await session.commit()

            response.headers["x-access-token"] = tokens["token"]
            response.headers["x-refresh-token"] = tokens["refresh_token"]
            response.headers["x-token-refreshed"] = "true"
            return response
    except Exception:
        return response


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/auth/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _auth: tuple[User, dict[str, Any]] = Depends(require_scopes("users:read")),
) -> dict[str, list[dict[str, Any]]]:
    return {"users": await list_users_payload(db)}


@app.post("/auth/register")
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    username = normalize_username(payload.username)
    email = payload.email.strip().lower()
    display_name = (payload.displayName or username).strip() or username

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    existing = await db.scalar(select(User).where((User.username == username) | (User.email == email)))
    if existing and existing.deleted_at is None:
        if existing.username == username:
            raise HTTPException(status_code=409, detail="Username already exists")
        raise HTTPException(status_code=409, detail="Email already exists")

    verify_token = str(uuid4())
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(payload.password),
        display_name=display_name,
        bio="",
        email_verified=False,
        email_verification_token=hash_value(verify_token),
        email_verification_expires_at=now_utc() + timedelta(hours=VERIFY_TOKEN_HOURS),
        profile_data=seeded_profile(username, email, display_name),
        settings_data={},
        is_online=True,
        last_seen_at=now_utc(),
    )
    db.add(user)
    await db.flush()
    await assign_role_if_missing(db, user, "user")

    tokens = await issue_auth_tokens(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    user = await fetch_user_by_id(db, user.id)

    return {
        "user": user_to_response(user),
        "token": tokens["token"],
        "refresh_token": tokens["refresh_token"],
        "verification_token": verify_token,
        "users": await list_users_payload(db),
    }


@app.post("/auth/verify-email")
async def verify_email(payload: EmailVerifyRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    token_hash = hash_value(payload.token)
    user = await db.scalar(
        select(User).where(
            and_(
                User.email_verification_token == token_hash,
                User.email_verification_expires_at.is_not(None),
                User.email_verification_expires_at > now_utc(),
                User.deleted_at.is_(None),
            )
        )
    )
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    await db.commit()
    user = await fetch_user_by_id(db, user.id)
    return {"ok": True, "user": user_to_response(user)}


@app.post("/auth/login")
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    user = await fetch_user_by_username_or_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.is_online = True
    user.last_seen_at = now_utc()

    tokens = await issue_auth_tokens(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)

    return {
        "user": user_to_response(user),
        "token": tokens["token"],
        "refresh_token": tokens["refresh_token"],
        "users": await list_users_payload(db),
    }


@app.post("/auth/refresh")
async def refresh_token(payload: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    refresh_payload = decode_token(payload.refresh_token, verify_exp=True)
    if refresh_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    refresh_record = await db.scalar(
        select(RefreshToken).where(
            and_(
                RefreshToken.token_jti == hash_value(str(refresh_payload.get("jti") or "")),
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now_utc(),
            )
        )
    )
    if not refresh_record:
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    user = await fetch_user_by_id(db, str(refresh_payload.get("sub") or ""))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    refresh_record.revoked_at = now_utc()
    tokens = await issue_auth_tokens(
        db,
        user,
        session_id=refresh_record.session_id,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    return {
        "token": tokens["token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
    }


@app.post("/auth/social-login")
async def social_login(payload: SocialLoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    username = normalize_username(payload.username or (str(payload.email).split("@")[0] if payload.email else f"{payload.provider}_user"))
    email = str(payload.email).strip().lower() if payload.email else f"{username}@coderunner.dev"
    display_name = (payload.displayName or username).strip() or username

    user = await db.scalar(
        select(User).options(selectinload(User.roles)).where((User.username == username) | (User.email == email))
    )
    if not user:
        user = User(
            username=username,
            email=email,
            hashed_password=None,
            display_name=display_name,
            bio="",
            email_verified=True,
            email_verification_token=None,
            email_verification_expires_at=None,
            oauth_provider=payload.provider,
            oauth_subject=email,
            profile_data=seeded_profile(username, email, display_name),
            settings_data={},
            is_online=True,
            last_seen_at=now_utc(),
        )
        db.add(user)
        await db.flush()
        await assign_role_if_missing(db, user, "user")
    else:
        user.display_name = payload.displayName or user.display_name
        user.oauth_provider = payload.provider
        user.oauth_subject = email
        user.email_verified = True
        user.is_online = True
        user.last_seen_at = now_utc()

    tokens = await issue_auth_tokens(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    user = await fetch_user_by_id(db, user.id)

    return {
        "user": user_to_response(user),
        "token": tokens["token"],
        "refresh_token": tokens["refresh_token"],
        "users": await list_users_payload(db),
    }


@app.get("/auth/oauth/{provider}/authorize", response_model=OAuthAuthorizeResponse)
async def oauth_authorize(provider: Literal["google", "github", "discord", "microsoft"]) -> OAuthAuthorizeResponse:
    provider_conf = OAUTH_PROVIDER_MAP[provider]
    client_id = os.getenv(f"OAUTH_{provider.upper()}_CLIENT_ID")
    redirect_uri = os.getenv(f"OAUTH_{provider.upper()}_REDIRECT_URI", f"http://localhost:8000/auth/oauth/{provider}/callback")

    if not client_id:
        raise HTTPException(status_code=501, detail=f"{provider} OAuth is not configured")

    url = (
        f"{provider_conf['auth_url']}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={provider_conf['scope']}"
    )
    return OAuthAuthorizeResponse(provider=provider, authorization_url=url)


@app.get("/auth/oauth/{provider}/callback")
async def oauth_callback(
    provider: Literal["google", "github", "discord", "microsoft"],
    request: Request,
    code: str | None = None,
    email: EmailStr | None = None,
    username: str | None = None,
    display_name: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if not code and not email:
        raise HTTPException(status_code=400, detail="Missing OAuth code/email")

    social_payload = SocialLoginRequest(
        provider=provider,
        email=email,
        username=username,
        displayName=display_name,
    )
    return await social_login(social_payload, request, db)


@app.get("/auth/me")
async def me(user_and_token: tuple[User, dict[str, Any]] = Depends(require_scopes("profile:read"))) -> dict[str, dict[str, Any]]:
    user, _ = user_and_token
    return {"user": user_to_response(user)}


@app.patch("/auth/me")
async def update_me(
    payload: dict[str, Any],
    user_and_token: tuple[User, dict[str, Any]] = Depends(require_scopes("profile:write")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, dict[str, Any]]:
    user, _ = user_and_token

    editable_fields = {
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
        "bio",
    }

    profile = dict(user.profile_data or {})
    for key, value in payload.items():
        if key in editable_fields:
            if key == "displayName":
                user.display_name = str(value)
            elif key == "bio":
                user.bio = str(value)
            else:
                profile[key] = value

    user.profile_data = profile
    await db.commit()
    await db.refresh(user)
    return {"user": user_to_response(user)}


@app.patch("/auth/me/privacy")
async def update_privacy(
    payload: PrivacyUpdateRequest,
    user_and_token: tuple[User, dict[str, Any]] = Depends(require_scopes("profile:write")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user, _ = user_and_token
    profile = dict(user.profile_data or {})
    privacy = dict(profile.get("privacy") or {})

    if payload.showEmail is not None:
        privacy["showEmail"] = payload.showEmail
    if payload.showLocation is not None:
        privacy["showLocation"] = payload.showLocation
    if payload.profileVisibility is not None:
        privacy["profileVisibility"] = payload.profileVisibility

    profile["privacy"] = privacy
    user.profile_data = profile
    await db.commit()
    await db.refresh(user)
    return {"ok": True, "privacy": privacy, "user": user_to_response(user)}


@app.post("/auth/me/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user_and_token: tuple[User, dict[str, Any]] = Depends(require_scopes("profile:write")),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    user, _ = user_and_token
    if not verify_password(payload.currentPassword, user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is invalid")

    user.hashed_password = hash_password(payload.newPassword)
    await db.commit()
    return MessageResponse(ok=True)


@app.get("/auth/sessions")
async def list_sessions(
    user_and_token: tuple[User, dict[str, Any]] = Depends(require_scopes("session:read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user, _ = user_and_token

    sessions = list(
        await db.scalars(
            select(RefreshToken)
            .where(and_(RefreshToken.user_id == user.id, RefreshToken.expires_at > now_utc()))
            .order_by(RefreshToken.created_at.desc())
        )
    )

    return {
        "sessions": [
            {
                "id": token.session_id,
                "createdAt": token.created_at.isoformat() if token.created_at else None,
                "expiresAt": token.expires_at.isoformat(),
                "revokedAt": token.revoked_at.isoformat() if token.revoked_at else None,
                "userAgent": token.user_agent,
                "ipAddress": token.ip_address,
            }
            for token in sessions
        ]
    }


@app.delete("/auth/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    user_and_token: tuple[User, dict[str, Any]] = Depends(require_scopes("session:write")),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    user, _ = user_and_token

    tokens = list(
        await db.scalars(
            select(RefreshToken).where(
                and_(
                    RefreshToken.user_id == user.id,
                    RefreshToken.session_id == session_id,
                    RefreshToken.revoked_at.is_(None),
                )
            )
        )
    )
    for token in tokens:
        token.revoked_at = now_utc()
    await db.commit()
    return MessageResponse(ok=True, revoked=len(tokens))


@app.post("/auth/logout")
async def logout(
    authorization: str | None = Header(default=None),
    refresh_token: str | None = Header(default=None, alias="x-refresh-token"),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    user, payload = await get_current_user_token(authorization=authorization, db=db)
    user.is_online = False
    user.last_seen_at = now_utc()

    if refresh_token:
        refresh_payload = decode_token(refresh_token)
        if refresh_payload.get("sub") == user.id:
            token_hash = hash_value(str(refresh_payload.get("jti") or ""))
            token = await db.scalar(select(RefreshToken).where(RefreshToken.token_jti == token_hash))
            if token:
                token.revoked_at = now_utc()
    else:
        session_id = str(payload.get("session_id") or "")
        if session_id:
            tokens = list(
                await db.scalars(
                    select(RefreshToken).where(
                        and_(
                            RefreshToken.user_id == user.id,
                            RefreshToken.session_id == session_id,
                            RefreshToken.revoked_at.is_(None),
                        )
                    )
                )
            )
            for token in tokens:
                token.revoked_at = now_utc()

    await db.commit()
    return MessageResponse(ok=True)


@app.patch("/auth/users/{username}")
async def update_user_admin_status(
    username: str,
    payload: UserAdminUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _auth: tuple[User, dict[str, Any]] = Depends(require_roles("admin")),
) -> dict[str, Any]:
    normalized = normalize_username(username)
    user = await db.scalar(
        select(User).options(selectinload(User.roles)).where(and_(User.username == normalized, User.deleted_at.is_(None)))
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if normalized == DEFAULT_ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="The default admin cannot be modified")

    desired_role = "admin" if payload.isAdmin else "user"
    roles = await fetch_roles_by_names(db, ["admin", "user", "moderator"])
    role_by_name = {role.name: role for role in roles}

    role_ids_to_replace = [role.id for role in roles if role.name in {"admin", "user"}]
    if role_ids_to_replace:
        await db.execute(
            UserRole.__table__.delete().where(
                and_(UserRole.user_id == user.id, UserRole.role_id.in_(role_ids_to_replace))
            )
        )
    if desired_role in role_by_name:
        await assign_role_if_missing(db, user, desired_role)

    user_id = user.id
    await db.commit()
    user = await fetch_user_by_id(db, user_id)
    roles = await role_names_for_user(db, user_id)
    return {"user": user_to_response(user, roles), "users": await list_users_payload(db)}


@app.patch("/auth/users/{username}/role")
async def update_user_role(
    username: str,
    payload: UserRoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _auth: tuple[User, dict[str, Any]] = Depends(require_roles("admin")),
) -> dict[str, Any]:
    normalized = normalize_username(username)
    if normalized == DEFAULT_ADMIN_USERNAME and payload.role != "admin":
        raise HTTPException(status_code=400, detail="The default admin role cannot be changed")

    user = await db.scalar(
        select(User).options(selectinload(User.roles)).where(and_(User.username == normalized, User.deleted_at.is_(None)))
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    roles = await fetch_roles_by_names(db, ["admin", "user", "moderator"])
    role_by_name = {role.name: role for role in roles}
    new_role = role_by_name.get(payload.role)
    if not new_role:
        raise HTTPException(status_code=400, detail="Role not found")

    await db.execute(UserRole.__table__.delete().where(UserRole.user_id == user.id))
    await assign_role_if_missing(db, user, new_role.name)
    user_id = user.id
    await db.commit()
    user = await fetch_user_by_id(db, user_id)
    roles = await role_names_for_user(db, user_id)
    return {"user": user_to_response(user, roles), "users": await list_users_payload(db)}


@app.get("/auth/permissions")
async def permissions(
    db: AsyncSession = Depends(get_db),
    _auth: tuple[User, dict[str, Any]] = Depends(require_roles("admin", "moderator")),
) -> dict[str, Any]:
    perms = list(await db.scalars(select(Permission).order_by(Permission.name.asc())))
    return {"permissions": [{"name": perm.name, "description": perm.description} for perm in perms]}


@app.delete("/auth/users/{username}")
async def delete_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    current: tuple[User, dict[str, Any]] = Depends(require_scopes("profile:delete")),
) -> dict[str, Any]:
    requester, _ = current
    normalized = normalize_username(username)

    user = await db.scalar(
        select(User).options(selectinload(User.roles)).where(and_(User.username == normalized, User.deleted_at.is_(None)))
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin_requester = any(role.name == "admin" for role in requester.roles)
    if requester.username != normalized and not is_admin_requester:
        raise HTTPException(status_code=403, detail="Not allowed to delete this account")

    if normalized == DEFAULT_ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="The default admin cannot be deleted")

    user.is_active = False
    user.is_online = False
    user.deleted_at = now_utc()

    tokens = list(await db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)))
    for token in tokens:
        token.revoked_at = now_utc()

    await db.commit()
    return {"ok": True, "users": await list_users_payload(db)}
