"""Submission repository for judge-standard DB operations.

Provides methods to update submission status, verdict, and
execution results directly in the database.
"""

import asyncio
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import async_session_factory
from app.logger import get_logger
from app.models.submission import Submission

logger = get_logger(__name__)

LOOKUP_RETRIES = 20
LOOKUP_DELAY_SECONDS = 0.25


class SubmissionRepository:
    """Async repository for updating submissions from the judge worker."""

    async def _load_submission_with_retry(
        self,
        session: AsyncSession,
        submission_id: int,
    ) -> Submission:
        """Wait briefly for the producer transaction to make the row visible."""
        for attempt in range(1, LOOKUP_RETRIES + 1):
            statement = select(Submission).where(Submission.id == submission_id)
            result = await session.execute(statement)
            submission = result.scalar_one_or_none()
            if submission:
                return submission

            if attempt < LOOKUP_RETRIES:
                logger.warning(
                    "Submission %d not visible yet (attempt %d/%d), retrying...",
                    submission_id,
                    attempt,
                    LOOKUP_RETRIES,
                )
                await asyncio.sleep(LOOKUP_DELAY_SECONDS)

        raise LookupError(f"Submission {submission_id} not found after retry window")

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
            submission = await self._load_submission_with_retry(session, submission_id)

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
            submission = await self._load_submission_with_retry(session, submission_id)

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
            try:
                submission = await self._load_submission_with_retry(session, submission_id)
            except LookupError:
                logger.error(
                    "Unable to persist failure for submission %d because the row never became visible",
                    submission_id,
                )
                return

            submission.status = "FAILED"
            submission.error_message = error_message
            submission.updated_at = datetime.utcnow()
            submission.judged_at = datetime.utcnow()

            session.add(submission)
            await session.commit()

        logger.warning("Submission %d marked FAILED: %s", submission_id, error_message)
