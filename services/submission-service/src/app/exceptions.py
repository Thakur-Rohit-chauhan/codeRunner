"""Custom exception classes for Submission Service."""


class SubmissionServiceError(Exception):
    """Base exception for all Submission Service errors."""

    def __init__(self, message: str = "An unexpected error occurred") -> None:
        self.message = message
        super().__init__(self.message)


class SubmissionNotFoundError(SubmissionServiceError):
    """Raised when a submission with the given ID does not exist (HTTP 404)."""

    def __init__(self, submission_id: int) -> None:
        self.submission_id = submission_id
        super().__init__(f"Submission with id {submission_id} not found")


class ValidationError(SubmissionServiceError):
    """Raised when request data fails validation (HTTP 400)."""

    def __init__(self, message: str, errors: list[dict] | None = None) -> None:
        self.errors = errors or []
        super().__init__(message)


class RetryLimitExceededError(SubmissionServiceError):
    """Raised when a submission has exceeded the maximum retry count (HTTP 400)."""

    def __init__(self, submission_id: int, max_retries: int) -> None:
        self.submission_id = submission_id
        super().__init__(
            f"Submission {submission_id} has exceeded maximum retries ({max_retries})"
        )


class InvalidStatusError(SubmissionServiceError):
    """Raised when attempting an operation on a submission with wrong status (HTTP 400)."""

    def __init__(self, submission_id: int, current_status: str, required_status: str) -> None:
        self.submission_id = submission_id
        super().__init__(
            f"Submission {submission_id} status is '{current_status}', "
            f"must be '{required_status}' for this operation"
        )


class DatabaseError(SubmissionServiceError):
    """Raised when a database operation fails (HTTP 500)."""

    def __init__(self, message: str = "Database operation failed") -> None:
        super().__init__(message)


class QueueError(SubmissionServiceError):
    """Raised when a RabbitMQ operation fails (non-fatal, logged)."""

    def __init__(self, message: str = "Queue operation failed") -> None:
        super().__init__(message)
