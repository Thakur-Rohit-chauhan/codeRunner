"""Custom exception classes for Problem Service.

Each exception maps to a specific HTTP status code and is handled
by exception handlers registered in main.py.
"""


class ProblemServiceError(Exception):
    """Base exception for all Problem Service errors."""

    def __init__(self, message: str = "An unexpected error occurred") -> None:
        self.message = message
        super().__init__(self.message)


class ProblemNotFoundError(ProblemServiceError):
    """Raised when a problem with the given ID does not exist (HTTP 404)."""

    def __init__(self, problem_id: int) -> None:
        self.problem_id = problem_id
        super().__init__(f"Problem with id {problem_id} not found")


class DuplicateTitleError(ProblemServiceError):
    """Raised when attempting to create a problem with an existing title (HTTP 409)."""

    def __init__(self, title: str) -> None:
        self.title = title
        super().__init__(f"Problem with title '{title}' already exists")


class ValidationError(ProblemServiceError):
    """Raised when request data fails validation (HTTP 400)."""

    def __init__(self, message: str, errors: list[dict] | None = None) -> None:
        self.errors = errors or []
        super().__init__(message)


class DatabaseError(ProblemServiceError):
    """Raised when a database operation fails (HTTP 500)."""

    def __init__(self, message: str = "Database operation failed") -> None:
        super().__init__(message)
