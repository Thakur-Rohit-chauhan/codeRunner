# Infrastructure

Updated: `2026-04-03`

This directory holds the active deployment assets used by the current Docker-based platform.

## Active Assets

[integration.Dockerfile](/d:/codeRunner-main/infrastructure/docker/integration.Dockerfile)

- Shared runtime image for `auth-service`, `problem-service`, `submission-service`, `contest-service`, and the worker services
- Installs compiler and runtime dependencies used by the judges
- Includes Python dependencies for PostgreSQL, Redis, Alembic, Scapy, and Google auth verification

[nginx.conf](/d:/codeRunner-main/infrastructure/nginx/nginx.conf)

- Active API gateway routing for the microservice stack
- Routes `/api` traffic to the correct FastAPI service
- Uses Docker DNS runtime resolution so container restarts do not leave stale upstream IPs

## Related Active Files Outside This Folder

- [docker-compose.yml](/d:/codeRunner-main/docker-compose.yml)
- [default.conf](/d:/codeRunner-main/services/frontend/conf/default.conf)
- [alembic](/d:/codeRunner-main/alembic)

## Placeholder Directories

These directories are currently placeholders and are not part of the active `docker compose` path:

- `k8s/`
- `elk-stack/`
- `prometheus/`
- `postgres/init/`

If they are expanded later, they should be updated to match the current FastAPI microservice plus Redis plus PostgreSQL architecture.
