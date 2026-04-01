"""Application configuration using Pydantic Settings.

Loads environment variables for database, Redis, RabbitMQ,
and service settings with sensible defaults.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Type-safe settings for contest-service."""

    # Service
    SERVICE_NAME: str = Field(default="contest-service")
    SERVICE_PORT: int = Field(default=8003)
    LOG_LEVEL: str = Field(default="info")
    ENVIRONMENT: str = Field(default="development")

    # Database — PostgreSQL (shared instance)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://problem_user:secure_password_change_me@postgres:5432/problems_db",
    )

    # Connection Pool
    DATABASE_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DATABASE_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DATABASE_POOL_TIMEOUT: int = Field(default=30, ge=5, le=120)
    DATABASE_POOL_RECYCLE: int = Field(default=3600, ge=60)

    # Redis — real-time leaderboards
    REDIS_URL: str = Field(default="redis://:@redis:6379/0")

    # RabbitMQ — consume score updates from judge-standard
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    # Queue Configuration — must match judge-standard declarations
    RESULTS_QUEUE: str = Field(default="results_queue")
    QUEUE_DURABLE: bool = Field(default=True)

    # Contest Defaults
    DEFAULT_POINTS_PER_AC: int = Field(default=100)

    # CORS
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost", "http://localhost:3000"]
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
