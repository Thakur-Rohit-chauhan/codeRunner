"""Unit tests for queue utilities and validators."""

import json
import pytest

from app.utils.queue_utils import format_judge_message
from app.utils.validators import validate_code, validate_language, validate_problem_id


class TestQueueUtils:
    def test_format_judge_message(self) -> None:
        body = format_judge_message(
            submission_id=42,
            problem_id=1,
            code="print('hello')",
            language="python",
        )
        data = json.loads(body)
        assert data["submission_id"] == 42
        assert data["problem_id"] == 1
        assert data["language"] == "python"
        assert data["retry_count"] == 0
        assert "timestamp" in data

    def test_format_judge_message_with_retry(self) -> None:
        body = format_judge_message(
            submission_id=1,
            problem_id=1,
            code="x = 1",
            language="python",
            retry_count=2,
        )
        data = json.loads(body)
        assert data["retry_count"] == 2


class TestValidators:
    def test_validate_code_valid(self) -> None:
        code = "def solve(nums, target): return [0, 1]"
        assert validate_code(code) == code

    def test_validate_code_too_short(self) -> None:
        with pytest.raises(ValueError, match="at least"):
            validate_code("x = 1")

    def test_validate_language_valid(self) -> None:
        assert validate_language("python") == "python"
        assert validate_language("cpp") == "cpp"
        assert validate_language("notebook") == "notebook"

    def test_validate_language_invalid(self) -> None:
        with pytest.raises(ValueError, match="must be one of"):
            validate_language("cobol")

    def test_validate_problem_id_valid(self) -> None:
        assert validate_problem_id(1) == 1

    def test_validate_problem_id_negative(self) -> None:
        with pytest.raises(ValueError, match="positive"):
            validate_problem_id(-1)
