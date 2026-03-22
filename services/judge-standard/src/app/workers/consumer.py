"""RabbitMQ consumer loop for judge-standard.

Connects to RabbitMQ, declares the queue with arguments matching
the submission-service producer, and processes messages one at a time.
"""

import aio_pika

from app.config import settings
from app.logger import get_logger
from app.workers.message_handler import handle_submission_message

logger = get_logger(__name__)


class JudgeConsumer:
    """Async consumer for the standard_judge_queue.

    Processes submissions sequentially (prefetch=1) with manual
    ack/nack for reliability.
    """

    def __init__(self) -> None:
        self.connection: aio_pika.abc.AbstractRobustConnection | None = None
        self.channel: aio_pika.abc.AbstractChannel | None = None
        self.queue: aio_pika.abc.AbstractQueue | None = None

    async def connect(self) -> None:
        """Connect to RabbitMQ and declare the queue.

        Queue arguments MUST match those used by submission-service
        to avoid PRECONDITION_FAILED errors.
        """
        self.connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            reconnect_interval=5,
        )
        self.channel = await self.connection.channel()

        # Process one message at a time
        await self.channel.set_qos(prefetch_count=settings.PREFETCH_COUNT)

        # Declare queue with same args as submission-service producer
        self.queue = await self.channel.declare_queue(
            settings.STANDARD_JUDGE_QUEUE,
            durable=settings.QUEUE_DURABLE,
            arguments={
                "x-message-ttl": settings.MESSAGE_TTL,
                "x-max-length": 100000,
            },
        )

        logger.info(
            "Connected to RabbitMQ, listening on '%s' (prefetch=%d)",
            settings.STANDARD_JUDGE_QUEUE,
            settings.PREFETCH_COUNT,
        )

    async def start(self) -> None:
        """Start consuming messages in an infinite loop.

        Each message is processed, then acked on success or
        nacked (with requeue) on failure.
        """
        await self.connect()

        logger.info("judge-standard worker started, awaiting submissions...")

        async with self.queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=True):
                    try:
                        await handle_submission_message(message.body)
                    except Exception:
                        # message.process(requeue=True) context manager
                        # will nack and requeue on exception
                        logger.warning(
                            "Message will be requeued for retry (correlation_id=%s)",
                            message.correlation_id,
                        )

    async def stop(self) -> None:
        """Stop consumer gracefully."""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("Consumer stopped, RabbitMQ connection closed")
