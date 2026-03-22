"""Reusable validation functions for Submission Service."""

from app.utils.constants import Language, CODE_MIN_LENGTH, CODE_MAX_LENGTH


def validate_code(code: str) -> str:
    """Validate submitted code length.

    Args:
        code: The source code string.

    Returns:
        The code string (unchanged).

    Raises:
        ValueError: If code is too short or too long.
    """
    if len(code) < CODE_MIN_LENGTH:
        raise ValueError(f"Code must be at least {CODE_MIN_LENGTH} characters long")
    if len(code) > CODE_MAX_LENGTH:
        raise ValueError(f"Code must be at most {CODE_MAX_LENGTH} characters long")
    return code


def validate_language(language: str) -> str:
    """Validate language against allowed values.

    Args:
        language: The programming language string.

    Returns:
        Validated language string.

    Raises:
        ValueError: If language is not supported.
    """
    allowed = [lang.value for lang in Language]
    if language not in allowed:
        raise ValueError(f"language must be one of: {', '.join(allowed)}")
    return language


def validate_problem_id(problem_id: int) -> int:
    """Validate problem_id is a positive integer.

    Args:
        problem_id: The problem ID.

    Returns:
        Validated problem_id.

    Raises:
        ValueError: If problem_id is not positive.
    """
    if problem_id < 1:
        raise ValueError("problem_id must be a positive integer")
    return problem_id
