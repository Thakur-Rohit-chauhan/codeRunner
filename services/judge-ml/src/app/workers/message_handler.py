"""Process a single ML submission message."""

import json
import time
from typing import Any

from app.logger import get_logger
from app.repositories.submission_repository import SubmissionRepository
from app.services.judge_service import JudgeService

logger = get_logger(__name__)

_submission_repo = SubmissionRepository()
_judge_service = JudgeService()


async def handle_submission_message(message_body: bytes) -> None:
    """Process one ML submission from RabbitMQ."""
    start = time.monotonic()
    submission_id: int | None = None

    try:
        body: dict[str, Any] = json.loads(message_body)
        submission_id = body["submission_id"]
        problem_id: int = body["problem_id"]
        code: str = body["code"]
        language: str = body["language"]
        user_id: str | None = body.get("user_id")
        contest_id: int | None = body.get("contest_id")
        hinted_problem_type: str | None = body.get("problem_type")

        logger.info(
            "Processing ML submission %d (problem=%d, lang=%s, user=%s)",
            submission_id,
            problem_id,
            language,
            user_id or "anonymous",
        )

        await _submission_repo.update_status(submission_id, "RUNNING")

        problem = await _judge_service.fetch_problem(problem_id)
        if problem.get("problem_type") != "ml":
            raise ValueError(
                f"judge-ml received non-ML problem {problem_id} "
                f"(type={problem.get('problem_type')}, hinted={hinted_problem_type})"
            )

        time_limit = problem.get("time_limit", 1000)
        memory_limit = problem.get("memory_limit", 256)
        logger.info(
            "ML problem %d: '%s' (time_limit=%dms, memory_limit=%dMB)",
            problem_id,
            problem.get("title", "?"),
            time_limit,
            memory_limit,
        )

        test_cases = await _judge_service.fetch_test_cases(problem_id)
        logger.info(
            "Fetched %d ML test case checks for problem %d",
            len(test_cases),
            problem_id,
        )

        result = await _judge_service.execute_code(
            code=code,
            language=language,
            test_cases=test_cases,
            problem=problem,
            time_limit=time_limit,
            memory_limit=memory_limit,
        )

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

        await _judge_service.publish_results(
            {
                "submission_id": submission_id,
                "problem_id": problem_id,
                "user_id": user_id,
                "contest_id": contest_id,
                "judge_type": "ml",
                "verdict": result["verdict"],
                "test_passed": result["test_passed"],
                "test_total": result["test_total"],
                "execution_time": result["execution_time"],
                "execution_memory": result["execution_memory"],
            }
        )

        elapsed = (time.monotonic() - start) * 1000
        marker = "PASS" if result["verdict"] == "AC" else "FAIL"
        logger.info(
            "[%s] ML submission %d complete: %s (%d/%d) | total=%.0fms",
            marker,
            submission_id,
            result["verdict"],
            result["test_passed"],
            result["test_total"],
            elapsed,
        )

    except Exception as exc:
        elapsed = (time.monotonic() - start) * 1000
        logger.error(
            "Error processing ML submission %s: %s | elapsed=%.0fms",
            submission_id,
            exc,
            elapsed,
            exc_info=True,
        )
        if submission_id is not None:
            try:
                await _submission_repo.set_error(submission_id, str(exc))
            except Exception:
                logger.error("Failed to mark submission %d as FAILED", submission_id)
        raise
