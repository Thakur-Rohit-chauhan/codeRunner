# Infrastructure

This directory holds deployment assets for the integrated platform.

## Active Assets

- [integration.Dockerfile](/d:/codeRunner-main/infrastructure/docker/integration.Dockerfile)
  - Shared runtime image for the backend and all three worker services.
  - Installs compiler and runtime dependencies used by the judges.

## Placeholder Directories

These directories are intentionally lightweight right now and are not part of the active `docker compose` path:

- `k8s/`
- `elk-stack/`
- `prometheus/`
- `nginx/`
- `postgres/init/`

They are retained only as future extension points. If they are expanded later, they should be updated to match the integrated FastAPI + Redis + PostgreSQL architecture rather than the older microservice layout.
