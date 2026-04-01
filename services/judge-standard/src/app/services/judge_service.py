"""Judge service — orchestrates the judging process.

Coordinates gRPC calls, code execution, and result publishing.
"""

import json

import aio_pika
from aio_pika import DeliveryMode

from app.config import settings
from app.logger import get_logger
from app.services.problem_client import ProblemClient
from app.services.execution_engine import ExecutionEngine

logger = get_logger(__name__)


class JudgeService:
    """Orchestrate test-case fetch → execution → result publish."""

    def __init__(self) -> None:
        self.problem_client = ProblemClient()
        self.execution_engine = ExecutionEngine()
        self._rabbitmq_connection: aio_pika.abc.AbstractRobustConnection | None = None

    async def fetch_problem(self, problem_id: int) -> dict:
        """Fetch problem metadata via gRPC."""
        return await self.problem_client.get_problem(problem_id)

    async def fetch_test_cases(self, problem_id: int) -> list[dict]:
        """Fetch test cases via gRPC."""
        return await self.problem_client.get_test_cases(problem_id)

    async def execute_code(
        self,
        code: str,
        language: str,
        test_cases: list[dict],
        time_limit: int = 1000,
        memory_limit: int = 256,
    ) -> dict:
        """Execute code against test cases."""
        return await self.execution_engine.execute(
            code=code,
            language=language,
            test_cases=test_cases,
            time_limit=time_limit,
            memory_limit=memory_limit,
        )

    async def publish_results(self, results: dict) -> None:
        """Publish execution results to results_queue for downstream consumers.

        Args:
            results: Dict with submission_id, verdict, test_passed, test_total,
                     execution_time, execution_memory.
        """
        try:
            if not self._rabbitmq_connection or self._rabbitmq_connection.is_closed:
                self._rabbitmq_connection = await aio_pika.connect_robust(
                    settings.RABBITMQ_URL
                )

            channel = await self._rabbitmq_connection.channel()
            await channel.declare_queue(settings.RESULTS_QUEUE, durable=True)

            message = aio_pika.Message(
                body=json.dumps(results).encode("utf-8"),
                delivery_mode=DeliveryMode.PERSISTENT,
            )

            await channel.default_exchange.publish(
                message, routing_key=settings.RESULTS_QUEUE
            )

            logger.info(
                "Results published to '%s' for submission %s",
                settings.RESULTS_QUEUE,
                results.get("submission_id"),
            )

        except Exception as exc:
            logger.error("Failed to publish results: %s", exc)
            # Non-fatal — results are already in DB

    async def close(self) -> None:
        """Close all connections."""
        await self.problem_client.close()
        if self._rabbitmq_connection and not self._rabbitmq_connection.is_closed:
            await self._rabbitmq_connection.close()
