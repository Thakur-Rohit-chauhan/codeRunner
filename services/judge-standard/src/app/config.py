"""Application configuration using Pydantic Settings.

Loads environment variables for database, RabbitMQ, gRPC,
and worker settings with sensible defaults.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Type-safe settings for judge-standard worker."""

    # Service
    SERVICE_NAME: str = Field(default="judge-standard")
    LOG_LEVEL: str = Field(default="info")
    ENVIRONMENT: str = Field(default="development")

    # Database — same DB as submission-service
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://problem_user:secure_password_change_me@postgres:5432/problems_db",
    )

    # Connection Pool
    DATABASE_POOL_SIZE: int = Field(default=5, ge=1, le=20)
    DATABASE_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50)
    DATABASE_POOL_TIMEOUT: int = Field(default=30, ge=5, le=120)
    DATABASE_POOL_RECYCLE: int = Field(default=3600, ge=60)

    # RabbitMQ
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    # Queue Configuration — MUST match submission-service declarations
    STANDARD_JUDGE_QUEUE: str = Field(default="standard_judge_queue")
    RESULTS_QUEUE: str = Field(default="results_queue")
    QUEUE_DURABLE: bool = Field(default=True)
    MESSAGE_TTL: int = Field(default=3600000)  # 1 hour — matches submission-service

    # gRPC — problem-service
    PROBLEM_SERVICE_GRPC: str = Field(default="problem-service:50051")

    # Worker
    PREFETCH_COUNT: int = Field(default=1)  # Process one message at a time

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
