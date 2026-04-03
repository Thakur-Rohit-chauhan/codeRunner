# Frontend

Updated: `2026-04-03`

This is the active user-facing web application for the platform.

## Purpose

The frontend talks to the API gateway at `/api` and provides:

- login and registration
- Google sign-in when configured
- problem browsing by domain
- live solver pages
- run-preview and real submission flows
- contest views and contest arena submissions
- profile and submission history views
- leaderboard access
- admin and developer console access

## Authentication Behavior

- Email/password auth is backed by the live `auth-service` and persisted in PostgreSQL.
- Google sign-in uses Google Identity Services in the browser and `/auth/google-login` on the backend.
- If `GOOGLE_CLIENT_ID` is not configured, the Google button remains disabled with a message instead of fabricating a local user.
- Offline auth fallback is disabled by default. It can be re-enabled only if `VITE_ENABLE_OFFLINE_AUTH=true` is explicitly set.

## Main Routes

- `/login`
- `/register`
- `/problems`
- `/problems/:id`
- `/contests`
- `/contests/:contestId`
- `/contests/:contestId/arena`
- `/profile`
- `/profile/:username`
- `/settings`
- `/admin`
- `/console`

## Domain Lanes

- `DSA` problems submit through `/submit/code`
- `ML` problems submit through `/submit/ml`
- `CTF` problems submit through `/submit/packet`

The backend also returns routing metadata with each problem so the UI stays aligned with the active judge lane.

## Run Vs Submit

`Run`

- Uses `/problem/problems/{id}/run`
- Acts as a preview path
- Does not create a judged submission row

`Submit`

- Uses the domain-specific submit endpoint
- Persists a submission
- Enqueues work in Redis
- Polls real judged status from the backend

## Contest Verification Mode

The Docker build currently enables `VITE_FORCE_LIVE_CONTESTS=true`, so every contest renders as live for verification and judging flows.

Set `VITE_FORCE_LIVE_CONTESTS=false` before rebuilding if you want the UI to return to schedule-based contest timing.

## Local Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The Docker deployment builds this app and serves it through Nginx on `http://localhost:3000`.
