"""Core submission processing pipeline for judge-cyber."""

import json
import time
from typing import Any

from app.logger import get_logger
from app.packet_engine import generate_packets
from app.sandbox import execute_code_in_sandbox
from app.validator import validate_packets
from app.publisher import publish_result

logger = get_logger(__name__)


async def process_submission(message_body: bytes) -> None:
    start_time = time.monotonic()

    try:
        body = json.loads(message_body)
        if body.get("type") != "cyber":
            logger.info(
                "Skipping non-cyber submission: %s (type=%s)",
                body.get("submission_id"),
                body.get("type"),
            )
            return

        submission_id = body["submission_id"]
        problem_id = body["problem_id"]
        code = body["code"]

        logger.info("process_submission: submission=%s, problem=%s", submission_id, problem_id)

        sandbox_info = "not implemented"
        packets = generate_packets(problem_id)

        result_packets, execution_logs = execute_code_in_sandbox(code, packets)

        verdict = validate_packets(problem_id, packets, result_packets, execution_logs)

        await publish_result(
            {
                "submission_id": submission_id,
                "problem_id": problem_id,
                "status": verdict["status"],
                "score": verdict["score"],
                "logs": verdict.get("logs", execution_logs),
            }
        )

        elapsed = (time.monotonic() - start_time) * 1000
        logger.info(
            "Submission %s judged: status=%s score=%s elapsed=%.0fms",
            submission_id,
            verdict["status"],
            verdict["score"],
            elapsed,
        )

    except json.JSONDecodeError as exc:
        logger.error("Invalid JSON payload: %s", exc)
        raise
    except KeyError as exc:
        logger.error("Missing required field: %s", exc)
        raise
    except Exception as exc:
        elapsed = (time.monotonic() - start_time) * 1000
        logger.error(
            "Unexpected error processing submission: %s | elapsed=%.0fms",
            exc,
            elapsed,
            exc_info=True,
        )
        submission_id = locals().get("body", {}).get("submission_id") if "body" in locals() else None
        problem_id = locals().get("body", {}).get("problem_id") if "body" in locals() else None
        await publish_result(
            {
                "submission_id": submission_id,
                "problem_id": problem_id,
                "status": "runtime_error",
                "score": 0,
                "logs": str(exc),
            }
        )
