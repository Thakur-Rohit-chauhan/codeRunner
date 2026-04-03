# Integration Architecture

Updated: `2026-04-03`

## Overview

The platform currently runs as a split async system:

1. The React frontend sends all API traffic to the Nginx gateway on `/api`.
2. The gateway routes requests to the correct FastAPI microservice.
3. The services share PostgreSQL for durable state.
4. Submission-service enqueues jobs into Redis based on problem domain.
5. The matching worker pool claims the job, executes the judge, and stores the result.
6. Contest-service serves leaderboard and profile reads backed by PostgreSQL and Redis cache data.

## Service Ownership

`auth-service`

- `/login`
- `/auth/register`
- `/auth/login`
- `/auth/google-config`
- `/auth/google-login`
- `/auth/me`
- `/auth/users`

`problem-service`

- `/problem/problems`
- `/problem/problems/{id}`
- `/problem/problems/{id}/run`
- `/problem/problems/{id}/bookmark`
- `/problem/users/{username}/submissions`

`submission-service`

- `/submit/code`
- `/submit/ml`
- `/submit/packet`
- `/submission-status/{id}`

`contest-service`

- `/competitions`
- `/leaderboard`
- `/users/{username}/profile`
- `/contest/contests`
- contest registration and contest metadata endpoints

`worker services`

- `judge-worker` hosts `judge-standard`
- `ml-worker` hosts `judge-ml`
- `packet-worker` hosts `judge-cyber`

## Domain Routing

The backend returns routing metadata with every problem record and re-validates it again at submission and worker claim time.

| Domain | Submit endpoint | Redis queue | Worker pool | Docker service |
| --- | --- | --- | --- | --- |
| `DSA` | `POST /submit/code` | `queue:code:ready` | `judge-standard` | `judge-worker` |
| `ML` | `POST /submit/ml` | `queue:ml:ready` | `judge-ml` | `ml-worker` |
| `CTF` | `POST /submit/packet` | `queue:packet:ready` | `judge-cyber` | `packet-worker` |

Misrouted submissions are rejected with `400`. Misrouted queue jobs are failed by workers instead of being judged.

## Auth and Identity

`Local auth`

- Email/password registration creates a `users` row in PostgreSQL.
- Passwords are hashed before storage.
- `auth_provider` is stored as `local`.

`Google auth`

- The frontend renders a Google Identity Services button.
- The browser returns a Google credential token.
- `auth-service` verifies that token server-side using the configured `GOOGLE_CLIENT_ID`.
- Verified users are stored with `auth_provider=google`, `oauth_subject`, and `email_verified`.
- If `GOOGLE_CLIENT_ID` is not configured, Google sign-in stays disabled.

## Persistent State

Primary PostgreSQL tables:

- `users`
- `competitions`
- `submissions`
- `results`
- `leaderboard`
- `problem_bookmarks`

Important user identity fields:

- `username`
- `email`
- `password_hash`
- `auth_provider`
- `oauth_subject`
- `email_verified`

Redis responsibilities:

- ready queues
- processing queues
- retry sorted sets
- dead-letter queues
- leaderboard cache

## Request Flows

`Login / register`

```text
Frontend -> Gateway -> auth-service -> PostgreSQL(users) -> token -> Frontend
```

`Run preview`

```text
Frontend -> Gateway -> problem-service -> preview judge -> response
```

Run preview does not create a submission row or touch leaderboards.

`Submit`

```text
Frontend -> Gateway -> submission-service -> PostgreSQL(submissions)
                                    -> Redis queue
Redis queue -> Worker -> Judge runtime -> PostgreSQL(results/leaderboard)
                                       -> Redis leaderboard cache
Frontend <- Gateway <- submission-service / contest-service
```

## Judge Runtime

`judge-standard`

- Compiles or runs algorithm solutions.
- Supports `python`, `cpp`, `java`, and `javascript`.
- Verifies hidden test-case output.

`judge-ml`

- Executes ML/Python evaluation code.
- Computes hidden metrics such as accuracy or MAE.

`judge-cyber`

- Executes Scapy-based packet builders.
- Validates packet structure and challenge-specific rules.

## Shared Code

The microservices do not duplicate core business logic. Shared runtime code remains in [integrated_platform](/d:/codeRunner-main/integrated_platform):

- auth helpers
- models and schemas
- judges
- routing rules
- queue integration
- problem catalog

## Operational Notes

- Alembic migrations run through the one-shot `migrations` container before services start.
- The API gateway and frontend proxy use Docker DNS runtime resolution so service restarts do not leave stale upstream IPs behind.
- Contest verification mode is currently enabled in the frontend build so contests are visible as live during verification.
