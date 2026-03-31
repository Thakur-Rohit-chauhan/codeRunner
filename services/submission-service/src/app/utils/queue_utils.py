"""Message formatting utilities for RabbitMQ publishing."""

import json
from datetime import datetime
from typing import Any


def format_judge_message(
    submission_id: int,
    problem_id: int,
    code: str,
    language: str,
    problem_type: str | None = None,
    user_id: str | None = None,
    contest_id: int | None = None,
    retry_count: int = 0,
) -> bytes:
    """Format a submission into a RabbitMQ message body.

    Args:
        submission_id: The submission's database ID.
        problem_id: The associated problem ID.
        code: The submitted source code.
        language: Programming language of the code.
        user_id: Optional user identifier.
        contest_id: Optional contest identifier.
        retry_count: Number of retry attempts so far.

    Returns:
        UTF-8 encoded JSON bytes ready for publishing.
    """
    message: dict[str, Any] = {
        "submission_id": submission_id,
        "problem_id": problem_id,
        "user_id": user_id,
        "contest_id": contest_id,
        "code": code,
        "language": language,
        "problem_type": problem_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "retry_count": retry_count,
    }
    return json.dumps(message).encode("utf-8")
