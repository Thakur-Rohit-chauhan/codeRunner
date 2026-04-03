from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


class Base(AsyncAttrs, DeclarativeBase):
    """Declarative base shared by runtime ORM models and Alembic."""


def is_sqlite_url(database_url: str) -> bool:
    return database_url.startswith("sqlite")


def create_database_engine(database_url: str) -> AsyncEngine:
    engine_kwargs: dict[str, object] = {
        "future": True,
        "pool_pre_ping": True,
    }
    if not is_sqlite_url(database_url):
        engine_kwargs.update(
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800,
        )
    return create_async_engine(database_url, **engine_kwargs)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(engine, expire_on_commit=False)


async def create_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def database_healthcheck(engine: AsyncEngine) -> tuple[bool, str]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        return False, str(exc)
