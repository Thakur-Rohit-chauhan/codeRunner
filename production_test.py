from __future__ import annotations

import argparse
import asyncio
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import statistics
import time
from typing import Any

import httpx


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "production_test_report.json"


@dataclass(slots=True)
class TimedResponse:
    response: httpx.Response
    duration_ms: float


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = round((pct / 100.0) * (len(ordered) - 1))
    return float(ordered[max(0, min(index, len(ordered) - 1))])


async def timed_request(coro) -> TimedResponse:
    started = time.perf_counter()
    response = await coro
    elapsed = (time.perf_counter() - started) * 1000.0
    return TimedResponse(response=response, duration_ms=elapsed)


async def fetch_json(client: httpx.AsyncClient, method: str, url: str, **kwargs: Any) -> TimedResponse:
    result = await timed_request(client.request(method, url, **kwargs))
    result.response.raise_for_status()
    return result


def summarize_latency(values: list[float]) -> dict[str, float]:
    if not values:
        return {"mean_ms": 0.0, "p95_ms": 0.0, "max_ms": 0.0}
    return {
        "mean_ms": round(statistics.mean(values), 2),
        "p95_ms": round(percentile(values, 95), 2),
        "max_ms": round(max(values), 2),
    }


def build_payloads(index: int, competitions: dict[str, dict[str, Any]]) -> list[tuple[str, dict[str, Any]]]:
    return [
        (
            "code",
            {
                "competition_id": competitions["code"]["id"],
                "language": "python",
                "source_code": (
                    "def solve(data):\n"
                    "    values = list(map(int, data.split())) if data else []\n"
                    f"    return str(sum(values) + {index % 11})\n"
                ),
            },
        ),
        (
            "ml",
            {
                "competition_id": competitions["ml"]["id"],
                "entrypoint": "train",
                "notebook_payload": (
                    "def train(dataset):\n"
                    f"    hidden_test_accuracy={0.78 + (index % 10) * 0.02:.2f}\n"
                    "    return {'status': 'ok'}\n"
                ),
            },
        ),
        (
            "packet",
            {
                "competition_id": competitions["packet"]["id"],
                "topology": f"prod-net-{index:03d}",
                "packet_script": (
                    "from scapy.all import IP, TCP\n"
                    f"packet = IP(dst='10.10.{index % 8}.{20 + index % 10}')/TCP(flags='S')\n"
                ),
            },
        ),
    ]


async def wait_for_ready(base_url: str, timeout_seconds: int) -> None:
    deadline = time.monotonic() + timeout_seconds
    async with httpx.AsyncClient(timeout=10.0) as client:
        while time.monotonic() < deadline:
            try:
                response = await client.get(f"{base_url.rstrip('/')}/ready")
                if response.status_code == 200:
                    return
            except httpx.HTTPError:
                pass
            await asyncio.sleep(2.0)
    raise TimeoutError(f"Service at {base_url} did not become ready within {timeout_seconds}s")


async def register_and_submit(
    index: int,
    base_url: str,
    competitions: dict[str, dict[str, Any]],
    latency_buckets: defaultdict[str, list[float]],
    run_label: str,
) -> dict[str, Any]:
    username = f"prod_user_{run_label}_{index:03d}"
    email = f"{username}@loadtest.local"

    async with httpx.AsyncClient(base_url=base_url, timeout=60.0) as client:
        register = await timed_request(
            client.post(
                "/auth/register",
                json={
                    "username": username,
                    "email": email,
                    "password": "password123",
                    "displayName": f"Production User {index:03d}",
                },
            )
        )
        if register.response.status_code not in {200, 409}:
            register.response.raise_for_status()
        latency_buckets["register"].append(register.duration_ms)

        login = await fetch_json(client, "POST", "/login", json={"email": email, "password": "password123"})
        latency_buckets["login"].append(login.duration_ms)
        token = login.response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        submission_ids: list[str] = []
        for mode, payload in build_payloads(index, competitions):
            submit = await fetch_json(client, "POST", f"/submit/{mode}", json=payload, headers=headers)
            latency_buckets[f"submit_{mode}"].append(submit.duration_ms)
            submission_ids.append(submit.response.json()["submissionId"])

        return {
            "username": username,
            "email": email,
            "submissionIds": submission_ids,
        }


