"""Submission business logic service.

Orchestrates validation, persistence, queue publishing,
and retry logic for code submissions.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import (
    SubmissionNotFoundError,
    RetryLimitExceededError,
    InvalidStatusError,
    DatabaseError,
)
from app.logger import get_logger
from app.models.submission import Submission
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionDetail,
    SubmissionListItem,
    RetryResponse,
)
from app.schemas.responses import PaginatedResponse
from app.services.queue_service import QueueService
from app.utils.constants import (
    DEFAULT_SKIP,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    ALLOWED_SORT_FIELDS,
    DEFAULT_SORT_FIELD,
    DEFAULT_SORT_ORDER,
)

logger = get_logger(__name__)


class SubmissionService:
    """Business logic for Submission operations."""

    def __init__(self) -> None:
        self.repository = SubmissionRepository()
        self.queue_service = QueueService()

    async def create_submission(
        self, session: AsyncSession, data: SubmissionCreate
    ) -> SubmissionResponse:
        """Create a new submission, save to DB, and publish to queue.

        The submission is saved to the database first (status=PENDING).
        Queue publishing is best-effort — if RabbitMQ is unavailable,
        the submission remains in PENDING for later retry.

        Args:
            session: Active database session.
            data: Validated submission data.

        Returns:
            SubmissionResponse with the created submission's details.
        """
        try:
            submission = Submission(
                problem_id=data.problem_id,
                code=data.code,
                language=data.language,
                status="PENDING",
            )

            created = await self.repository.create(session, submission)

            # Best-effort publish to RabbitMQ (non-blocking for response)
            await self.queue_service.publish_submission(session, created)

            logger.info(
                "POST /api/submissions | status=202 | submission_id=%s",
                created.id,
            )
            return SubmissionResponse.model_validate(created)

        except Exception as exc:
            logger.error("Failed to create submission: %s", exc, exc_info=True)
            raise DatabaseError(f"Failed to create submission: {exc}") from exc

    async def get_submission(
        self, session: AsyncSession, submission_id: int
    ) -> SubmissionDetail:
        """Retrieve a single submission by ID.

        Args:
            session: Active database session.
            submission_id: The submission's primary key.

        Returns:
            SubmissionDetail with full submission data.

        Raises:
            SubmissionNotFoundError: If not found.
        """
        try:
            submission = await self.repository.get_by_id(session, submission_id)
            if not submission:
                raise SubmissionNotFoundError(submission_id)
            return SubmissionDetail.model_validate(submission)
        except SubmissionNotFoundError:
            raise
        except Exception as exc:
            logger.error("Failed to fetch submission id=%s: %s", submission_id, exc, exc_info=True)
            raise DatabaseError(f"Failed to fetch submission: {exc}") from exc

    async def list_submissions(
        self,
        session: AsyncSession,
        *,
        skip: int = DEFAULT_SKIP,
        limit: int = DEFAULT_LIMIT,
        problem_id: int | None = None,
        status: str | None = None,
        verdict: str | None = None,
        user_id: str | None = None,
        sort_by: str = DEFAULT_SORT_FIELD,
        sort_order: str = DEFAULT_SORT_ORDER,
    ) -> PaginatedResponse[SubmissionListItem]:
        """List submissions with filtering, pagination, and sorting."""
        try:
            if limit > MAX_LIMIT:
                limit = MAX_LIMIT
            if limit < 1:
                limit = DEFAULT_LIMIT
            if skip < 0:
                skip = DEFAULT_SKIP
            if sort_by not in ALLOWED_SORT_FIELDS:
                sort_by = DEFAULT_SORT_FIELD
            if sort_order not in ("asc", "desc"):
                sort_order = DEFAULT_SORT_ORDER

            submissions, total = await self.repository.list_submissions(
                session,
                skip=skip,
                limit=limit,
                problem_id=problem_id,
                status=status,
                verdict=verdict,
                user_id=user_id,
                sort_by=sort_by,
                sort_order=sort_order,
            )

            items = [SubmissionListItem.model_validate(s) for s in submissions]
            return PaginatedResponse[SubmissionListItem](
                data=items, total=total, skip=skip, limit=limit
            )

        except Exception as exc:
            logger.error("Failed to list submissions: %s", exc, exc_info=True)
            raise DatabaseError(f"Failed to list submissions: {exc}") from exc

    async def retry_submission(
        self, session: AsyncSession, submission_id: int
    ) -> RetryResponse:
        """Retry a failed submission.

        Resets status to PENDING, increments retry counter,
        and re-publishes to the queue.

        Args:
            session: Active database session.
            submission_id: The submission to retry.

        Returns:
            RetryResponse with updated status and retry count.

        Raises:
            SubmissionNotFoundError: If not found.
            InvalidStatusError: If status is not FAILED.
            RetryLimitExceededError: If retries exceed max.
        """
        try:
            submission = await self.repository.get_by_id(session, submission_id)
            if not submission:
                raise SubmissionNotFoundError(submission_id)

            if submission.status != "FAILED":
                raise InvalidStatusError(submission_id, submission.status, "FAILED")

            if submission.retries >= settings.SUBMISSION_RETRY_MAX:
                raise RetryLimitExceededError(submission_id, settings.SUBMISSION_RETRY_MAX)

            # Reset and increment
            updated = await self.repository.increment_retry(session, submission)

            # Re-publish to queue
            await self.queue_service.publish_submission(session, updated)

            logger.info(
                "POST /api/submissions/%s/retry | retries=%s",
                submission_id,
                updated.retries,
            )
            return RetryResponse(
                id=updated.id,  # type: ignore[arg-type]
                status=updated.status,
                retries=updated.retries,
                message="Submission queued for retry",
            )

        except (SubmissionNotFoundError, InvalidStatusError, RetryLimitExceededError):
            raise
        except Exception as exc:
            logger.error("Failed to retry submission id=%s: %s", submission_id, exc, exc_info=True)
            raise DatabaseError(f"Failed to retry submission: {exc}") from exc
