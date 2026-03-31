"""judge-cyber worker entrypoint."""

import asyncio
import signal

from app.logger import setup_logging, get_logger
from app.consumer import CyberJudgeConsumer

setup_logging()
logger = get_logger(__name__)


async def main() -> None:
    logger.info("%s worker starting...", "judge-cyber")
    consumer = CyberJudgeConsumer()

    shutdown_event = asyncio.Event()

    def _handle_signal(sig: signal.Signals) -> None:
        logger.info("Received %s, shutting down...", sig.name)
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_signal, sig)

    try:
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
        logger.critical("judge-cyber worker failed: %s", exc, exc_info=True)
    finally:
        logger.info("Cleaning up judge-cyber...")
        await consumer.stop()
        logger.info("judge-cyber worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
