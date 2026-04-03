# Deployment

Updated: `2026-04-03`

## Stack

The local production-style deployment uses:

- Nginx API gateway on `:8000`
- React frontend on `:3000`
- Four FastAPI microservices:
  - `auth-service`
  - `problem-service`
  - `submission-service`
  - `contest-service`
- PostgreSQL with `asyncpg`
- Redis queues with retry handling
- Three worker services:
  - `judge-worker`
  - `ml-worker`
  - `packet-worker`
- A one-shot `migrations` service that applies Alembic upgrades before the API services start

## Environment

Important runtime settings:

- `GOOGLE_CLIENT_ID`
  - Optional.
  - Enables real Google sign-in.
  - If omitted, the Google button stays disabled and local email/password auth still works.
- `VITE_FORCE_LIVE_CONTESTS`
  - Set in the frontend Docker build.
  - Currently enabled in `docker-compose.yml` for verification convenience.

Core platform settings like `DATABASE_URL`, `REDIS_URL`, retry limits, and `SECRET_KEY` are already defined in [docker-compose.yml](/d:/codeRunner-main/docker-compose.yml).

## Start

Standard startup:

```bash
docker compose up --build -d
```

Startup with Google sign-in enabled:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id docker compose up --build -d
```

## Health Checks

```bash
docker compose ps
curl http://localhost:8000/api/ready
curl http://localhost:8001/api/ready
curl http://localhost:8002/api/ready
curl http://localhost:8003/api/ready
curl http://localhost:8004/api/ready
curl http://localhost:8101/ready
curl http://localhost:8102/ready
curl http://localhost:8103/ready
curl http://localhost:3000/login
```

Health/readiness responsibilities:

- `postgres`: `pg_isready`
- `redis`: `redis-cli ping`
- `backend`: `GET /healthz`
- `auth-service`: `GET /api/ready`
- `problem-service`: `GET /api/ready`
- `submission-service`: `GET /api/ready`
- `contest-service`: `GET /api/ready`
- `judge-worker`: `GET /ready`
- `ml-worker`: `GET /ready`
- `packet-worker`: `GET /ready`

## Authentication Notes

- Email/password registration and login persist through `auth-service` into PostgreSQL.
- Passwords are stored as hashes.
- Google sign-in is verified server-side through Google ID tokens when configured.

Inspect the `users` table:

```bash
docker exec integrated-postgres psql -U platform -d platform -c "select username,email,auth_provider,email_verified from users limit 20;"
```

## Submission Behavior

`Run`

- Route: `/api/problem/problems/{id}/run`
- Synchronous preview path
- Does not create a submission row
- Does not touch the leaderboard

`Submit`

- Routes: `/api/submit/code`, `/api/submit/ml`, `/api/submit/packet`
- Persists the submission in PostgreSQL
- Enqueues the job in Redis
- Worker judges it
- Result and leaderboard are updated

## Useful Commands

Apply migrations manually:

```bash
docker compose run --rm migrations
```

Inspect queue depth:

```bash
docker compose exec redis redis-cli llen queue:code:ready
docker compose exec redis redis-cli llen queue:ml:ready
docker compose exec redis redis-cli llen queue:packet:ready
```

Inspect gateway logs:

```bash
docker compose logs --tail=100 backend
```

Run the production load simulation:

```bash
python production_test.py --api-base-url http://127.0.0.1:8000/api --users 100
```

## End-to-End Flow

1. User authenticates through `auth-service`.
2. Frontend loads problem or contest data through the gateway.
3. User submits into the correct domain lane.
4. `submission-service` stores the submission and pushes it to Redis.
5. The matching worker pool executes the judge.
6. Result rows and leaderboard state are updated.
7. Frontend polls status and refreshes profile or leaderboard views.
