# Hybrid Education and Competition Platform

This repository runs a production-style local platform for three challenge lanes:

- `DSA` / algorithm problems
- `ML` / notebook-style evaluation
- `CTF` / packet-security challenges

The active runtime is a microservice-based FastAPI stack with an Nginx API gateway, Redis queues, PostgreSQL persistence, dedicated judge workers, and a React frontend.

## Live Stack

- `backend` gateway on `http://localhost:8000/api`
- `auth-service`
- `problem-service`
- `submission-service`
- `contest-service`
- `judge-worker` for `judge-standard`
- `ml-worker` for `judge-ml`
- `packet-worker` for `judge-cyber`
- `postgres`
- `redis`
- `frontend` on `http://localhost:3000`

## Submission Routing

- `DSA` -> `POST /submit/code` -> `queue:code:ready` -> `judge-standard`
- `ML` -> `POST /submit/ml` -> `queue:ml:ready` -> `judge-ml`
- `CTF` -> `POST /submit/packet` -> `queue:packet:ready` -> `judge-cyber`

Run-preview requests stay synchronous through `problem-service` on `/api/problem/problems/{id}/run`. Real submissions are persisted, queued, judged, and written back to the leaderboard.

## Authentication

- Email/password registration and login are stored in PostgreSQL through `auth-service`.
- Passwords are stored as hashes, not plaintext.
- Google sign-in now uses Google Identity Services plus backend ID-token verification.
- Google sign-in is only active when `GOOGLE_CLIENT_ID` is provided at runtime.

Seeded admin credentials:

- Email: `admin@gmail.com`
- Password: `Admin123`

## Run Locally

Basic startup:

```bash
docker compose up --build -d
```

Enable real Google sign-in:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id docker compose up --build -d
```

Primary endpoints:

- Frontend: `http://localhost:3000`
- API gateway: `http://localhost:8000/api`
- Gateway readiness: `http://localhost:8000/api/ready`

## Repository Layout

```text
.
├── alembic/                      # Database migrations
├── integrated_platform/          # Shared auth, judges, routing, catalog, models, schemas
├── platform_services/            # Auth/problem/submission/contest FastAPI apps
├── services/
│   └── frontend/                 # React application
├── infrastructure/
│   ├── docker/
│   │   └── integration.Dockerfile
│   └── nginx/
│       └── nginx.conf            # API gateway routing
├── docker-compose.yml            # Local production-style deployment
├── orchestrator.py               # Shared orchestrator/runtime logic
├── queue_worker.py               # Redis queue worker implementation
├── worker_manager.py             # Worker readiness server and loop host
├── redis_queue.py                # Queue helpers and retry handling
└── postgres_config.py            # PostgreSQL configuration helpers
```

## Judge Runtime

Supported standard runtime languages in the integrated judge image:

- `python`
- `cpp`
- `java`
- `javascript`

ML submissions are executed in Python against hidden metrics. Packet submissions execute Scapy-based logic and validate generated packets against challenge-specific rules.

## Current Docs

- [integration_architecture.md](/d:/codeRunner-main/integration_architecture.md)
- [deployment.md](/d:/codeRunner-main/deployment.md)
- [system_health_report.md](/d:/codeRunner-main/system_health_report.md)
- [performance_report.md](/d:/codeRunner-main/performance_report.md)
- [integration_status.md](/d:/codeRunner-main/integration_status.md)
