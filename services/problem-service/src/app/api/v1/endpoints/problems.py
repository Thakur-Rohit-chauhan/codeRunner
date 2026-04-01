"""Problem route handlers.

Defines REST endpoints for creating, listing, and retrieving problems.
All handlers are async and use FastAPI's dependency injection for
database sessions.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.logger import get_logger
from app.schemas.problem import ProblemCreate, ProblemRead, ProblemListItem
from app.schemas.responses import PaginatedResponse
from app.services.problem_service import ProblemService
from app.utils.constants import (
    DEFAULT_SKIP,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    DEFAULT_SORT_FIELD,
    DEFAULT_SORT_ORDER,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/problems", tags=["problems"])

# Singleton service instance
_problem_service = ProblemService()


@router.post(
    "",
    response_model=ProblemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new problem",
    description="Create a new DSA, ML, or Cybersecurity problem with validation.",
)
async def create_problem(
    data: ProblemCreate,
    session: AsyncSession = Depends(get_session),
) -> ProblemRead:
    """Create a new problem.

    Args:
        data: Validated problem creation request body.
        session: Injected async database session.

    Returns:
        Created problem with assigned ID and timestamps.
    """
    return await _problem_service.create_problem(session, data)


@router.get(
    "",
    response_model=PaginatedResponse[ProblemListItem],
    status_code=status.HTTP_200_OK,
    summary="List problems with filtering and pagination",
    description="Retrieve a paginated list of problems with optional filtering by type, difficulty, topic, and search.",
)
async def list_problems(
    skip: int = Query(default=DEFAULT_SKIP, ge=0, description="Pagination offset"),
    limit: int = Query(
        default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT, description="Results per page (max 100)"
    ),
    problem_type: str | None = Query(
        default=None, description="Filter by type: dsa, ml, cyber"
    ),
    difficulty: str | None = Query(
        default=None, description="Filter by difficulty: easy, medium, hard"
    ),
    topic: str | None = Query(
        default=None, description="Filter by topic (partial match)"
    ),
    search: str | None = Query(
        default=None, description="Full-text search in title and description"
    ),
    sort_by: str = Query(
        default=DEFAULT_SORT_FIELD, description="Sort field: created_at, title, difficulty"
    ),
    sort_order: str = Query(
        default=DEFAULT_SORT_ORDER, description="Sort direction: asc or desc"
    ),
    session: AsyncSession = Depends(get_session),
) -> PaginatedResponse[ProblemListItem]:
    """List problems with filtering, search, pagination, and sorting.

    Args:
        skip: Pagination offset.
        limit: Number of results per page.
        problem_type: Optional type filter.
        difficulty: Optional difficulty filter.
        topic: Optional topic filter (partial match).
        search: Optional full-text search term.
        sort_by: Field to sort by.
        sort_order: Sort direction.
        session: Injected async database session.

    Returns:
        Paginated response with matching problems.
    """
    return await _problem_service.list_problems(
        session,
        skip=skip,
        limit=limit,
        problem_type=problem_type,
        difficulty=difficulty,
        topic=topic,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{problem_id}",
    response_model=ProblemRead,
    status_code=status.HTTP_200_OK,
    summary="Get a single problem by ID",
    description="Retrieve full details for a specific problem including metadata.",
)
async def get_problem(
    problem_id: int,
    session: AsyncSession = Depends(get_session),
) -> ProblemRead:
    """Get a single problem by its ID.

    Args:
        problem_id: The problem's primary key.
        session: Injected async database session.

    Returns:
        Full problem details including metadata.
    """
    return await _problem_service.get_problem(session, problem_id)
