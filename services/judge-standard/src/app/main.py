"""judge-standard worker entry point.

Headless background worker that:
  1. Connects to PostgreSQL (submissions table)
  2. Connects to RabbitMQ (standard_judge_queue)
  3. Connects to problem-service via gRPC (port 50051)
  4. Consumes and judges submissions in an infinite loop

Usage:
    python -m app.main
"""

import asyncio
import signal

from app.logger import setup_logging, get_logger
from app.database import init_db, close_db
from app.workers.consumer import JudgeConsumer

# Initialize logging first
setup_logging()
logger = get_logger(__name__)


async def main() -> None:
    """Run the judge-standard worker."""
    logger.info("=" * 60)
    logger.info("judge-standard worker starting...")
    logger.info("=" * 60)

    consumer = JudgeConsumer()

    # Graceful shutdown handler
    shutdown_event = asyncio.Event()

    def _handle_signal(sig: signal.Signals) -> None:
        logger.info("Received %s, shutting down...", sig.name)
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_signal, sig)

    try:
        # Initialize database connection
        await init_db()

        # Start consuming (runs forever until shutdown)
        consumer_task = asyncio.create_task(consumer.start())

        # Wait for shutdown signal or consumer crash
        done, pending = await asyncio.wait(
            [consumer_task, asyncio.create_task(shutdown_event.wait())],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Cancel remaining tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        # Check if consumer crashed
        for task in done:
            if task.exception() and not isinstance(task.exception(), asyncio.CancelledError):
                logger.error("Consumer crashed: %s", task.exception())

    except Exception as exc:
        logger.critical("Worker failed to start: %s", exc, exc_info=True)
    finally:
        logger.info("Cleaning up...")
        await consumer.stop()
        await close_db()
        logger.info("judge-standard worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
