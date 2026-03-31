"""Application configuration using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Type-safe settings for the judge-ml worker."""

    SERVICE_NAME: str = Field(default="judge-ml")
    LOG_LEVEL: str = Field(default="info")
    ENVIRONMENT: str = Field(default="development")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://submission_user:secure_password_change_me@postgres:5432/submissions_db",
    )

    DATABASE_POOL_SIZE: int = Field(default=5, ge=1, le=20)
    DATABASE_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50)
    DATABASE_POOL_TIMEOUT: int = Field(default=30, ge=5, le=120)
    DATABASE_POOL_RECYCLE: int = Field(default=3600, ge=60)

    RABBITMQ_URL: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    ML_JUDGE_QUEUE: str = Field(default="ml_judge_queue")
    RESULTS_QUEUE: str = Field(default="results_queue")
    QUEUE_DURABLE: bool = Field(default=True)
    MESSAGE_TTL: int = Field(default=3600000)

    PROBLEM_SERVICE_GRPC: str = Field(default="problem-service:50051")
    PREFETCH_COUNT: int = Field(default=1)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
