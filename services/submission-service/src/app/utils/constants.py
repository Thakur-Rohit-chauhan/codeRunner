"""Constants and enums for Submission Service."""

from enum import StrEnum


class SubmissionStatus(StrEnum):
    """Submission processing status lifecycle."""

    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    QUEUE_FAILED = "QUEUE_FAILED"


class Verdict(StrEnum):
    """Code evaluation verdicts from the judge service."""

    AC = "AC"    # Accepted
    WA = "WA"    # Wrong Answer
    TLE = "TLE"  # Time Limit Exceeded
    MLE = "MLE"  # Memory Limit Exceeded
    CE = "CE"    # Compilation Error
    RE = "RE"    # Runtime Error


class Language(StrEnum):
    """Supported programming languages."""

    PYTHON = "python"
    CPP = "cpp"
    JAVA = "java"
    JAVASCRIPT = "javascript"


# Validation limits
CODE_MIN_LENGTH: int = 10
CODE_MAX_LENGTH: int = 100_000

# Pagination
DEFAULT_SKIP: int = 0
DEFAULT_LIMIT: int = 10
MAX_LIMIT: int = 100

# Sorting
ALLOWED_SORT_FIELDS: list[str] = ["created_at", "updated_at", "status"]
DEFAULT_SORT_FIELD: str = "created_at"
DEFAULT_SORT_ORDER: str = "desc"
