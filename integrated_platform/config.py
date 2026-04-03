from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hybrid Education & Competition Platform"
    api_prefix: str = "/api"
    database_url: str = "postgresql+asyncpg://platform:platform@localhost:5432/platform"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "replace-this-secret"
    token_ttl_seconds: int = 60 * 60 * 12
    service_port: int = 8000
    seed_users: int = 50
    seed_competitions: int = 5
    seed_submissions: int = 100
    seed_data_on_boot: bool = True
    auto_create_schema: bool = False
    queue_poll_timeout: int = 5
    queue_retry_limit: int = 3
    queue_retry_base_delay_seconds: float = 2.0
    queue_retry_max_delay_seconds: float = 30.0
    worker_idle_sleep_seconds: float = 0.2
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    google_client_id: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def google_auth_enabled(self) -> bool:
        return bool(self.google_client_id.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
