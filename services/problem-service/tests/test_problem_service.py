"""Unit tests for Problem Service business logic.

Tests the ProblemService class independently using mocked repository.
"""

import pytest

from app.schemas.problem import ProblemCreate
from app.utils.validators import (
    validate_title,
    validate_description,
    validate_problem_type,
    validate_difficulty,
    validate_time_limit,
    validate_memory_limit,
)


class TestValidators:
    """Unit tests for validation functions."""

    def test_validate_title_valid(self) -> None:
        """Valid title should pass."""
        assert validate_title("Two Sum") == "Two Sum"

    def test_validate_title_too_short(self) -> None:
        """Title shorter than 3 chars should raise ValueError."""
        with pytest.raises(ValueError, match="at least 3"):
            validate_title("AB")

    def test_validate_title_strips_whitespace(self) -> None:
        """Title should be stripped of leading/trailing whitespace."""
        assert validate_title("  Two Sum  ") == "Two Sum"

    def test_validate_description_valid(self) -> None:
        """Valid description (≥20 chars) should pass."""
        desc = "This is a valid description with enough characters."
        assert validate_description(desc) == desc

    def test_validate_description_too_short(self) -> None:
        """Description shorter than 20 chars should raise ValueError."""
        with pytest.raises(ValueError, match="at least 20"):
            validate_description("Too short")

    def test_validate_problem_type_valid(self) -> None:
        """Valid types should pass."""
        assert validate_problem_type("dsa") == "dsa"
        assert validate_problem_type("ml") == "ml"
        assert validate_problem_type("cyber") == "cyber"

    def test_validate_problem_type_invalid(self) -> None:
        """Invalid type should raise ValueError."""
        with pytest.raises(ValueError, match="must be one of"):
            validate_problem_type("invalid")

    def test_validate_difficulty_valid(self) -> None:
        """Valid difficulties should pass."""
        assert validate_difficulty("easy") == "easy"
        assert validate_difficulty("medium") == "medium"
        assert validate_difficulty("hard") == "hard"

    def test_validate_difficulty_invalid(self) -> None:
        """Invalid difficulty should raise ValueError."""
        with pytest.raises(ValueError, match="must be one of"):
            validate_difficulty("expert")

    def test_validate_time_limit_valid(self) -> None:
        """Time limit within range should pass."""
        assert validate_time_limit(1000) == 1000
        assert validate_time_limit(1) == 1
        assert validate_time_limit(60000) == 60000

    def test_validate_time_limit_out_of_range(self) -> None:
        """Time limit out of range should raise ValueError."""
        with pytest.raises(ValueError):
            validate_time_limit(0)
        with pytest.raises(ValueError):
            validate_time_limit(60001)

    def test_validate_memory_limit_valid(self) -> None:
        """Memory limit within range should pass."""
        assert validate_memory_limit(256) == 256
        assert validate_memory_limit(1) == 1
        assert validate_memory_limit(4096) == 4096

    def test_validate_memory_limit_out_of_range(self) -> None:
        """Memory limit out of range should raise ValueError."""
        with pytest.raises(ValueError):
            validate_memory_limit(0)
        with pytest.raises(ValueError):
            validate_memory_limit(4097)


class TestProblemCreateSchema:
    """Unit tests for ProblemCreate Pydantic schema validation."""

    def test_valid_problem(self) -> None:
        """Valid data should create schema successfully."""
        data = ProblemCreate(
            title="Two Sum",
            description="Given an array of integers nums and an integer target, return indices.",
            problem_type="dsa",
            time_limit=1000,
            memory_limit=256,
        )
        assert data.title == "Two Sum"
        assert data.difficulty == "medium"  # default

    def test_invalid_problem_type_raises(self) -> None:
        """Invalid problem_type should raise ValidationError."""
        with pytest.raises(Exception):
            ProblemCreate(
                title="Test Problem Title",
                description="This is a valid description that is long enough.",
                problem_type="invalid",
                time_limit=1000,
                memory_limit=256,
            )

    def test_default_difficulty(self) -> None:
        """Difficulty should default to 'medium'."""
        data = ProblemCreate(
            title="Default Diff",
            description="This description is definitely long enough for validation.",
            problem_type="dsa",
            time_limit=1000,
            memory_limit=256,
        )
        assert data.difficulty == "medium"

    def test_topics_optional(self) -> None:
        """Topics should be optional and default to None."""
        data = ProblemCreate(
            title="No Topics Here",
            description="This description is definitely long enough for validation.",
            problem_type="ml",
            time_limit=5000,
            memory_limit=512,
        )
        assert data.topics is None
