"""Async Redis client for real-time leaderboard operations."""

import redis.asyncio as redis

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


class RedisClient:
    """Manages async Redis connection lifecycle."""

    def __init__(self) -> None:
        self._client: redis.Redis | None = None

    async def connect(self) -> None:
        """Establish connection to Redis."""
        try:
            self._client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                encoding="utf-8",
            )
            # Verify connection
            await self._client.ping()
            logger.info("Redis connected at %s", settings.REDIS_URL)
        except Exception as exc:
            logger.error("Failed to connect to Redis: %s", exc)
            raise

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            logger.info("Redis connection closed")

    @property
    def client(self) -> redis.Redis:
        """Get the Redis client instance."""
        if self._client is None:
            raise RuntimeError("Redis client is not connected. Call connect() first.")
        return self._client

    async def health_check(self) -> str:
        """Check Redis connectivity."""
        try:
            if self._client:
                await self._client.ping()
                return "connected"
        except Exception as exc:
            logger.error("Redis health check failed: %s", exc)
        return "disconnected"


redis_client = RedisClient()
