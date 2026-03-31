"""Application configuration using Pydantic Settings.

Loads environment variables with type validation and sensible defaults
for database, RabbitMQ, and service settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Type-safe application settings loaded from environment variables."""

    # Service
    SERVICE_NAME: str = Field(default="submission-service")
    SERVICE_PORT: int = Field(default=8002)
    LOG_LEVEL: str = Field(default="info")
    ENVIRONMENT: str = Field(default="development")

    # Database - PostgreSQL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://submission_user:secure_password_change_me@postgres:5432/submissions_db",
    )

    # Connection Pool
    DATABASE_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DATABASE_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DATABASE_POOL_TIMEOUT: int = Field(default=30, ge=5, le=120)
    DATABASE_POOL_RECYCLE: int = Field(default=3600, ge=60)

    # RabbitMQ
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    # Queue Configuration
    STANDARD_JUDGE_QUEUE: str = Field(default="standard_judge_queue")
    ML_JUDGE_QUEUE: str = Field(default="ml_judge_queue")
    QUEUE_DURABLE: bool = Field(default=True)
    MESSAGE_TTL: int = Field(default=3600000)  # 1 hour
    SUBMISSION_RETRY_MAX: int = Field(default=3)
    SUBMISSION_RETRY_DELAY: int = Field(default=5000)  # ms

    # Problem Service Integration
    PROBLEM_SERVICE_URL: str = Field(default="http://problem-service:8001")
    PROBLEM_SERVICE_TIMEOUT: int = Field(default=10)

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
