"""Submission repository for judge-standard DB operations.

Provides methods to update submission status, verdict, and
execution results directly in the database.
"""

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import async_session_factory
from app.logger import get_logger
from app.models.submission import Submission

logger = get_logger(__name__)


class SubmissionRepository:
    """Async repository for updating submissions from the judge worker."""

    async def get_by_id(self, submission_id: int) -> Submission | None:
        """Fetch a submission by ID."""
        async with async_session_factory() as session:
            statement = select(Submission).where(Submission.id == submission_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def update_status(
        self, submission_id: int, status: str
    ) -> None:
        """Update submission status field."""
        async with async_session_factory() as session:
            statement = select(Submission).where(Submission.id == submission_id)
            result = await session.execute(statement)
            submission = result.scalar_one_or_none()

            if not submission:
                logger.warning("Submission %d not found for status update", submission_id)
                return

            submission.status = status
            submission.updated_at = datetime.utcnow()
            session.add(submission)
            await session.commit()

        logger.debug("Submission %d status → %s", submission_id, status)

    async def update_with_results(
        self,
        submission_id: int,
        *,
        status: str,
        verdict: str,
        test_passed: int,
        test_total: int,
        execution_time: int,
        execution_memory: int,
        error_message: str | None = None,
    ) -> None:
        """Update submission with full execution results."""
        async with async_session_factory() as session:
            statement = select(Submission).where(Submission.id == submission_id)
            result = await session.execute(statement)
            submission = result.scalar_one_or_none()

            if not submission:
                logger.warning("Submission %d not found for results update", submission_id)
                return

            submission.status = status
            submission.verdict = verdict
            submission.test_passed = test_passed
            submission.test_total = test_total
            submission.execution_time = execution_time
            submission.execution_memory = execution_memory
            submission.error_message = error_message
            submission.judged_at = datetime.utcnow()
            submission.updated_at = datetime.utcnow()

            session.add(submission)
            await session.commit()

        logger.info(
            "Submission %d results saved: verdict=%s (%d/%d)",
            submission_id,
            verdict,
            test_passed,
            test_total,
        )

    async def set_error(
        self, submission_id: int, error_message: str
    ) -> None:
        """Mark submission as FAILED with error message."""
        async with async_session_factory() as session:
            statement = select(Submission).where(Submission.id == submission_id)
            result = await session.execute(statement)
            submission = result.scalar_one_or_none()

            if not submission:
                return

            submission.status = "FAILED"
            submission.error_message = error_message
            submission.updated_at = datetime.utcnow()
            submission.judged_at = datetime.utcnow()

            session.add(submission)
            await session.commit()

        logger.warning("Submission %d marked FAILED: %s", submission_id, error_message)
