"""RabbitMQ connection and queue management with graceful degradation.

Uses aio-pika for async AMQP operations. Provides robust connection
handling that allows the service to continue operating even when
RabbitMQ is unavailable.
"""

import aio_pika
from aio_pika import Message, DeliveryMode

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


class RabbitMQClient:
    """Async RabbitMQ client with graceful degradation.

    The service remains operational even if RabbitMQ is unavailable.
    Submissions are saved to the database regardless, and the queue
    publish is a best-effort operation.
    """

    def __init__(self) -> None:
        self.connection: aio_pika.abc.AbstractRobustConnection | None = None
        self.channel: aio_pika.abc.AbstractChannel | None = None
        self.queue_available: bool = False

    async def connect(self) -> None:
        """Connect to RabbitMQ with robust reconnection.

        If connection fails, the client enters degraded mode and
        logs a warning rather than crashing the service.
        """
        try:
            self.connection = await aio_pika.connect_robust(
                url=settings.RABBITMQ_URL,
                timeout=10,
            )
            self.channel = await self.connection.channel()

            # Declare the queue (idempotent)
            await self.channel.declare_queue(
                settings.STANDARD_JUDGE_QUEUE,
                durable=settings.QUEUE_DURABLE,
                arguments={
                    "x-message-ttl": settings.MESSAGE_TTL,
                    "x-max-length": 100000,
                },
            )

            self.queue_available = True
            logger.info(
                "Connected to RabbitMQ, queue '%s' ready",
                settings.STANDARD_JUDGE_QUEUE,
            )
        except Exception as exc:
            logger.warning("Failed to connect to RabbitMQ: %s", exc)
            self.queue_available = False

    async def disconnect(self) -> None:
        """Close RabbitMQ connection gracefully."""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("RabbitMQ connection closed")
        self.queue_available = False

    async def publish(
        self, message_body: bytes, correlation_id: str
    ) -> tuple[bool, str | None]:
        """Publish a message to the judge queue.

        Args:
            message_body: UTF-8 encoded JSON bytes.
            correlation_id: Unique ID for message tracking (submission_id).

        Returns:
            Tuple of (success, correlation_id or None).
        """
        if not self.queue_available or not self.channel:
            logger.warning(
                "RabbitMQ unavailable, skipping publish for correlation_id=%s",
                correlation_id,
            )
            return False, None

        try:
            message = Message(
                body=message_body,
                correlation_id=correlation_id,
                delivery_mode=DeliveryMode.PERSISTENT,
            )

            await self.channel.default_exchange.publish(
                message,
                routing_key=settings.STANDARD_JUDGE_QUEUE,
            )

            logger.info(
                "Published to queue '%s' | correlation_id=%s",
                settings.STANDARD_JUDGE_QUEUE,
                correlation_id,
            )
            return True, correlation_id

        except Exception as exc:
            logger.error(
                "Failed to publish to RabbitMQ: %s | correlation_id=%s",
                exc,
                correlation_id,
            )
            self.queue_available = False
            return False, None

    async def health_check(self) -> str:
        """Check RabbitMQ connectivity status.

        Returns:
            "connected" or "disconnected".
        """
        if self.queue_available and self.connection and not self.connection.is_closed:
            return "connected"
        return "disconnected"


# Singleton instance
rabbitmq_client = RabbitMQClient()
