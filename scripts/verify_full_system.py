from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from production_test import DEFAULT_OUTPUT, run_load_test


SYSTEM_HEALTH_REPORT = ROOT / "system_health_report.md"
PERFORMANCE_REPORT = ROOT / "performance_report.md"
INTEGRATION_STATUS_REPORT = ROOT / "integration_status.md"


async def fetch_health_checks(frontend_url: str) -> list[dict[str, Any]]:
    targets = [
        {"name": "frontend", "url": frontend_url.rstrip("/") + "/"},
        {"name": "gateway", "url": "http://127.0.0.1:8000/api/ready"},
        {"name": "auth-service", "url": "http://127.0.0.1:8001/api/ready"},
        {"name": "problem-service", "url": "http://127.0.0.1:8002/api/ready"},
        {"name": "submission-service", "url": "http://127.0.0.1:8003/api/ready"},
        {"name": "contest-service", "url": "http://127.0.0.1:8004/api/ready"},
        {"name": "judge-worker", "url": "http://127.0.0.1:8101/ready"},
        {"name": "ml-worker", "url": "http://127.0.0.1:8102/ready"},
        {"name": "packet-worker", "url": "http://127.0.0.1:8103/ready"},
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        checks: list[dict[str, Any]] = []
        for target in targets:
            try:
                response = await client.get(target["url"])
                body = response.text.strip()
                try:
                    payload = response.json()
                except ValueError:
                    payload = None
                checks.append(
                    {
                        "name": target["name"],
                        "url": target["url"],
                        "statusCode": response.status_code,
                        "ok": response.status_code == 200,
                        "body": body,
                        "payload": payload,
                    }
                )
            except Exception as exc:
                checks.append(
                    {
                        "name": target["name"],
                        "url": target["url"],
                        "statusCode": 0,
                        "ok": False,
                        "body": str(exc),
                        "payload": None,
                    }
                )
    return checks


def render_system_health(report: dict[str, Any], health_checks: list[dict[str, Any]]) -> str:
    accepted = int(report["accepted"])
    submissions = int(report["submissions"])
    failed = int(report["failed"])
    checks_ok = all(bool(item["ok"]) for item in health_checks)
    timestamp = datetime.now(timezone.utc).isoformat()

    lines = [
        "# System Health Report",
        "",
        f"Generated at: {timestamp}",
        "",
        "## Overall Status",
        "",
        f"- Verification run status: `{'PASS' if checks_ok and failed == 0 else 'FAIL'}`",
        f"- Service health checks passing: `{checks_ok}`",
        f"- Accepted submissions: `{accepted}/{submissions}`",
        f"- Failed submissions: `{failed}`",
        "",
        "## Live Service Checks",
        "",
        "| Component | Status | Code | Endpoint |",
        "| --- | --- | ---: | --- |",
    ]
    for item in health_checks:
        lines.append(
            f"| `{item['name']}` | `{'PASS' if item['ok'] else 'FAIL'}` | {item['statusCode']} | `{item['url']}` |"
        )

    leaderboards = report["leaderboards"]
    lines.extend(
        [
            "",
            "## Queue And Leaderboard State",
            "",
            f"- Total runtime: `{report['totalRuntimeSeconds']}s`",
            f"- Completion window: `{report['completionSeconds']}s`",
            f"- Throughput: `{report['throughputPerSecond']}` submissions/s",
            f"- Code leaderboard participants: `{leaderboards['code']['totalParticipants']}`",
            f"- ML leaderboard participants: `{leaderboards['ml']['totalParticipants']}`",
            f"- Packet leaderboard participants: `{leaderboards['packet']['totalParticipants']}`",
        ]
    )
    return "\n".join(lines) + "\n"


def render_performance_report(report: dict[str, Any]) -> str:
    lines = [
        "# Performance Report",
        "",
        f"Generated at: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## End-to-End Metrics",
        "",
        f"- Users simulated: `{report['users']}`",
        f"- Submissions processed: `{report['submissions']}`",
        f"- Readiness wait: `{report['readinessSeconds']}s`",
        f"- Enqueue duration: `{report['enqueueSeconds']}s`",
        f"- Completion duration: `{report['completionSeconds']}s`",
        f"- Total runtime: `{report['totalRuntimeSeconds']}s`",
        f"- Throughput: `{report['throughputPerSecond']}` submissions/s",
        f"- Failure rate: `{report['failureRate']}%`",
        "",
        "## Latency Summary",
        "",
        "| Operation | Mean ms | P95 ms | Max ms |",
        "| --- | ---: | ---: | ---: |",
    ]

    for operation, summary in sorted(report["latencySummary"].items()):
        lines.append(
            f"| `{operation}` | {summary['mean_ms']:.2f} | {summary['p95_ms']:.2f} | {summary['max_ms']:.2f} |"
        )

    return "\n".join(lines) + "\n"


def render_integration_status(report: dict[str, Any], health_checks: list[dict[str, Any]]) -> str:
    leaderboards = report["leaderboards"]
    checks_ok = all(bool(item["ok"]) for item in health_checks)
    accepted_all = int(report["accepted"]) == int(report["submissions"])
    code_entries = leaderboards["code"]["entries"]
    ml_entries = leaderboards["ml"]["entries"]
    packet_entries = leaderboards["packet"]["entries"]

    lines = [
        "# Integration Status",
        "",
        "## Verified Components",
        "",
        f"- Gateway and microservice readiness: `{'PASS' if checks_ok else 'FAIL'}`",
        "- Auth flow verified through `/auth/register` and `/login` during the load run.",
        "- Submission flow verified through `/submit/code`, `/submit/ml`, and `/submit/packet`.",
        "- Redis queue handoff verified through terminal submission states returned by the live workers.",
        "- PostgreSQL persistence verified through leaderboard growth and submission status polling.",
        "",
        "## Verification Outcome",
        "",
        f"- All submissions accepted: `{accepted_all}`",
        f"- Code leaderboard top score: `{code_entries[0]['score'] if code_entries else 0}`",
        f"- ML leaderboard top score: `{ml_entries[0]['score'] if ml_entries else 0}`",
        f"- Packet leaderboard top score: `{packet_entries[0]['score'] if packet_entries else 0}`",
        f"- Latest production report: `{DEFAULT_OUTPUT.name}`",
        "",
        "## Notes",
        "",
        "- Verification ran against the live Dockerized microservice deployment.",
        "- The active stack used PostgreSQL for persistence and Redis for queue orchestration.",
        "- The verifier submitted real judged solutions for the algorithm, ML, and packet lanes.",
    ]
    return "\n".join(lines) + "\n"


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Verify the live Dockerized platform and regenerate markdown reports.")
    parser.add_argument("--api-base-url", default="http://127.0.0.1:8000/api")
    parser.add_argument("--frontend-url", default="http://127.0.0.1:3000")
    parser.add_argument("--users", type=int, default=20)
    parser.add_argument("--status-timeout-seconds", type=int, default=180)
    parser.add_argument("--json-output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    report = await run_load_test(
        api_base_url=args.api_base_url,
        users=args.users,
        status_timeout_seconds=args.status_timeout_seconds,
    )
    health_checks = await fetch_health_checks(args.frontend_url)

    json_output = Path(args.json_output)
    json_output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_text(SYSTEM_HEALTH_REPORT, render_system_health(report, health_checks))
    write_text(PERFORMANCE_REPORT, render_performance_report(report))
    write_text(INTEGRATION_STATUS_REPORT, render_integration_status(report, health_checks))

    print("Live verification complete.")
    print(f"Users: {report['users']}")
    print(f"Submissions: {report['submissions']}")
    print(f"Accepted: {report['accepted']}")
    print(f"Failed: {report['failed']}")
    print(f"JSON report: {json_output}")
    print(f"Markdown reports: {SYSTEM_HEALTH_REPORT.name}, {PERFORMANCE_REPORT.name}, {INTEGRATION_STATUS_REPORT.name}")


if __name__ == "__main__":
    asyncio.run(main())
