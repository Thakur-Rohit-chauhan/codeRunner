from __future__ import annotations

import argparse
import asyncio
import logging
import signal

import uvicorn
from fastapi import FastAPI, HTTPException, status

from queue_worker import QueueWorker


logger = logging.getLogger("worker-manager")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


class WorkerManager:
    def __init__(self, *, submission_type: str, host: str = "0.0.0.0", port: int = 8101) -> None:
        self.worker = QueueWorker(submission_type=submission_type)
        self.host = host
        self.port = port
        self.stop_event = asyncio.Event()
        self.app = self._build_app()

    def _build_app(self) -> FastAPI:
        app = FastAPI(title=f"{self.worker.worker_name} health", version="1.0.0")

        @app.get("/health")
        async def health() -> dict:
            return await self.worker.readiness_status()

        @app.get("/ready")
        async def ready() -> dict:
            payload = await self.worker.readiness_status()
            if payload["status"] != "ok":
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=payload)
            return payload

        return app

    async def run(self) -> None:
        server = uvicorn.Server(
            uvicorn.Config(
                self.app,
                host=self.host,
                port=self.port,
                log_level="info",
                access_log=False,
            )
        )

        def _stop(*_: object) -> None:
            self.stop_event.set()
            server.should_exit = True

        loop = asyncio.get_running_loop()
        for current_signal in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(current_signal, _stop)
            except NotImplementedError:  # pragma: no cover - Windows event loop fallback
                continue

        worker_task = asyncio.create_task(self.worker.run_forever(self.stop_event), name=f"{self.worker.worker_name}-loop")
        server_task = asyncio.create_task(server.serve(), name=f"{self.worker.worker_name}-health")

        first_exception: BaseException | None = None
        try:
            done, _ = await asyncio.wait({worker_task, server_task}, return_when=asyncio.FIRST_EXCEPTION)
            for task in done:
                exc = task.exception()
                if exc is not None:
                    first_exception = exc
                    break
        finally:
            self.stop_event.set()
            server.should_exit = True
            results = await asyncio.gather(worker_task, server_task, return_exceptions=True)
            if first_exception is None:
                for result in results:
                    if isinstance(result, BaseException) and not isinstance(result, asyncio.CancelledError):
                        first_exception = result
                        break

        if first_exception is not None:
            raise first_exception


async def _main(submission_type: str, host: str, port: int) -> None:
    manager = WorkerManager(submission_type=submission_type, host=host, port=port)
    await manager.run()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run a production worker with readiness endpoints.")
    parser.add_argument("submission_type", choices=["code", "ml", "packet"], nargs="?", default="code")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8101)
    args = parser.parse_args()
    asyncio.run(_main(args.submission_type, args.host, args.port))
