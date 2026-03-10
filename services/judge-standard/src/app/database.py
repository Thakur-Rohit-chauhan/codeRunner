"""Async database connection management for judge-standard.

Provides engine, session factory, and lifecycle helpers.
Writes directly to the submissions table (same DB as submission-service).
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)

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
    """Verify database connectivity on startup.

    Does NOT create tables — submission-service owns the schema.
    """
    from sqlalchemy import text

    logger.info("Verifying database connectivity...")
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connection verified")


async def close_db() -> None:
    """Dispose of the async engine."""
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("Database connections closed")
