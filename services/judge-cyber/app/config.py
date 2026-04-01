from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    SERVICE_NAME: str = Field(default="judge-cyber")
    LOG_LEVEL: str = Field(default="info")
    ENVIRONMENT: str = Field(default="development")

    RABBITMQ_URL: str = Field(default="amqp://guest:guest@rabbitmq:5672/")
    STANDARD_JUDGE_QUEUE: str = Field(default="standard_judge_queue")
    RESULTS_QUEUE: str = Field(default="results_queue")
    QUEUE_DURABLE: bool = Field(default=True)
    MESSAGE_TTL: int = Field(default=3600000)

    PREFETCH_COUNT: int = Field(default=1)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
