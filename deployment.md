# Deployment

## Stack

The production-style local deployment uses:

- FastAPI backend
- PostgreSQL with `asyncpg`
- Redis queues with retry and dead-letter handling
- React frontend served by Nginx
- Three worker services:
  - `judge-worker` hosting logical pool `judge-standard`
  - `ml-worker` hosting logical pool `judge-ml`
  - `packet-worker` hosting logical pool `judge-cyber`

## Start

```bash
docker compose up --build -d
```

## Health Checks

```bash
docker compose ps
curl http://localhost:8000/ready
curl http://localhost:8101/ready
curl http://localhost:8102/ready
curl http://localhost:8103/ready
```

Service checks:

- `postgres`: `pg_isready`
- `redis`: `redis-cli ping`
- `backend`: `GET /ready`
- `judge-worker`: `GET /ready`
- `ml-worker`: `GET /ready`
- `packet-worker`: `GET /ready`

## Runtime Guarantees

Submission routing is strict:

- DSA problems can only be submitted through `/submit/code`
- ML problems can only be submitted through `/submit/ml`
- packet problems can only be submitted through `/submit/packet`

Workers verify that the queue, problem domain, and worker pool match before judging.

## Useful Commands

Apply migrations manually:

```bash
docker compose run --rm backend alembic upgrade head
```

Run the production load simulation:

```bash
python production_test.py --api-base-url http://127.0.0.1:8000/api --users 100
```

Inspect live queue depth:

```bash
docker compose exec redis redis-cli llen queue:code:ready
docker compose exec redis redis-cli llen queue:ml:ready
docker compose exec redis redis-cli llen queue:packet:ready
```

## End-to-End Flow

1. User logs in.
2. User opens a domain-specific problem.
3. The frontend submits to the matching endpoint.
4. The backend persists the submission and enqueues the job.
5. The correct worker pool judges it.
6. The backend stores the result and updates the leaderboard.
7. The frontend polls submission status and refreshes profile/leaderboard views.
