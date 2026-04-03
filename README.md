# Hybrid Education and Competition Platform

This repository now runs as one integrated platform for three challenge lanes:

- `DSA` / algorithms
- `ML` / notebook-style evaluation
- `CTF` / packet-security challenges

The live runtime is a unified FastAPI control plane with Redis queues, PostgreSQL state, dedicated worker containers, and a React frontend.

## Active Architecture

Problem routing is enforced end to end:

- `DSA` problem -> `POST /submit/code` -> `queue:code:ready` -> logical worker pool `judge-standard`
- `ML` problem -> `POST /submit/ml` -> `queue:ml:ready` -> logical worker pool `judge-ml`
- `CTF` problem -> `POST /submit/packet` -> `queue:packet:ready` -> logical worker pool `judge-cyber`

The Docker services that host those pools are:

- `backend`
- `judge-worker` for `judge-standard`
- `ml-worker` for `judge-ml`
- `packet-worker` for `judge-cyber`
- `postgres`
- `redis`
- `frontend`

## Run Locally

```bash
docker compose up --build
```

Primary endpoints:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Backend readiness: `http://localhost:8000/ready`

Seeded admin credentials:

- Email: `admin@gmail.com`
- Password: `Admin123`

## Repository Layout

```text
.
├── alembic/                      # Database migrations
├── infrastructure/
│   └── docker/
│       └── integration.Dockerfile
├── integrated_platform/          # Shared runtime logic, judges, catalog, auth, models
├── services/
│   └── frontend/                 # React application
├── orchestrator.py               # Unified FastAPI API
├── queue_worker.py               # Redis-backed submission worker
├── worker_manager.py             # Worker readiness server + loop host
├── redis_queue.py                # Queue primitives and retry handling
├── postgres_config.py            # Postgres settings helpers
└── docker-compose.yml            # Production-style local stack
```

## Judge Behavior

Algorithm submissions are compiled or executed against hidden test cases using the standard judge. ML submissions execute the required Python function and score against hidden datasets. Packet submissions execute Scapy-based builders and validate generated packets against challenge-specific rules.

Supported code runtimes in the integrated judge image:

- `python`
- `cpp`
- `java`
- `javascript`

## Notes

- Legacy standalone microservice folders were removed from the active repo because the platform now runs through the integrated orchestrator and worker model.
- `integration_architecture.md` and `deployment.md` describe the current production path in more detail.
