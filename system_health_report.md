# System Health Report

Generated at: 2026-04-03T10:23:48.160407+00:00

## Overall Status

- Verification run status: `PASS`
- Service health checks passing: `True`
- Accepted submissions: `300/300`
- Failed submissions: `0`

## Live Service Checks

| Component | Status | Code | Endpoint |
| --- | --- | ---: | --- |
| `frontend` | `PASS` | 200 | `http://127.0.0.1:3000/` |
| `gateway` | `PASS` | 200 | `http://127.0.0.1:8000/api/ready` |
| `auth-service` | `PASS` | 200 | `http://127.0.0.1:8001/api/ready` |
| `problem-service` | `PASS` | 200 | `http://127.0.0.1:8002/api/ready` |
| `submission-service` | `PASS` | 200 | `http://127.0.0.1:8003/api/ready` |
| `contest-service` | `PASS` | 200 | `http://127.0.0.1:8004/api/ready` |
| `judge-worker` | `PASS` | 200 | `http://127.0.0.1:8101/ready` |
| `ml-worker` | `PASS` | 200 | `http://127.0.0.1:8102/ready` |
| `packet-worker` | `PASS` | 200 | `http://127.0.0.1:8103/ready` |

## Queue And Leaderboard State

- Total runtime: `254.93s`
- Completion window: `184.92s`
- Throughput: `1.62` submissions/s
- Code leaderboard participants: `258`
- ML leaderboard participants: `262`
- Packet leaderboard participants: `260`
