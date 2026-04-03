FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    default-jdk-headless \
    g++ \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.integration.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.integration.txt

COPY alembic ./alembic
COPY integrated_platform ./integrated_platform
COPY platform_services ./platform_services
COPY alembic.ini postgres_config.py redis_queue.py worker_manager.py orchestrator.py queue_worker.py demo_runner.py integration_tests.py production_test.py ./

EXPOSE 8000

CMD ["uvicorn", "orchestrator:app", "--host", "0.0.0.0", "--port", "8000"]
