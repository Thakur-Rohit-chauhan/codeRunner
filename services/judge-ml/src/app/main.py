"""judge-ml worker entry point."""

import asyncio
import signal

from app.database import close_db, init_db
from app.logger import get_logger, setup_logging
from app.workers.consumer import JudgeConsumer

setup_logging()
logger = get_logger(__name__)


async def main() -> None:
    """Run the judge-ml worker."""
    logger.info("=" * 60)
    logger.info("judge-ml worker starting...")
    logger.info("=" * 60)

    consumer = JudgeConsumer()
    shutdown_event = asyncio.Event()

    def _handle_signal(sig: signal.Signals) -> None:
        logger.info("Received %s, shutting down...", sig.name)
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_signal, sig)

    try:
        await init_db()

        consumer_task = asyncio.create_task(consumer.start())
        done, pending = await asyncio.wait(
            [consumer_task, asyncio.create_task(shutdown_event.wait())],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        for task in done:
            if task.exception() and not isinstance(task.exception(), asyncio.CancelledError):
                logger.error("Consumer crashed: %s", task.exception())

    except Exception as exc:
        logger.critical("Worker failed to start: %s", exc, exc_info=True)
    finally:
        logger.info("Cleaning up...")
        await consumer.stop()
        await close_db()
        logger.info("judge-ml worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
