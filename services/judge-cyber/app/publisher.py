"""Result publisher for judge-cyber."""

import json
import aio_pika
from aio_pika import DeliveryMode

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


async def publish_result(result: dict) -> None:
    try:
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        channel = await connection.channel()

        await channel.declare_queue(settings.RESULTS_QUEUE, durable=settings.QUEUE_DURABLE)

        message = aio_pika.Message(
            body=json.dumps(result).encode("utf-8"),
            delivery_mode=DeliveryMode.PERSISTENT,
        )

        await channel.default_exchange.publish(message, routing_key=settings.RESULTS_QUEUE)

        logger.info("Published result for submission %s to %s", result.get("submission_id"), settings.RESULTS_QUEUE)

        await connection.close()
    except Exception as exc:
        logger.error("Failed to publish result: %s", exc, exc_info=True)
