"""RabbitMQ consumer for judge-cyber."""

import aio_pika

from app.config import settings
from app.logger import get_logger
from app.processor import process_submission

logger = get_logger(__name__)


class CyberJudgeConsumer:
    def __init__(self) -> None:
        self.connection = None
        self.channel = None
        self.queue = None

    async def connect(self) -> None:
        self.connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            reconnect_interval=5,
        )
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=settings.PREFETCH_COUNT)

        self.queue = await self.channel.declare_queue(
            settings.STANDARD_JUDGE_QUEUE,
            durable=settings.QUEUE_DURABLE,
            arguments={"x-message-ttl": settings.MESSAGE_TTL, "x-max-length": 100000},
        )

        logger.info(
            "Connected to RabbitMQ, listening on '%s' (prefetch=%d)",
            settings.STANDARD_JUDGE_QUEUE,
            settings.PREFETCH_COUNT,
        )

    async def start(self) -> None:
        await self.connect()
        logger.info("judge-cyber worker started, awaiting cyber submissions...")

        async with self.queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False):
                    try:
                        await process_submission(message.body)
                    except Exception as exc:
                        logger.error(
                            "Error in cyber message processing, ack and continue: %s",
                            exc,
                            exc_info=True,
                        )

    async def stop(self) -> None:
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("judge-cyber RabbitMQ connection closed")
