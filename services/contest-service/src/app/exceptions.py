"""Custom exception classes for Contest Service."""


class ContestServiceError(Exception):
    """Base exception for all Contest Service errors."""

    def __init__(self, message: str = "An unexpected error occurred") -> None:
        self.message = message
        super().__init__(self.message)


class ContestNotFoundError(ContestServiceError):
    """Raised when a contest with the given ID does not exist (HTTP 404)."""

    def __init__(self, contest_id: int) -> None:
        self.contest_id = contest_id
        super().__init__(f"Contest with id {contest_id} not found")


class UserNotFoundError(ContestServiceError):
    """Raised when a user with the given ID does not exist (HTTP 404)."""

    def __init__(self, user_id: str) -> None:
        self.user_id = user_id
        super().__init__(f"User '{user_id}' not found")


class ContestFullError(ContestServiceError):
    """Raised when a contest has reached max participants (HTTP 409)."""

    def __init__(self, contest_id: int) -> None:
        self.contest_id = contest_id
        super().__init__(f"Contest {contest_id} has reached maximum participants")


class AlreadyJoinedError(ContestServiceError):
    """Raised when a user has already joined a contest (HTTP 409)."""

    def __init__(self, user_id: str, contest_id: int) -> None:
        super().__init__(f"User '{user_id}' has already joined contest {contest_id}")


class ContestInactiveError(ContestServiceError):
    """Raised when trying to join an inactive contest (HTTP 400)."""

    def __init__(self, contest_id: int) -> None:
        super().__init__(f"Contest {contest_id} is not active")


class ValidationError(ContestServiceError):
    """Raised when request data fails validation (HTTP 400)."""

    def __init__(self, message: str, errors: list[dict] | None = None) -> None:
        self.errors = errors or []
        super().__init__(message)


class DatabaseError(ContestServiceError):
    """Raised when a database operation fails (HTTP 500)."""

    def __init__(self, message: str = "Database operation failed") -> None:
        super().__init__(message)


class RedisError(ContestServiceError):
    """Raised when a Redis operation fails (non-fatal, logged)."""

    def __init__(self, message: str = "Redis operation failed") -> None:
        super().__init__(message)
