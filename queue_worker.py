from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import inspect
import logging
import signal
from typing import Any

from integrated_platform.config import Settings, get_settings
from integrated_platform.database import create_database_engine, create_schema, create_session_factory, database_healthcheck
from integrated_platform.judges import JudgeOutcome, judge_code_submission, judge_ml_submission, judge_packet_submission
from integrated_platform.problem_catalog import get_problem
from integrated_platform.queueing import RedisQueueManager
from integrated_platform.routing import routing_for_problem, routing_for_submission_type
from orchestrator import SubmissionOrchestrator


logger = logging.getLogger("queue-worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


class QueueWorker:
    def __init__(
        self,
        *,
        submission_type: str,
        settings: Settings | None = None,
        queue_manager: Any | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.engine = create_database_engine(self.settings.database_url)
        self.session_factory = create_session_factory(self.engine)
        self.queue_manager = queue_manager or RedisQueueManager(
            self.settings.redis_url,
            retry_limit=self.settings.queue_retry_limit,
            retry_base_delay_seconds=self.settings.queue_retry_base_delay_seconds,
            retry_max_delay_seconds=self.settings.queue_retry_max_delay_seconds,
        )
        self._owns_queue_manager = queue_manager is None
        self.submission_type = submission_type
        self.routing = routing_for_submission_type(submission_type)
        self.worker_name = self.routing.worker_pool
        self.orchestrator = SubmissionOrchestrator(
            settings=self.settings,
            session_factory=self.session_factory,
            queue_manager=self.queue_manager,
        )
        self.started_at = datetime.now(timezone.utc)
        self.loop_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        self.last_poll_at: datetime | None = None
        self.last_success_at: datetime | None = None
        self.last_error_at: datetime | None = None
        self.last_error: str | None = None
        self.current_submission_id: str | None = None

    def status_snapshot(self) -> dict[str, Any]:
        return {
            "workerName": self.worker_name,
            "submissionType": self.submission_type,
            "queueName": self.routing.queue_name,
            "judgeLabel": self.routing.judge_label,
            "running": self.loop_running,
            "processedJobs": self.processed_jobs,
            "failedJobs": self.failed_jobs,
            "currentSubmissionId": self.current_submission_id,
            "startedAt": self.started_at.isoformat(),
            "lastPollAt": self.last_poll_at.isoformat() if self.last_poll_at else None,
            "lastSuccessAt": self.last_success_at.isoformat() if self.last_success_at else None,
            "lastErrorAt": self.last_error_at.isoformat() if self.last_error_at else None,
            "lastError": self.last_error,
        }

    async def readiness_status(self) -> dict[str, Any]:
        checks: dict[str, str] = {}
        details = self.status_snapshot()

        database_ok, database_detail = await database_healthcheck(self.engine)
        checks["postgres"] = "ok" if database_ok else "error"
        if not database_ok:
            details["postgresError"] = database_detail

        try:
            redis_ok = bool(await self.queue_manager.ping())
            checks["redis"] = "ok" if redis_ok else "error"
        except Exception as exc:  # pragma: no cover - defensive runtime guard
            checks["redis"] = "error"
            details["redisError"] = str(exc)

        if hasattr(self.queue_manager, "queue_depths"):
            try:
                queue_depths_result = self.queue_manager.queue_depths()
                queue_depths = await queue_depths_result if inspect.isawaitable(queue_depths_result) else queue_depths_result
                details["queueDepths"] = queue_depths.get(self.submission_type, queue_depths)
            except Exception as exc:  # pragma: no cover - observability only
                details["queueDepths"] = {"error": str(exc)}

        overall = "ok" if self.loop_running and all(value == "ok" for value in checks.values()) else "degraded"
        return {
            "status": overall,
            "service": self.worker_name,
            "checks": checks,
            "details": details,
        }

    async def process_once(self) -> bool:
        self.last_poll_at = datetime.now(timezone.utc)
        raw_job, job = await self.queue_manager.claim_next(self.submission_type, timeout=self.settings.queue_poll_timeout)
        if not raw_job or not job:
            return False

        submission_id = str(job["submission_id"])
        self.current_submission_id = submission_id
        snapshot = await self.orchestrator.claim_submission_for_worker(submission_id, self.worker_name)
        if not snapshot:
            await self.queue_manager.ack(self.submission_type, raw_job)
            self.current_submission_id = None
            return False

        submission = snapshot.submission
        competition = snapshot.competition

        try:
            if submission.queue_name != self.routing.queue_name:
                raise RuntimeError(
                    f"Submission {submission_id} is queued on {submission.queue_name} but {self.worker_name} only "
                    f"accepts {self.routing.queue_name}"
                )

            problem_id = (submission.payload or {}).get("problem_id")
            if problem_id is not None:
                problem = get_problem(int(problem_id))
                if not problem:
                    raise RuntimeError(f"Problem {problem_id} was not found for submission {submission_id}")
                expected_route = routing_for_problem(problem)
                if expected_route.submission_type != self.submission_type:
                    raise RuntimeError(
                        f"Submission {submission_id} for problem {problem_id} belongs to {expected_route.worker_pool}, "
                        f"not {self.worker_name}"
                    )

            if self.submission_type == "code":
                outcome = await judge_code_submission(
                    source_text=submission.source_text or "",
                    competition_slug=competition.slug,
                    max_score=competition.max_score,
                    language=submission.language,
                    problem_id=problem_id,
                )
            elif self.submission_type == "ml":
                outcome = await judge_ml_submission(
                    source_text=submission.source_text or "",
                    competition_slug=competition.slug,
                    max_score=competition.max_score,
                    problem_id=problem_id,
                )
            elif self.submission_type == "packet":
                outcome = await judge_packet_submission(
                    source_text=submission.source_text or "",
                    competition_slug=competition.slug,
                    max_score=competition.max_score,
                    problem_id=problem_id,
                )
            else:  # pragma: no cover
                outcome = JudgeOutcome.failed(f"Unsupported worker kind: {self.submission_type}")

            await self.orchestrator.complete_submission(
                submission_id=submission_id,
                worker_name=self.worker_name,
                outcome_status=outcome.status,
                score=outcome.score,
                stdout=outcome.stdout,
                stderr=outcome.stderr,
                metrics=outcome.metrics,
                runtime_ms=outcome.runtime_ms,
                memory_kb=outcome.memory_kb,
                passed=outcome.passed,
            )
            await self.queue_manager.ack(self.submission_type, raw_job)
            self.processed_jobs += 1
            self.last_success_at = datetime.now(timezone.utc)
            self.last_error = None
            return True
        except Exception as exc:  # pragma: no cover
            self.failed_jobs += 1
            self.last_error = str(exc)
            self.last_error_at = datetime.now(timezone.utc)
            retry_outcome = await self.queue_manager.nack(self.submission_type, raw_job, str(exc))
            if isinstance(retry_outcome, dict) and retry_outcome.get("status") == "retry-scheduled":
                await self.orchestrator.requeue_submission(
                    submission_id=submission_id,
                    worker_name=self.worker_name,
                    last_error=str(exc),
                )
                logger.warning(
                    "%s requeued submission %s for retry %s/%s",
                    self.worker_name,
                    submission_id,
                    retry_outcome.get("attempt"),
                    retry_outcome.get("max_attempts"),
                )
            else:
                await self.orchestrator.complete_submission(
                    submission_id=submission_id,
                    worker_name=self.worker_name,
                    outcome_status="failed",
                    score=0.0,
                    stdout="",
                    stderr=str(exc),
                    metrics={"worker_error": True},
                    runtime_ms=0,
                    memory_kb=0,
                    passed=False,
                )
            return False
        finally:
            self.current_submission_id = None

    async def close(self) -> None:
        self.loop_running = False
        if self._owns_queue_manager:
            await self.queue_manager.close()
        await self.engine.dispose()

    async def run_forever(self, stop_event: asyncio.Event | None = None) -> None:
        if self.settings.auto_create_schema:
            await create_schema(self.engine)

        shutdown_event = stop_event or asyncio.Event()
        self.loop_running = True

        def _stop(*_: object) -> None:
            shutdown_event.set()

        loop = asyncio.get_running_loop()
        for current_signal in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(current_signal, _stop)
            except NotImplementedError:  # pragma: no cover - Windows event loop fallback
                continue

        try:
            while not shutdown_event.is_set():
                handled = await self.process_once()
                if not handled:
                    await asyncio.sleep(self.settings.worker_idle_sleep_seconds)
        finally:
            await self.close()


async def _main(submission_type: str) -> None:
    worker = QueueWorker(submission_type=submission_type)
    await worker.run_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run an integration queue worker.")
    parser.add_argument("submission_type", choices=["code", "ml", "packet"], nargs="?", default="code")
    args = parser.parse_args()
    asyncio.run(_main(args.submission_type))
