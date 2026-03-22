# Problem Service

**Phase 1** of the Universal Contest Platform — a FastAPI microservice managing DSA, ML, and Cybersecurity challenge problems.

## Tech Stack

- **Framework**: FastAPI (async/await)
- **ORM**: SQLModel + SQLAlchemy
- **Database**: PostgreSQL 16 + asyncpg
- **Gateway**: NGINX
- **Container**: Docker + Docker Compose

## Quick Start

```bash
# From project root
cp services/problem-service/.env.example .env   # or use existing .env
docker-compose up -d --build
docker-compose ps     # Verify all services are healthy

# Run automated tests
bash test_endpoints.sh
```

## API Endpoints

| Method | Path                       | Description              | Status |
|--------|----------------------------|--------------------------|--------|
| POST   | `/api/problems`            | Create a new problem     | 201    |
| GET    | `/api/problems`            | List problems (filtered) | 200    |
| GET    | `/api/problems/{id}`       | Get single problem       | 200    |
| GET    | `/health`                  | Health check             | 200    |

### Query Parameters (GET /api/problems)

| Param        | Type   | Default      | Description                          |
|--------------|--------|--------------|--------------------------------------|
| skip         | int    | 0            | Pagination offset                    |
| limit        | int    | 10 (max 100) | Results per page                     |
| problem_type | string | —            | Filter: `dsa`, `ml`, `cyber`         |
| difficulty   | string | —            | Filter: `easy`, `medium`, `hard`     |
| topic        | string | —            | Partial match in topics              |
| search       | string | —            | Full-text search in title/description|
| sort_by      | string | created_at   | Sort: `created_at`, `title`, `difficulty` |
| sort_order   | string | desc         | Direction: `asc`, `desc`             |

## Example curl Commands

```bash
# Create a DSA problem
curl -X POST http://localhost/api/problems \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target...",
    "problem_type": "dsa",
    "time_limit": 1000,
    "memory_limit": 256,
    "difficulty": "easy",
    "topics": ["array", "hash-table"]
  }'

# List with filters
curl "http://localhost/api/problems?problem_type=dsa&difficulty=easy"

# Get by ID
curl http://localhost/api/problems/1

# Health check
curl http://localhost:8001/health
```

## Project Structure

```
src/app/
├── main.py                 # FastAPI app + lifespan
├── config.py               # Pydantic settings
├── database.py             # asyncpg connection pool
├── exceptions.py           # Custom exceptions
├── logger.py               # Logging config
├── models/problem.py       # SQLModel definition
├── schemas/                # Pydantic schemas
├── repositories/           # Async DB queries
├── services/               # Business logic
├── api/v1/                 # Route handlers + health
└── utils/                  # Constants + validators
```

## Environment Variables

See [.env.example](.env.example) for all available configuration options.
