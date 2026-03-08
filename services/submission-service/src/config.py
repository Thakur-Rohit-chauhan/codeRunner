import os

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL","postgresql://user:password@localhost:5432/db_submissions")
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    QUEUE_NAME = "judge_queue"

settings = Settings()
