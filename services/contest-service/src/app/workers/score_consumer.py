"""Score consumer — consumes judge results from RabbitMQ and updates Redis leaderboard.

Listens on 'results_queue' published by judge-standard after each submission
is judged. On receiving a verdict, calculates points and updates the Redis
leaderboard Sorted Set.
"""

import json
import asyncio

import aio_pika
from aio_pika import IncomingMessage

from app.config import settings
from app.logger import get_logger
from app.redis_client import redis_client
from app.services.leaderboard_service import LeaderboardService
from app.services.score_calculator import calculate_points

logger = get_logger(__name__)


class ScoreConsumer:
    """RabbitMQ consumer that updates leaderboards from judge results."""

    def __init__(self) -> None:
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._running = False

    async def start(self) -> None:
        """Connect to RabbitMQ and begin consuming from results_queue."""
        try:
            self._connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            self._channel = await self._connection.channel()
            await self._channel.set_qos(prefetch_count=1)

            queue = await self._channel.declare_queue(
                settings.RESULTS_QUEUE,
                durable=settings.QUEUE_DURABLE,
            )

            self._running = True
            await queue.consume(self._on_message)

            logger.info(
                "Score consumer started — listening on '%s'",
                settings.RESULTS_QUEUE,
            )

        except Exception as exc:
            logger.error("Failed to start score consumer: %s", exc)
            raise

    async def _on_message(self, message: IncomingMessage) -> None:
        """Handle a single result message from judge-standard.

        Expected message body:
        {
            "submission_id": 42,
            "problem_id": 1,
            "verdict": "AC",
            "test_passed": 5,
            "test_total": 5,
            "execution_time": 120,
            "execution_memory": 32
        }

        Note: user_id and contest_id may be included if the submission
        was made in a contest context. If missing, the message is
        acknowledged but no leaderboard update is performed.
        """
        async with message.process():
            try:
                body = json.loads(message.body.decode("utf-8"))

                submission_id = body.get("submission_id")
                verdict = body.get("verdict", "")
                user_id = body.get("user_id")
                contest_id = body.get("contest_id")

                logger.info(
                    "Received result: submission=%s, verdict=%s, user=%s, contest=%s",
                    submission_id, verdict, user_id, contest_id,
                )

                # Only update leaderboard if contest context is present
                if not user_id or not contest_id:
                    logger.debug(
                        "Skipping leaderboard update — no contest context "
                        "(user_id=%s, contest_id=%s)",
                        user_id, contest_id,
                    )
                    return

                # Calculate points
                points = calculate_points(verdict)

                # Update Redis leaderboard
                leaderboard_svc = LeaderboardService(redis_client.client)
                result = await leaderboard_svc.update_score(
                    contest_id=int(contest_id),
                    user_id=user_id,
                    points=points,
                    submission_id=submission_id,
                )

                emoji = "✅" if verdict == "AC" else "❌"
                logger.info(
                    "%s Leaderboard updated: user=%s, contest=%s, +%d → score=%d, rank=%d",
                    emoji, user_id, contest_id, points,
                    result["new_score"], result["rank"],
                )

            except json.JSONDecodeError as exc:
                logger.error("Invalid JSON in result message: %s", exc)
            except Exception as exc:
                logger.error("Error processing result message: %s", exc, exc_info=True)

    async def stop(self) -> None:
        """Disconnect from RabbitMQ."""
        self._running = False
        if self._channel and not self._channel.is_closed:
            await self._channel.close()
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
        logger.info("Score consumer stopped")


score_consumer = ScoreConsumer()