async def poll_submission_status(
    base_url: str,
    admin_headers: dict[str, str],
    submission_id: str,
    timeout_seconds: int,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        while time.monotonic() < deadline:
            response = await client.get(f"/submission-status/{submission_id}", headers=admin_headers)
            response.raise_for_status()
            payload = response.json()
            if payload["status"] in {"accepted", "failed"}:
                return payload
            await asyncio.sleep(1.0)
    raise TimeoutError(f"Submission {submission_id} did not reach a terminal state within {timeout_seconds}s")


async def collect_leaderboards(
    base_url: str,
    admin_headers: dict[str, str],
    competitions: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    snapshots: dict[str, Any] = {}
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        for mode, competition in competitions.items():
            response = await client.get(
                "/leaderboard",
                headers=admin_headers,
                params={"competition_id": competition["id"], "limit": 10},
            )
            response.raise_for_status()
            snapshots[mode] = response.json()
    return snapshots


async def run_load_test(
    *,
    api_base_url: str,
    users: int,
    status_timeout_seconds: int,
) -> dict[str, Any]:
    run_label = str(int(time.time()))
    ready_started = time.perf_counter()
    await wait_for_ready(api_base_url, timeout_seconds=180)
    readiness_seconds = time.perf_counter() - ready_started

    latency_buckets: defaultdict[str, list[float]] = defaultdict(list)

    async with httpx.AsyncClient(base_url=api_base_url, timeout=60.0) as client:
        login = await fetch_json(client, "POST", "/login", json={"email": "admin@gmail.com", "password": "Admin123"})
        latency_buckets["admin_login"].append(login.duration_ms)
        admin_headers = {"Authorization": f"Bearer {login.response.json()['token']}"}

        competitions_response = await fetch_json(client, "GET", "/competitions", headers=admin_headers)
        competitions = {
            item["mode"]: item
            for item in competitions_response.response.json()
            if item["mode"] in {"code", "ml", "packet"}
        }

    submit_started = time.perf_counter()
    user_runs = await asyncio.gather(
        *(
            register_and_submit(index, api_base_url, competitions, latency_buckets, run_label)
            for index in range(1, users + 1)
        )
    )
    enqueue_seconds = time.perf_counter() - submit_started

    submission_ids = [submission_id for user_run in user_runs for submission_id in user_run["submissionIds"]]

    completion_started = time.perf_counter()
    statuses = await asyncio.gather(
        *(poll_submission_status(api_base_url, admin_headers, submission_id, status_timeout_seconds) for submission_id in submission_ids)
    )
    completion_seconds = time.perf_counter() - completion_started

    leaderboards = await collect_leaderboards(api_base_url, admin_headers, competitions)

    accepted = sum(1 for status in statuses if status["status"] == "accepted")
    failed = len(statuses) - accepted
    total_runtime = readiness_seconds + enqueue_seconds + completion_seconds

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apiBaseUrl": api_base_url,
        "users": users,
        "submissions": len(submission_ids),
        "readinessSeconds": round(readiness_seconds, 2),
        "enqueueSeconds": round(enqueue_seconds, 2),
        "completionSeconds": round(completion_seconds, 2),
        "totalRuntimeSeconds": round(total_runtime, 2),
        "throughputPerSecond": round(len(submission_ids) / max(completion_seconds, 0.001), 2),
        "accepted": accepted,
        "failed": failed,
        "failureRate": round((failed / max(len(statuses), 1)) * 100.0, 2),
        "latencySummary": {operation: summarize_latency(values) for operation, values in sorted(latency_buckets.items())},
        "leaderboards": leaderboards,
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run production load verification against the Docker deployment.")
    parser.add_argument("--api-base-url", default="http://127.0.0.1:8000/api")
    parser.add_argument("--users", type=int, default=100)
    parser.add_argument("--status-timeout-seconds", type=int, default=180)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    report = await run_load_test(
        api_base_url=args.api_base_url,
        users=args.users,
        status_timeout_seconds=args.status_timeout_seconds,
    )

    output_path = Path(args.output)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Production load test complete.")
    print(f"Users: {report['users']}")
    print(f"Submissions: {report['submissions']}")
    print(f"Accepted: {report['accepted']}")
    print(f"Failed: {report['failed']}")
    print(f"Failure rate: {report['failureRate']}%")
    print(f"Throughput: {report['throughputPerSecond']} submissions/s")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
