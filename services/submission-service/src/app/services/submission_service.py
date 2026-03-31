"""Submission business logic service."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import (
    DatabaseError,
    InvalidStatusError,
    RetryLimitExceededError,
    SubmissionNotFoundError,
    ValidationError,
)
from app.logger import get_logger
from app.models.submission import Submission
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.responses import PaginatedResponse
from app.schemas.submission import (
    RetryResponse,
    SubmissionCreate,
    SubmissionDetail,
    SubmissionListItem,
    SubmissionResponse,
)
from app.services.problem_service_client import ProblemServiceClient
from app.services.queue_service import QueueService
from app.utils.constants import (
    ALLOWED_SORT_FIELDS,
    DEFAULT_LIMIT,
    DEFAULT_SKIP,
    DEFAULT_SORT_FIELD,
    DEFAULT_SORT_ORDER,
    MAX_LIMIT,
)

logger = get_logger(__name__)


class SubmissionService:
    """Business logic for Submission operations."""

    def __init__(self) -> None:
        self.repository = SubmissionRepository()
        self.queue_service = QueueService()
        self.problem_client = ProblemServiceClient()

    async def _resolve_queue_target(
        self,
        *,
        problem_id: int,
        language: str,
    ) -> tuple[str, str | None]:
        """Resolve the target RabbitMQ queue for a submission."""
        problem = await self.problem_client.get_problem(problem_id)
        problem_type = (
            str(problem.get("problem_type")).lower()
            if problem and problem.get("problem_type")
            else None
        )

        if problem_type == "ml":
            if language not in ("python", "notebook"):
                raise ValidationError(
                    "ML problems only support 'python' or 'notebook' submissions"
                )
            return settings.ML_JUDGE_QUEUE, problem_type

        if problem_type is not None and language == "notebook":
            raise ValidationError(
                "Notebook submissions are only supported for ML problems"
            )

        if problem_type is None and language == "notebook":
            logger.warning(
                "Problem type lookup unavailable for problem_id=%s; "
                "routing notebook submission to ml_judge_queue",
                problem_id,
            )
            return settings.ML_JUDGE_QUEUE, "ml"

        return settings.STANDARD_JUDGE_QUEUE, problem_type

    async def create_submission(
        self, session: AsyncSession, data: SubmissionCreate
    ) -> SubmissionResponse:
        """Create a new submission, save to DB, and publish to the right queue."""
        try:
            target_queue, problem_type = await self._resolve_queue_target(
                problem_id=data.problem_id,
                language=data.language,
            )

            submission = Submission(
                problem_id=data.problem_id,
                user_id=data.user_id,
                contest_id=data.contest_id,
                code=data.code,
                language=data.language,
                status="PENDING",
            )

            created = await self.repository.create(session, submission)
            await session.commit()
            await session.refresh(created)

            published, queue_id = await self.queue_service.publish_submission(
                created,
                target_queue=target_queue,
                problem_type=problem_type,
            )
            refreshed = await self.repository.mark_queue_dispatch(
                session,
                created.id,  # type: ignore[arg-type]
                queue_id=queue_id,
                published=published,
            )
            await session.commit()
            if refreshed is not None:
                created = refreshed

            logger.info(
                "POST /api/submissions | status=202 | submission_id=%s | queue=%s",
                created.id,
                target_queue,
            )
            return SubmissionResponse.model_validate(created)

        except ValidationError:
            raise
        except Exception as exc:
            logger.error("Failed to create submission: %s", exc, exc_info=True)
            raise DatabaseError(f"Failed to create submission: {exc}") from exc

    async def get_submission(
        self, session: AsyncSession, submission_id: int
    ) -> SubmissionDetail:
        """Retrieve a single submission by ID."""
        try:
            submission = await self.repository.get_by_id(session, submission_id)
            if not submission:
                raise SubmissionNotFoundError(submission_id)
            return SubmissionDetail.model_validate(submission)
        except SubmissionNotFoundError:
            raise
        except Exception as exc:
            logger.error(
                "Failed to fetch submission id=%s: %s",
                submission_id,
                exc,
                exc_info=True,
            )
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
                data=items,
                total=total,
                skip=skip,
                limit=limit,
            )

        except Exception as exc:
            logger.error("Failed to list submissions: %s", exc, exc_info=True)
            raise DatabaseError(f"Failed to list submissions: {exc}") from exc

    async def retry_submission(
        self, session: AsyncSession, submission_id: int
    ) -> RetryResponse:
        """Retry a failed submission."""
        try:
            submission = await self.repository.get_by_id(session, submission_id)
            if not submission:
                raise SubmissionNotFoundError(submission_id)

            if submission.status != "FAILED":
                raise InvalidStatusError(submission_id, submission.status, "FAILED")

            if submission.retries >= settings.SUBMISSION_RETRY_MAX:
                raise RetryLimitExceededError(
                    submission_id,
                    settings.SUBMISSION_RETRY_MAX,
                )

            updated = await self.repository.increment_retry(session, submission)
            await session.commit()
            await session.refresh(updated)
            target_queue, problem_type = await self._resolve_queue_target(
                problem_id=updated.problem_id,
                language=updated.language,
            )

            published, queue_id = await self.queue_service.publish_submission(
                updated,
                target_queue=target_queue,
                problem_type=problem_type,
            )
            refreshed = await self.repository.mark_queue_dispatch(
                session,
                updated.id,  # type: ignore[arg-type]
                queue_id=queue_id,
                published=published,
            )
            await session.commit()
            if refreshed is not None:
                updated = refreshed

            logger.info(
                "POST /api/submissions/%s/retry | retries=%s | queue=%s",
                submission_id,
                updated.retries,
                target_queue,
            )
            return RetryResponse(
                id=updated.id,  # type: ignore[arg-type]
                status=updated.status,
                retries=updated.retries,
                message="Submission queued for retry",
            )

        except (
            SubmissionNotFoundError,
            InvalidStatusError,
            RetryLimitExceededError,
            ValidationError,
        ):
            raise
        except Exception as exc:
            logger.error(
                "Failed to retry submission id=%s: %s",
                submission_id,
                exc,
                exc_info=True,
            )
            raise DatabaseError(f"Failed to retry submission: {exc}") from exc
