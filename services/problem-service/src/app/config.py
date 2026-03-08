"""Application configuration using Pydantic Settings.

Loads environment variables with type validation and sensible defaults.
Raises ConfigError on startup if critical variables are missing.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Type-safe application settings loaded from environment variables."""

    # Service
    SERVICE_NAME: str = Field(default="problem-service")
    SERVICE_PORT: int = Field(default=8001)
    LOG_LEVEL: str = Field(default="info")
    ENVIRONMENT: str = Field(default="development")

    # Database - PostgreSQL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://problem_user:secure_password_change_me@postgres:5432/problems_db",
        description="Async PostgreSQL connection string using asyncpg driver",
    )

    # Connection Pool
    DATABASE_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DATABASE_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DATABASE_POOL_TIMEOUT: int = Field(default=30, ge=5, le=120)
    DATABASE_POOL_RECYCLE: int = Field(default=3600, ge=60)

    # CORS
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost", "http://localhost:3000"]
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Singleton settings instance
settings = Settings()
