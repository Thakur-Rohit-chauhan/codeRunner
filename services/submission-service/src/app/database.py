"""Async database connection management using SQLAlchemy + asyncpg."""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)

DDL_LOCK_ID = 842731

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_recycle=settings.DATABASE_POOL_RECYCLE,
    pool_pre_ping=True,
)

async_session_factory = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all database tables defined by SQLModel metadata."""
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            await conn.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": DDL_LOCK_ID})
        try:
            await conn.run_sync(SQLModel.metadata.create_all)
        finally:
            if conn.dialect.name == "postgresql":
                await conn.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": DDL_LOCK_ID})
    logger.info("Database tables initialized successfully")


async def close_db() -> None:
    """Dispose of the async engine and release all connections."""
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("Database connections closed")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session via FastAPI dependency injection."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
