"""Tests for submission queue routing based on problem type and language."""

import pytest
from httpx import AsyncClient

from app.config import settings


VALID_NOTEBOOK_SUBMISSION = {
    "problem_id": 1,
    "code": "{\"cells\": [{\"cell_type\": \"code\", \"source\": [\"import sklearn\\n\", \"metrics = {'accuracy': 0.91}\\n\"]}]}",
    "language": "notebook",
}


@pytest.mark.asyncio
async def test_ml_problem_routes_to_ml_queue(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ML problems should be published to the dedicated ML queue."""
    published: list[str] = []

    async def fake_get_problem(self, problem_id: int) -> dict:
        return {"id": problem_id, "problem_type": "ml"}

    async def fake_publish(message_body: bytes, correlation_id: str, queue_name: str):
        published.append(queue_name)
        return True, correlation_id

    monkeypatch.setattr(
        "app.services.problem_service_client.ProblemServiceClient.get_problem",
        fake_get_problem,
    )
    monkeypatch.setattr("app.rabbitmq.rabbitmq_client.publish", fake_publish)

    response = await client.post("/api/submissions", json=VALID_NOTEBOOK_SUBMISSION)

    assert response.status_code == 202
    assert response.json()["status"] == "QUEUED"
    assert published == [settings.ML_JUDGE_QUEUE]


@pytest.mark.asyncio
async def test_notebook_rejected_for_non_ml_problem(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Notebook submissions should not be accepted for non-ML problems."""

    async def fake_get_problem(self, problem_id: int) -> dict:
        return {"id": problem_id, "problem_type": "dsa"}

    monkeypatch.setattr(
        "app.services.problem_service_client.ProblemServiceClient.get_problem",
        fake_get_problem,
    )

    response = await client.post("/api/submissions", json=VALID_NOTEBOOK_SUBMISSION)

    assert response.status_code == 400
    assert "Notebook submissions are only supported for ML problems" in response.text


@pytest.mark.asyncio
async def test_notebook_falls_back_to_ml_queue_when_lookup_unavailable(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Notebook submissions should still route to the ML queue if lookup fails."""
    published: list[str] = []

    async def fake_get_problem(self, problem_id: int):
        return None

    async def fake_publish(message_body: bytes, correlation_id: str, queue_name: str):
        published.append(queue_name)
        return True, correlation_id

    monkeypatch.setattr(
        "app.services.problem_service_client.ProblemServiceClient.get_problem",
        fake_get_problem,
    )
    monkeypatch.setattr("app.rabbitmq.rabbitmq_client.publish", fake_publish)

    response = await client.post("/api/submissions", json=VALID_NOTEBOOK_SUBMISSION)

    assert response.status_code == 202
    assert published == [settings.ML_JUDGE_QUEUE]
