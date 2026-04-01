"""Integration tests for Submission Service endpoints."""

import pytest
from httpx import AsyncClient


VALID_SUBMISSION = {
    "problem_id": 1,
    "code": "def solve(nums, target):\n    for i in range(len(nums)-1):\n        if nums[i] + nums[i+1] == target:\n            return [i, i+1]\n    return []",
    "language": "python",
}


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "submission-service"
        assert data["version"] == "1.0.0"


class TestCreateSubmission:
    @pytest.mark.asyncio
    async def test_create_valid_submission(self, client: AsyncClient) -> None:
        response = await client.post("/api/submissions", json=VALID_SUBMISSION)
        assert response.status_code == 202
        data = response.json()
        assert data["id"] is not None
        assert data["problem_id"] == 1
        assert data["language"] == "python"
        assert data["status"] == "PENDING"

    @pytest.mark.asyncio
    async def test_create_missing_code(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/submissions",
            json={"problem_id": 1, "language": "python"},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_invalid_language(self, client: AsyncClient) -> None:
        data = {**VALID_SUBMISSION, "language": "cobol"}
        response = await client.post("/api/submissions", json=data)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_code_too_short(self, client: AsyncClient) -> None:
        data = {**VALID_SUBMISSION, "code": "x = 1"}
        response = await client.post("/api/submissions", json=data)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_negative_problem_id(self, client: AsyncClient) -> None:
        data = {**VALID_SUBMISSION, "problem_id": -1}
        response = await client.post("/api/submissions", json=data)
        assert response.status_code == 400


class TestListSubmissions:
    @pytest.mark.asyncio
    async def test_list_empty(self, client: AsyncClient) -> None:
        response = await client.get("/api/submissions")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

    @pytest.mark.asyncio
    async def test_list_after_create(self, client: AsyncClient) -> None:
        await client.post("/api/submissions", json=VALID_SUBMISSION)
        response = await client.get("/api/submissions")
        assert response.status_code == 200
        assert response.json()["total"] == 1

    @pytest.mark.asyncio
    async def test_filter_by_status(self, client: AsyncClient) -> None:
        await client.post("/api/submissions", json=VALID_SUBMISSION)
        response = await client.get("/api/submissions?status=PENDING")
        assert response.status_code == 200
        assert response.json()["total"] >= 1


class TestGetSubmission:
    @pytest.mark.asyncio
    async def test_get_existing(self, client: AsyncClient) -> None:
        create_resp = await client.post("/api/submissions", json=VALID_SUBMISSION)
        sub_id = create_resp.json()["id"]
        response = await client.get(f"/api/submissions/{sub_id}")
        assert response.status_code == 200
        assert response.json()["id"] == sub_id

    @pytest.mark.asyncio
    async def test_get_nonexistent(self, client: AsyncClient) -> None:
        response = await client.get("/api/submissions/9999")
        assert response.status_code == 404
