from __future__ import annotations

import os

import httpx
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./integration_test_runtime.db")
os.environ.setdefault("REDIS_URL", "redis://unused/0")
os.environ.setdefault("SECRET_KEY", "integration-test-secret")

from integrated_platform.config import Settings
from orchestrator import create_app
from queue_worker import QueueWorker


class InMemoryQueueManager:
    def __init__(self) -> None:
        self.ready: dict[str, list[str]] = {"code": [], "ml": [], "packet": []}
        self.processing: dict[str, list[str]] = {"code": [], "ml": [], "packet": []}
        self.dead: dict[str, list[str]] = {"code": [], "ml": [], "packet": []}
        self.leaderboards: dict[int, dict[str, float]] = {}

    async def ping(self) -> bool:
        return True

    async def enqueue(self, submission_type: str, payload: dict) -> None:
        import json
        self.ready[submission_type].append(json.dumps(payload))

    async def claim_next(self, submission_type: str, timeout: int) -> tuple[str | None, dict | None]:
        import json
        _ = timeout
        if not self.ready[submission_type]:
            return None, None
        raw = self.ready[submission_type].pop(0)
        self.processing[submission_type].append(raw)
        return raw, json.loads(raw)

    async def ack(self, submission_type: str, raw_job: str) -> None:
        if raw_job in self.processing[submission_type]:
            self.processing[submission_type].remove(raw_job)

    async def nack(self, submission_type: str, raw_job: str, reason: str) -> dict:
        if raw_job in self.processing[submission_type]:
            self.processing[submission_type].remove(raw_job)
        self.dead[submission_type].append(reason)
        return {"status": "dead-lettered", "attempt": 1, "max_attempts": 1}

    async def replace_leaderboard(self, competition_id: int, entries: list[tuple[str, float]]) -> None:
        self.leaderboards[competition_id] = {user_id: score for user_id, score in entries}

    async def upsert_leaderboard_score(self, competition_id: int, user_id: str, score: float) -> None:
        board = self.leaderboards.setdefault(competition_id, {})
        board[user_id] = score

    async def fetch_leaderboard(self, competition_id: int, limit: int) -> list[tuple[str, float]]:
        board = self.leaderboards.get(competition_id, {})
        return sorted(board.items(), key=lambda item: item[1], reverse=True)[:limit]

    async def close(self) -> None:
        return None


@pytest.fixture
async def test_client(tmp_path):
    settings = Settings(
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'integration.db'}",
        redis_url="redis://unused/0",
        secret_key="integration-test-secret",
        auto_create_schema=True,
    )
    queue_manager = InMemoryQueueManager()
    app = create_app(settings_override=settings, queue_manager_override=queue_manager)

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver/api") as client:
            yield client, settings, queue_manager


