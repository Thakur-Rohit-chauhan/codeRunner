# Submission Service

**Phase 2** of the Universal Contest Platform — an async code submission service with RabbitMQ producer pattern.

## Tech Stack

- **Framework**: FastAPI (async/await)
- **ORM**: SQLModel + SQLAlchemy + asyncpg
- **Queue**: RabbitMQ via aio-pika
- **Container**: Docker + Docker Compose

## Quick Start

```bash
# From project root
docker-compose up -d --build
bash test_submission_endpoints.sh
```

## API Endpoints

| Method | Path                              | Status | Description                  |
|--------|-----------------------------------|--------|------------------------------|
| POST   | `/api/submissions`                | 202    | Submit code for evaluation   |
| GET    | `/api/submissions`                | 200    | List submissions (filtered)  |
| GET    | `/api/submissions/{id}`           | 200    | Get single submission        |
| POST   | `/api/submissions/{id}/retry`     | 202    | Retry a failed submission    |
| GET    | `/health`                         | 200    | Health check (DB + RabbitMQ) |

## RabbitMQ

- **Queue**: `standard_judge_queue`
- **Management UI**: http://localhost:15672 (guest/guest)
- **Graceful degradation**: Service continues if RabbitMQ is down

## Environment Variables

See [.env.example](.env.example) for configuration options.
