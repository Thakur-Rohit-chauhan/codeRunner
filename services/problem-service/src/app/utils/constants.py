"""Constants and enums for Problem Service.

Defines allowed values for problem types, difficulty levels,
and validation constraints used across the application.
"""

from enum import StrEnum


class ProblemType(StrEnum):
    """Supported problem/challenge types."""

    DSA = "dsa"
    ML = "ml"
    CYBER = "cyber"


class Difficulty(StrEnum):
    """Problem difficulty levels."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# Validation limits
TITLE_MIN_LENGTH: int = 3
TITLE_MAX_LENGTH: int = 255
DESCRIPTION_MIN_LENGTH: int = 20

TIME_LIMIT_MIN: int = 1
TIME_LIMIT_MAX: int = 60000  # 60 seconds in milliseconds

MEMORY_LIMIT_MIN: int = 1
MEMORY_LIMIT_MAX: int = 4096  # 4 GB

# Pagination
DEFAULT_SKIP: int = 0
DEFAULT_LIMIT: int = 10
MAX_LIMIT: int = 100

# Sorting
ALLOWED_SORT_FIELDS: list[str] = ["created_at", "title", "difficulty"]
DEFAULT_SORT_FIELD: str = "created_at"
DEFAULT_SORT_ORDER: str = "desc"
