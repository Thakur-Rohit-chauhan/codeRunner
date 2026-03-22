"""Message handler — processes a single submission message.

Orchestrates the full judging lifecycle:
  parse → QUEUED → fetch test cases → RUNNING → execute → COMPLETED/FAILED
"""

import json
import time
from typing import Any

from app.logger import get_logger
from app.repositories.submission_repository import SubmissionRepository
from app.services.judge_service import JudgeService

logger = get_logger(__name__)

# Shared instances (created once, reused across messages)
_submission_repo = SubmissionRepository()
_judge_service = JudgeService()


async def handle_submission_message(message_body: bytes) -> None:
    """Process a single submission message from the queue.

    Args:
        message_body: Raw JSON bytes from the RabbitMQ message.

    Raises:
        Exception: If processing fails (triggers message Nack/requeue).
    """
    start = time.monotonic()
    submission_id: int | None = None

    try:
        # ── 1. Parse message ──────────────────────────────────
        body: dict[str, Any] = json.loads(message_body)
        submission_id = body["submission_id"]
        problem_id: int = body["problem_id"]
        code: str = body["code"]
        language: str = body["language"]
        user_id: str | None = body.get("user_id")
        contest_id: int | None = body.get("contest_id")

        logger.info(
            "Processing submission %d (problem=%d, lang=%s, user=%s)",
            submission_id,
            problem_id,
            language,
            user_id or "anonymous",
        )

        # ── 2. Update status → RUNNING ────────────────────────
        await _submission_repo.update_status(submission_id, "RUNNING")

        # ── 3. Fetch problem metadata via gRPC ────────────────
        problem = await _judge_service.fetch_problem(problem_id)
        time_limit = problem.get("time_limit", 1000)
        memory_limit = problem.get("memory_limit", 256)

        logger.info(
            "Problem %d: '%s' (time_limit=%dms, memory_limit=%dMB)",
            problem_id,
            problem.get("title", "?"),
            time_limit,
            memory_limit,
        )

        # ── 4. Fetch test cases via gRPC ──────────────────────
        test_cases = await _judge_service.fetch_test_cases(problem_id)
        logger.info(
            "Fetched %d test cases for problem %d",
            len(test_cases),
            problem_id,
        )

        if not test_cases:
            logger.warning(
                "No test cases for problem %d — marking AC by default",
                problem_id,
            )
            await _submission_repo.update_with_results(
                submission_id,
                status="COMPLETED",
                verdict="AC",
                test_passed=0,
                test_total=0,
                execution_time=0,
                execution_memory=0,
            )
            return

        # ── 5. Execute code against test cases ────────────────
        result = await _judge_service.execute_code(
            code=code,
            language=language,
            test_cases=test_cases,
            time_limit=time_limit,
            memory_limit=memory_limit,
        )

        # ── 6. Update submission with results ─────────────────
        await _submission_repo.update_with_results(
            submission_id,
            status="COMPLETED",
            verdict=result["verdict"],
            test_passed=result["test_passed"],
            test_total=result["test_total"],
            execution_time=result["execution_time"],
            execution_memory=result["execution_memory"],
            error_message=result.get("error_message"),
        )

        # ── 7. Publish results to results_queue ───────────────
        await _judge_service.publish_results(
            {
                "submission_id": submission_id,
                "problem_id": problem_id,
                "user_id": user_id,
                "contest_id": contest_id,
                "verdict": result["verdict"],
                "test_passed": result["test_passed"],
                "test_total": result["test_total"],
                "execution_time": result["execution_time"],
                "execution_memory": result["execution_memory"],
            }
        )

        elapsed = (time.monotonic() - start) * 1000
        emoji = "✅" if result["verdict"] == "AC" else "❌"
        logger.info(
            "%s Submission %d complete: %s (%d/%d) | total=%.0fms",
            emoji,
            submission_id,
            result["verdict"],
            result["test_passed"],
            result["test_total"],
            elapsed,
        )

    except Exception as exc:
        elapsed = (time.monotonic() - start) * 1000
        logger.error(
            "❌ Error processing submission %s: %s | elapsed=%.0fms",
            submission_id,
            exc,
            elapsed,
            exc_info=True,
        )
        # Mark as FAILED in DB
        if submission_id is not None:
            try:
                await _submission_repo.set_error(submission_id, str(exc))
            except Exception:
                logger.error("Failed to mark submission %d as FAILED", submission_id)
        raise
