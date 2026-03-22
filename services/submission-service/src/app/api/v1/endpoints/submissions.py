"""Submission route handlers.

REST endpoints for creating, listing, retrieving, and retrying submissions.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.logger import get_logger
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionDetail,
    SubmissionListItem,
    RetryResponse,
)
from app.schemas.responses import PaginatedResponse
from app.services.submission_service import SubmissionService
from app.utils.constants import (
    DEFAULT_SKIP,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    DEFAULT_SORT_FIELD,
    DEFAULT_SORT_ORDER,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])
_submission_service = SubmissionService()


@router.post(
    "",
    response_model=SubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit code for evaluation",
    description="Creates a submission, saves to DB, and publishes to judge queue. Returns 202 immediately.",
)
async def create_submission(
    data: SubmissionCreate,
    session: AsyncSession = Depends(get_session),
) -> SubmissionResponse:
    """Create a new code submission."""
    return await _submission_service.create_submission(session, data)


@router.get(
    "",
    response_model=PaginatedResponse[SubmissionListItem],
    status_code=status.HTTP_200_OK,
    summary="List submissions with filtering",
)
async def list_submissions(
    skip: int = Query(default=DEFAULT_SKIP, ge=0),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    problem_id: int | None = Query(default=None, description="Filter by problem ID"),
    status_filter: str | None = Query(
        default=None, alias="status", description="Filter by status"
    ),
    verdict: str | None = Query(default=None, description="Filter by verdict"),
    user_id: str | None = Query(default=None, description="Filter by user ID"),
    sort_by: str = Query(default=DEFAULT_SORT_FIELD),
    sort_order: str = Query(default=DEFAULT_SORT_ORDER),
    session: AsyncSession = Depends(get_session),
) -> PaginatedResponse[SubmissionListItem]:
    """List submissions with optional filtering, pagination, and sorting."""
    return await _submission_service.list_submissions(
        session,
        skip=skip,
        limit=limit,
        problem_id=problem_id,
        status=status_filter,
        verdict=verdict,
        user_id=user_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{submission_id}",
    response_model=SubmissionDetail,
    status_code=status.HTTP_200_OK,
    summary="Get a single submission by ID",
)
async def get_submission(
    submission_id: int,
    session: AsyncSession = Depends(get_session),
) -> SubmissionDetail:
    """Retrieve full details for a specific submission."""
    return await _submission_service.get_submission(session, submission_id)


@router.post(
    "/{submission_id}/retry",
    response_model=RetryResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry a failed submission",
)
async def retry_submission(
    submission_id: int,
    session: AsyncSession = Depends(get_session),
) -> RetryResponse:
    """Retry a failed submission by re-publishing to the judge queue."""
    return await _submission_service.retry_submission(session, submission_id)
