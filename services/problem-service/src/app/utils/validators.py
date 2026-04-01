"""Reusable validation functions for Problem Service.

These validators are used by Pydantic schemas to enforce
business rules on incoming request data.
"""

from app.utils.constants import (
    ProblemType,
    Difficulty,
    TITLE_MIN_LENGTH,
    TITLE_MAX_LENGTH,
    DESCRIPTION_MIN_LENGTH,
    TIME_LIMIT_MIN,
    TIME_LIMIT_MAX,
    MEMORY_LIMIT_MIN,
    MEMORY_LIMIT_MAX,
)


def validate_title(title: str) -> str:
    """Validate problem title length and whitespace.

    Args:
        title: The problem title to validate.

    Returns:
        Stripped title string.

    Raises:
        ValueError: If title is too short or too long.
    """
    title = title.strip()
    if len(title) < TITLE_MIN_LENGTH:
        raise ValueError(
            f"Title must be at least {TITLE_MIN_LENGTH} characters long"
        )
    if len(title) > TITLE_MAX_LENGTH:
        raise ValueError(
            f"Title must be at most {TITLE_MAX_LENGTH} characters long"
        )
    return title


def validate_description(description: str) -> str:
    """Validate problem description minimum length.

    Args:
        description: The problem description to validate.

    Returns:
        Stripped description string.

    Raises:
        ValueError: If description is too short.
    """
    description = description.strip()
    if len(description) < DESCRIPTION_MIN_LENGTH:
        raise ValueError(
            f"Description must be at least {DESCRIPTION_MIN_LENGTH} characters long"
        )
    return description


def validate_problem_type(problem_type: str) -> str:
    """Validate problem type against allowed values.

    Args:
        problem_type: The problem type string.

    Returns:
        Validated problem type.

    Raises:
        ValueError: If problem_type is not one of the allowed values.
    """
    allowed = [pt.value for pt in ProblemType]
    if problem_type not in allowed:
        raise ValueError(
            f"problem_type must be one of: {', '.join(allowed)}"
        )
    return problem_type


def validate_difficulty(difficulty: str) -> str:
    """Validate difficulty against allowed values.

    Args:
        difficulty: The difficulty string.

    Returns:
        Validated difficulty.

    Raises:
        ValueError: If difficulty is not one of the allowed values.
    """
    allowed = [d.value for d in Difficulty]
    if difficulty not in allowed:
        raise ValueError(
            f"difficulty must be one of: {', '.join(allowed)}"
        )
    return difficulty


def validate_time_limit(time_limit: int) -> int:
    """Validate time limit within acceptable range.

    Args:
        time_limit: Time limit in milliseconds.

    Returns:
        Validated time limit.

    Raises:
        ValueError: If time_limit is out of range.
    """
    if time_limit < TIME_LIMIT_MIN or time_limit > TIME_LIMIT_MAX:
        raise ValueError(
            f"time_limit must be between {TIME_LIMIT_MIN} and {TIME_LIMIT_MAX} ms"
        )
    return time_limit


def validate_memory_limit(memory_limit: int) -> int:
    """Validate memory limit within acceptable range.

    Args:
        memory_limit: Memory limit in MB.

    Returns:
        Validated memory limit.

    Raises:
        ValueError: If memory_limit is out of range.
    """
    if memory_limit < MEMORY_LIMIT_MIN or memory_limit > MEMORY_LIMIT_MAX:
        raise ValueError(
            f"memory_limit must be between {MEMORY_LIMIT_MIN} and {MEMORY_LIMIT_MAX} MB"
        )
    return memory_limit
