"""Integration tests for Problem Service endpoints.

Tests all REST endpoints via the async HTTP test client:
- POST /api/problems (create)
- GET /api/problems (list with filters)
- GET /api/problems/{id} (get single)
- GET /health (health check)
"""

import pytest
from httpx import AsyncClient


VALID_PROBLEM = {
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target, return indices of the two numbers.",
    "problem_type": "dsa",
    "time_limit": 1000,
    "memory_limit": 256,
    "difficulty": "easy",
    "topics": ["array", "hash-table"],
    "metadata": {"languages": ["python", "cpp"]},
}


class TestHealthEndpoint:
    """Tests for GET /health."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient) -> None:
        """Health endpoint should return 200 with service info."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("healthy", "unhealthy")
        assert data["service"] == "problem-service"
        assert data["version"] == "1.0.0"


class TestCreateProblem:
    """Tests for POST /api/problems."""

    @pytest.mark.asyncio
    async def test_create_valid_problem(self, client: AsyncClient) -> None:
        """Creating a valid problem should return 201 with full data."""
        response = await client.post("/api/problems", json=VALID_PROBLEM)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert data["title"] == "Two Sum"
        assert data["problem_type"] == "dsa"
        assert data["difficulty"] == "easy"
        assert data["topics"] == ["array", "hash-table"]
        assert data["metadata"] == {"languages": ["python", "cpp"]}

    @pytest.mark.asyncio
    async def test_create_duplicate_title(self, client: AsyncClient) -> None:
        """Creating a problem with a duplicate title should return 409."""
        await client.post("/api/problems", json=VALID_PROBLEM)
        response = await client.post("/api/problems", json=VALID_PROBLEM)
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_missing_required_fields(self, client: AsyncClient) -> None:
        """Missing required fields should return 400."""
        response = await client.post("/api/problems", json={"title": "Incomplete"})
        assert response.status_code == 400 or response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_invalid_problem_type(self, client: AsyncClient) -> None:
        """Invalid problem_type should return 400/422."""
        data = {**VALID_PROBLEM, "title": "Bad Type", "problem_type": "invalid"}
        response = await client.post("/api/problems", json=data)
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_create_title_too_short(self, client: AsyncClient) -> None:
        """Title shorter than 3 characters should return 400/422."""
        data = {**VALID_PROBLEM, "title": "AB"}
        response = await client.post("/api/problems", json=data)
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_create_description_too_short(self, client: AsyncClient) -> None:
        """Description shorter than 20 characters should return 400/422."""
        data = {**VALID_PROBLEM, "title": "Short Desc", "description": "Too short"}
        response = await client.post("/api/problems", json=data)
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_create_time_limit_out_of_range(self, client: AsyncClient) -> None:
        """time_limit > 60000 should return 400/422."""
        data = {**VALID_PROBLEM, "title": "Time Limit", "time_limit": 70000}
        response = await client.post("/api/problems", json=data)
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_create_ml_problem(self, client: AsyncClient) -> None:
        """Creating an ML problem with metadata should succeed."""
        data = {
            "title": "Image Classification with CNN",
            "description": "Build a CNN to classify MNIST digits with at least 95% accuracy.",
            "problem_type": "ml",
            "time_limit": 30000,
            "memory_limit": 512,
            "difficulty": "hard",
            "topics": ["deep-learning", "cnn"],
            "metadata": {"framework": "tensorflow"},
        }
        response = await client.post("/api/problems", json=data)
        assert response.status_code == 201
        assert response.json()["problem_type"] == "ml"

    @pytest.mark.asyncio
    async def test_create_cyber_problem(self, client: AsyncClient) -> None:
        """Creating a Cybersecurity problem should succeed."""
        data = {
            "title": "ARP Spoofing Detection Challenge",
            "description": "Analyze PCAP file to detect ARP spoofing attacks in the network.",
            "problem_type": "cyber",
            "time_limit": 5000,
            "memory_limit": 128,
            "difficulty": "medium",
            "topics": ["arp", "network-security"],
            "metadata": {"packet_count": 100},
        }
        response = await client.post("/api/problems", json=data)
        assert response.status_code == 201
        assert response.json()["problem_type"] == "cyber"


class TestListProblems:
    """Tests for GET /api/problems."""

    @pytest.mark.asyncio
    async def test_list_empty(self, client: AsyncClient) -> None:
        """Empty database should return 200 with empty data array."""
        response = await client.get("/api/problems")
        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_with_data(self, client: AsyncClient) -> None:
        """After creating problems, list should return them."""
        await client.post("/api/problems", json=VALID_PROBLEM)
        response = await client.get("/api/problems")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["data"]) == 1

    @pytest.mark.asyncio
    async def test_filter_by_type(self, client: AsyncClient) -> None:
        """Filtering by problem_type should return only matching problems."""
        await client.post("/api/problems", json=VALID_PROBLEM)
        response = await client.get("/api/problems?problem_type=ml")
        assert response.status_code == 200
        assert response.json()["total"] == 0

        response = await client.get("/api/problems?problem_type=dsa")
        assert response.status_code == 200
        assert response.json()["total"] == 1

    @pytest.mark.asyncio
    async def test_filter_by_difficulty(self, client: AsyncClient) -> None:
        """Filtering by difficulty should return only matching problems."""
        await client.post("/api/problems", json=VALID_PROBLEM)
        response = await client.get("/api/problems?difficulty=easy")
        assert response.status_code == 200
        assert response.json()["total"] == 1

        response = await client.get("/api/problems?difficulty=hard")
        assert response.status_code == 200
        assert response.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_search(self, client: AsyncClient) -> None:
        """Search should match against title and description."""
        await client.post("/api/problems", json=VALID_PROBLEM)
        response = await client.get("/api/problems?search=Two+Sum")
        assert response.status_code == 200
        assert response.json()["total"] == 1

        response = await client.get("/api/problems?search=nonexistent")
        assert response.status_code == 200
        assert response.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_pagination(self, client: AsyncClient) -> None:
        """Pagination should respect skip and limit."""
        # Create 3 problems
        for i in range(3):
            data = {**VALID_PROBLEM, "title": f"Problem {i}"}
            await client.post("/api/problems", json=data)

        response = await client.get("/api/problems?skip=0&limit=2")
        data = response.json()
        assert data["total"] == 3
        assert len(data["data"]) == 2
        assert data["limit"] == 2

        response = await client.get("/api/problems?skip=2&limit=2")
        data = response.json()
        assert len(data["data"]) == 1


class TestGetProblem:
    """Tests for GET /api/problems/{id}."""

    @pytest.mark.asyncio
    async def test_get_existing_problem(self, client: AsyncClient) -> None:
        """Getting an existing problem should return 200 with full details."""
        create_resp = await client.post("/api/problems", json=VALID_PROBLEM)
        problem_id = create_resp.json()["id"]

        response = await client.get(f"/api/problems/{problem_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == problem_id
        assert data["title"] == "Two Sum"
        assert data["metadata"] == {"languages": ["python", "cpp"]}

    @pytest.mark.asyncio
    async def test_get_nonexistent_problem(self, client: AsyncClient) -> None:
        """Getting a non-existent problem should return 404."""
        response = await client.get("/api/problems/9999")
        assert response.status_code == 404
