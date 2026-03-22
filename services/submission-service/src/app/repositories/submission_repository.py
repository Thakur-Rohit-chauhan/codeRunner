"""Submission repository for async database operations."""

from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.logger import get_logger
from app.models.submission import Submission

logger = get_logger(__name__)


class SubmissionRepository:
    """Async repository for Submission CRUD operations."""

    async def create(self, session: AsyncSession, submission: Submission) -> Submission:
        """Insert a new submission."""
        session.add(submission)
        await session.flush()
        await session.refresh(submission)
        logger.info("Created submission id=%s problem_id=%s", submission.id, submission.problem_id)
        return submission

    async def get_by_id(self, session: AsyncSession, submission_id: int) -> Submission | None:
        """Fetch a single submission by ID, excluding soft-deleted."""
        statement = select(Submission).where(
            Submission.id == submission_id,
            Submission.is_deleted == False,  # noqa: E712
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()

    async def list_submissions(
        self,
        session: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 10,
        problem_id: int | None = None,
        status: str | None = None,
        verdict: str | None = None,
        user_id: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Submission], int]:
        """List submissions with filtering, pagination, and sorting."""
        base_query = select(Submission).where(Submission.is_deleted == False)  # noqa: E712

        if problem_id is not None:
            base_query = base_query.where(Submission.problem_id == problem_id)
        if status:
            base_query = base_query.where(Submission.status == status)
        if verdict:
            base_query = base_query.where(Submission.verdict == verdict)
        if user_id:
            base_query = base_query.where(Submission.user_id == user_id)

        # Count
        count_result = await session.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()

        # Sort
        sort_column = getattr(Submission, sort_by, Submission.created_at)
        if sort_order == "asc":
            base_query = base_query.order_by(sort_column.asc())  # type: ignore[union-attr]
        else:
            base_query = base_query.order_by(sort_column.desc())  # type: ignore[union-attr]

        # Paginate
        base_query = base_query.offset(skip).limit(limit)
        result = await session.execute(base_query)
        submissions = list(result.scalars().all())

        return submissions, total

    async def update_status(
        self,
        session: AsyncSession,
        submission: Submission,
        status: str,
        queue_id: str | None = None,
    ) -> Submission:
        """Update submission status and optionally queue_id."""
        submission.status = status
        submission.updated_at = datetime.utcnow()
        if queue_id is not None:
            submission.queue_id = queue_id
        session.add(submission)
        await session.flush()
        await session.refresh(submission)
        return submission

    async def increment_retry(
        self, session: AsyncSession, submission: Submission
    ) -> Submission:
        """Reset status to PENDING and increment retry counter."""
        submission.status = "PENDING"
        submission.retries += 1
        submission.updated_at = datetime.utcnow()
        submission.verdict = None
        submission.error_message = None
        session.add(submission)
        await session.flush()
        await session.refresh(submission)
        return submission
