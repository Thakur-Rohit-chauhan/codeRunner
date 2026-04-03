# Integration Architecture

## Overview

The platform runs as a unified async system:

1. The frontend authenticates against the FastAPI backend.
2. The backend stores users, competitions, submissions, results, and leaderboard rows in PostgreSQL.
3. Each submission is routed to a Redis queue based on the problem domain.
4. A dedicated worker pool claims the job, runs the appropriate judge, and writes the result back to PostgreSQL.
5. Leaderboard state is updated in PostgreSQL and mirrored to Redis for fast reads.

## Domain Routing

The active routing table is enforced by the API, stored on each submission, and re-checked by workers before execution.

| Problem domain | Submit endpoint | Queue | Logical judge pool | Docker service |
| --- | --- | --- | --- | --- |
| `DSA` | `POST /submit/code` | `queue:code:ready` | `judge-standard` | `judge-worker` |
| `ML` | `POST /submit/ml` | `queue:ml:ready` | `judge-ml` | `ml-worker` |
| `CTF` | `POST /submit/packet` | `queue:packet:ready` | `judge-cyber` | `packet-worker` |

If a client tries to submit a problem through the wrong lane, the backend rejects it with `400`. If a misrouted job ever appears on the wrong queue, the worker fails it instead of judging it.

## API Surface

Unified participant-facing endpoints:

- `POST /login`
- `POST /submit/code`
- `POST /submit/ml`
- `POST /submit/packet`
- `GET /leaderboard`
- `GET /submission-status/{id}`

Problem and profile endpoints used by the frontend:

- `GET /problem/problems`
- `GET /problem/problems/{id}`
- `POST /problem/problems/{id}/run`
- `GET /problem/users/{username}/submissions`
- `GET /users/{username}/profile`

## Persistent State

PostgreSQL tables:

- `users`
- `competitions`
- `submissions`
- `results`
- `leaderboard`

Redis responsibilities:

- ready queues
- processing queues
- retry sorted sets
- dead-letter queues
- leaderboard cache

## Execution Flow

```text
User -> Backend -> PostgreSQL(submissions)
                -> Redis ready queue
Redis queue -> Worker -> Judge runtime -> PostgreSQL(results)
                                        -> PostgreSQL(leaderboard)
                                        -> Redis leaderboard cache
Frontend <- Backend <- PostgreSQL / Redis
```

## Judge Runtime

`judge-standard`

- Handles algorithm problems.
- Supports `python`, `cpp`, `java`, and `javascript`.
- Verifies hidden test-case output and reports compile/runtime/wrong-answer states.

`judge-ml`

- Handles ML problems only.
- Executes `train_and_predict(...)`-style Python submissions.
- Computes hidden metrics such as accuracy or MAE.

`judge-cyber`

- Handles packet challenges only.
- Executes Scapy-based packet builders.
- Validates packet structure against challenge-specific rules.

## Frontend Integration

The frontend is no longer just a queue console. It now uses the integrated APIs for:

- authentication
- problem browsing
- problem solving
- contest arena submissions
- profile statistics
- leaderboard views

Problem metadata returned by the backend includes:

- `submissionType`
- `queueName`
- `workerPool`
- `judgeLabel`

That metadata keeps the UI aligned with the backend routing rules.