@pytest.mark.asyncio
async def test_end_to_end_submission_pipeline(test_client):
    client, settings, queue_manager = test_client

    register = await client.post(
        "/auth/register",
        json={
            "username": "integration_user",
            "email": "integration@example.com",
            "password": "password123",
            "displayName": "Integration User",
        },
    )
    assert register.status_code == 200
    token = register.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    competitions_response = await client.get("/competitions", headers=headers)
    assert competitions_response.status_code == 200
    competitions = competitions_response.json()
    code_competition = next(item for item in competitions if item["mode"] == "code")
    ml_competition = next(item for item in competitions if item["mode"] == "ml")
    packet_competition = next(item for item in competitions if item["mode"] == "packet")

    problem_catalog = await client.get("/problem/problems", headers=headers)
    assert problem_catalog.status_code == 200
    problems = problem_catalog.json()["problems"]
    code_problem = next(item for item in problems if item["domain"] == "DSA")
    ml_problem = next(item for item in problems if item["domain"] == "ML")
    packet_problem = next(item for item in problems if item["domain"] == "CTF")

    assert code_problem["submissionType"] == "code"
    assert code_problem["workerPool"] == "judge-standard"
    assert code_problem["queueName"] == "queue:code:ready"
    assert ml_problem["submissionType"] == "ml"
    assert ml_problem["workerPool"] == "judge-ml"
    assert ml_problem["queueName"] == "queue:ml:ready"
    assert packet_problem["submissionType"] == "packet"
    assert packet_problem["workerPool"] == "judge-cyber"
    assert packet_problem["queueName"] == "queue:packet:ready"

    bookmark_on = await client.post(
        f"/problem/problems/{code_problem['id']}/bookmark",
        headers=headers,
        json={
            "username": "integration_user",
            "starred": True,
        },
    )
    assert bookmark_on.status_code == 200
    assert bookmark_on.json()["problem"]["starred"] is True

    catalog_after_bookmark = await client.get(
        "/problem/problems",
        headers=headers,
        params={"username": "integration_user"},
    )
    assert catalog_after_bookmark.status_code == 200
    refreshed_code_problem = next(
        item for item in catalog_after_bookmark.json()["problems"] if item["id"] == code_problem["id"]
    )
    assert refreshed_code_problem["starred"] is True

    wrong_route = await client.post(
        "/submit/ml",
        headers=headers,
        json={
            "competition_id": ml_competition["id"],
            "notebook_payload": "def train_and_predict(train_rows, test_rows):\n    return []\n",
            "problem_id": code_problem["id"],
        },
    )
    assert wrong_route.status_code == 400
    assert "judge-standard" in wrong_route.json()["detail"]

    code_submission = await client.post(
        "/submit/code",
        headers=headers,
        json={
            "competition_id": code_competition["id"],
            "language": "python",
            "problem_id": code_problem["id"],
            "source_code": (
                "import sys\n\n"
                "def solve(data):\n"
                "    values = [int(token) for token in data.split()] if data.strip() else []\n"
                "    return str(sum(values))\n\n"
                "if __name__ == '__main__':\n"
                "    print(solve(sys.stdin.read()), end='')\n"
            ),
        },
    )
    ml_submission = await client.post(
        "/submit/ml",
        headers=headers,
        json={
            "competition_id": ml_competition["id"],
            "problem_id": ml_problem["id"],
            "notebook_payload": (
                "def train_and_predict(train_rows, test_rows):\n"
                "    predictions = []\n"
                "    for row in test_rows:\n"
                "        petal_length = row.get('pl', 0)\n"
                "        if petal_length < 2:\n"
                "            predictions.append('setosa')\n"
                "        elif petal_length > 5:\n"
                "            predictions.append('virginica')\n"
                "        else:\n"
                "            predictions.append('versicolor')\n"
                "    return predictions\n"
            ),
        },
    )
    packet_submission = await client.post(
        "/submit/packet",
        headers=headers,
        json={
            "competition_id": packet_competition["id"],
            "problem_id": packet_problem["id"],
            "packet_script": (
                "from scapy.all import IP, TCP\n\n"
                "def build_packets():\n"
                "    return [IP(dst='10.10.10.10')/TCP(dport=443, flags='S')]\n"
            ),
        },
    )

    assert code_submission.status_code == 202
    assert ml_submission.status_code == 202
    assert packet_submission.status_code == 202

    code_worker = QueueWorker(submission_type="code", settings=settings, queue_manager=queue_manager)
    ml_worker = QueueWorker(submission_type="ml", settings=settings, queue_manager=queue_manager)
    packet_worker = QueueWorker(submission_type="packet", settings=settings, queue_manager=queue_manager)

    await code_worker.process_once()
    await ml_worker.process_once()
    await packet_worker.process_once()

    for submission_id in (
        code_submission.json()["submissionId"],
        ml_submission.json()["submissionId"],
        packet_submission.json()["submissionId"],
    ):
        response = await client.get(f"/submission-status/{submission_id}", headers=headers)
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "accepted"
        if payload["submissionType"] == "code":
            assert payload["worker"] == "judge-standard"
        elif payload["submissionType"] == "ml":
            assert payload["worker"] == "judge-ml"
        elif payload["submissionType"] == "packet":
            assert payload["worker"] == "judge-cyber"

    leaderboard = await client.get(
        "/leaderboard",
        params={"competition_id": code_competition["id"], "limit": 10},
        headers=headers,
    )
    assert leaderboard.status_code == 200
    assert any(entry["username"] == "integration_user" for entry in leaderboard.json()["entries"])

    await code_worker.engine.dispose()
    await ml_worker.engine.dispose()
    await packet_worker.engine.dispose()


@pytest.mark.asyncio
async def test_auth_alias_routes_match_unified_login(test_client):
    client, _, _ = test_client

    unified_login = await client.post("/login", json={"email": "admin@gmail.com", "password": "Admin123"})
    auth_login = await client.post("/auth/login", json={"email": "admin@gmail.com", "password": "Admin123"})

    assert unified_login.status_code == 200
    assert auth_login.status_code == 200
    assert unified_login.json()["user"]["username"] == auth_login.json()["user"]["username"]
