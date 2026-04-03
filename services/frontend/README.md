# Frontend

This is the active web application for the integrated platform.

## Purpose

The frontend talks to the unified backend at `/api` and provides:

- login and registration
- problem browsing by domain
- live solver pages
- contest views and contest arena submissions
- profile and submission history views
- leaderboard access
- an admin/developer console

## Main Routes

- `/login`
- `/register`
- `/problems`
- `/problems/:id`
- `/profile/:username`
- `/contests`
- `/contests/:contestId`
- `/contests/:contestId/arena`
- `/console`

## Domain Lanes

- `DSA` problems submit through `/submit/code`
- `ML` problems submit through `/submit/ml`
- `CTF` problems submit through `/submit/packet`

The backend also returns routing metadata with each problem so the UI stays aligned with the active judge lane.

## Contest Verification Mode

The Docker build currently enables `VITE_FORCE_LIVE_CONTESTS=true`, which makes every contest render as live so arena entry, routing, and judging can be verified immediately.

Set `VITE_FORCE_LIVE_CONTESTS=false` before rebuilding if you want the UI to go back to schedule-based contest timing.

## Local Development

```bash
npm install
npm run dev
```

The Docker deployment builds this app and serves it through Nginx on `http://localhost:3000`.
