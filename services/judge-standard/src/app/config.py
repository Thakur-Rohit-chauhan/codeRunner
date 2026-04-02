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

    # Docker execution sandbox
    DOCKER_BINARY: str = Field(default="docker")
    DOCKER_WORKDIR: str = Field(default="/workspace")
    DOCKER_RUN_AS_UID: int = Field(default=1000, ge=1)
    DOCKER_RUN_AS_GID: int = Field(default=1000, ge=1)
    DOCKER_SECCOMP_PROFILE: str = Field(default="")

    # Runtime images
    PYTHON_IMAGE: str = Field(default="python:3.12-slim")
    CPP_IMAGE: str = Field(default="gcc:14")
    JAVA_IMAGE: str = Field(default="eclipse-temurin:21-jdk")
    JAVASCRIPT_IMAGE: str = Field(default="node:20-slim")

    # Resource limits
    EXECUTION_CPU_COUNT: float = Field(default=1.0, ge=0.1, le=4.0)
    EXECUTION_MEMORY_MARGIN_MB: int = Field(default=64, ge=0, le=2048)
    EXECUTION_PIDS_LIMIT: int = Field(default=64, ge=16, le=512)
    EXECUTION_NOFILE_LIMIT: int = Field(default=128, ge=64, le=4096)
    EXECUTION_NPROC_LIMIT: int = Field(default=64, ge=16, le=512)
    EXECUTION_MAX_FILE_KB: int = Field(default=10240, ge=128, le=102400)
    EXECUTION_TMPFS_MB: int = Field(default=64, ge=16, le=1024)

    # Timeouts
    EXECUTION_TIMEOUT_GRACE_MS: int = Field(default=250, ge=0, le=5000)
    COMPILATION_TIMEOUT_MS: int = Field(default=10000, ge=500, le=120000)

    # Output comparison
    COMPARE_IGNORE_TRAILING_WHITESPACE: bool = Field(default=True)
    COMPARE_NORMALIZE_WHITESPACE: bool = Field(default=False)
    COMPARE_CASE_SENSITIVE: bool = Field(default=True)
    COMPARE_FLOAT_REL_TOL: float = Field(default=1e-6, ge=0.0, le=1.0)
    COMPARE_FLOAT_ABS_TOL: float = Field(default=1e-9, ge=0.0, le=1.0)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
