"""Tests for dispatch-state persistence around queue publishing."""

import pytest

from app.models.submission import Submission
from app.repositories.submission_repository import SubmissionRepository


@pytest.mark.asyncio
async def test_mark_queue_dispatch_moves_pending_submission_to_queued(db_session) -> None:
    """Published submissions should transition from PENDING to QUEUED."""
    repository = SubmissionRepository()
    submission = Submission(problem_id=1, code="print('hello world')", language="python")

    created = await repository.create(db_session, submission)
    await db_session.commit()

    refreshed = await repository.mark_queue_dispatch(
        db_session,
        created.id,  # type: ignore[arg-type]
        queue_id="123",
        published=True,
    )
    await db_session.commit()

    assert refreshed is not None
    assert refreshed.status == "QUEUED"
    assert refreshed.queue_id == "123"


@pytest.mark.asyncio
async def test_mark_queue_dispatch_does_not_clobber_running_status(db_session) -> None:
    """Fast worker updates should not be overwritten back to QUEUED."""
    repository = SubmissionRepository()
    submission = Submission(problem_id=1, code="print('hello world')", language="python")

    created = await repository.create(db_session, submission)
    created.status = "RUNNING"
    await db_session.commit()

    refreshed = await repository.mark_queue_dispatch(
        db_session,
        created.id,  # type: ignore[arg-type]
        queue_id="456",
        published=True,
    )
    await db_session.commit()

    assert refreshed is not None
    assert refreshed.status == "RUNNING"
    assert refreshed.queue_id == "456"
