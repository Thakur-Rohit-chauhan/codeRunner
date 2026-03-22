"""gRPC client for problem-service.

Fetches test cases and problem metadata via the internal
gRPC highway on problem-service:50051.
"""

import grpc

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


class ProblemClient:
    """Async gRPC client for problem-service.

    Maintains a persistent channel for reuse across requests.
    """

    def __init__(self) -> None:
        self.host_port: str = settings.PROBLEM_SERVICE_GRPC
        self.channel: grpc.aio.Channel | None = None
        self.stub = None

    async def connect(self) -> None:
        """Create the gRPC channel and stub."""
        from app.grpc_gen import problem_pb2_grpc

        self.channel = grpc.aio.insecure_channel(self.host_port)
        self.stub = problem_pb2_grpc.ProblemServiceStub(self.channel)
        logger.info("gRPC channel opened to %s", self.host_port)

    async def _ensure_connected(self) -> None:
        """Lazily connect on first call."""
        if self.stub is None:
            await self.connect()

    async def get_test_cases(self, problem_id: int) -> list[dict]:
        """Fetch all test cases for a problem.

        Returns:
            List of dicts with keys: input, expected_output, hidden.
        """
        from app.grpc_gen import problem_pb2

        await self._ensure_connected()

        try:
            request = problem_pb2.GetTestCasesRequest(problem_id=problem_id)
            response = await self.stub.GetTestCases(request)

            test_cases = [
                {
                    "input": tc.input,
                    "expected_output": tc.expected_output,
                    "hidden": tc.hidden == 1,
                }
                for tc in response.test_cases
            ]

            logger.info(
                "Fetched %d test cases for problem %d (%d visible, %d hidden)",
                response.total_count,
                problem_id,
                response.visible_count,
                response.total_count - response.visible_count,
            )
            return test_cases

        except grpc.RpcError as exc:
            logger.error(
                "gRPC GetTestCases(%d) failed: %s — %s",
                problem_id,
                exc.code(),
                exc.details(),
            )
            raise

    async def get_problem(self, problem_id: int) -> dict:
        """Fetch problem metadata (time_limit, memory_limit, etc.).

        Returns:
            Dict with id, title, time_limit, memory_limit.
        """
        from app.grpc_gen import problem_pb2

        await self._ensure_connected()

        try:
            request = problem_pb2.GetProblemRequest(problem_id=problem_id)
            response = await self.stub.GetProblem(request)

            return {
                "id": response.id,
                "title": response.title,
                "time_limit": response.time_limit,
                "memory_limit": response.memory_limit,
                "problem_type": response.problem_type,
            }

        except grpc.RpcError as exc:
            logger.error(
                "gRPC GetProblem(%d) failed: %s — %s",
                problem_id,
                exc.code(),
                exc.details(),
            )
            raise

    async def close(self) -> None:
        """Close the gRPC channel."""
        if self.channel:
            await self.channel.close()
            logger.info("gRPC channel closed")
