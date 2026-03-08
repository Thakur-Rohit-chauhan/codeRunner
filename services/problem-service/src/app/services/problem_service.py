"""Problem business logic service.

Orchestrates validation, data transformation, and repository calls.
Handles topics serialization (list ↔ JSON string) and enforces
business rules like title uniqueness.
"""

import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import (
    DuplicateTitleError,
    ProblemNotFoundError,
    DatabaseError,
)
from app.logger import get_logger
from app.models.problem import Problem
from app.repositories.problem_repository import ProblemRepository
from app.schemas.problem import ProblemCreate, ProblemRead, ProblemListItem
from app.schemas.responses import PaginatedResponse
from app.utils.constants import (
    DEFAULT_SKIP,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    ALLOWED_SORT_FIELDS,
    DEFAULT_SORT_FIELD,
    DEFAULT_SORT_ORDER,
)

logger = get_logger(__name__)


class ProblemService:
    """Business logic layer for Problem operations.

    Validates inputs, checks business rules, transforms data
    between API schemas and database models, and delegates
    persistence to ProblemRepository.
    """

    def __init__(self) -> None:
        self.repository = ProblemRepository()

    async def create_problem(
        self, session: AsyncSession, data: ProblemCreate
    ) -> ProblemRead:
        """Create a new problem after validating business rules.

        Args:
            session: Active async database session.
            data: Validated problem creation data.

        Returns:
            ProblemRead schema with the created problem's details.

        Raises:
            DuplicateTitleError: If a problem with the same title exists.
            DatabaseError: If the database operation fails.
        """
        try:
            # Check title uniqueness
            title_exists = await self.repository.check_title_exists(
                session, data.title
            )
            if title_exists:
                logger.warning("Duplicate title detected: '%s'", data.title)
                raise DuplicateTitleError(data.title)

            # Serialize topics list to JSON string for storage
            topics_json: str | None = None
            if data.topics:
                topics_json = json.dumps(data.topics)

            # Build model instance
            problem = Problem(
                title=data.title,
                description=data.description,
                problem_type=data.problem_type,
                time_limit=data.time_limit,
                memory_limit=data.memory_limit,
                difficulty=data.difficulty,
                topics=topics_json,
                metadata_=data.metadata,
            )

            created = await self.repository.create(session, problem)
            logger.info(
                "POST /api/problems | status=201 | problem_id=%s",
                created.id,
            )
            return ProblemRead.model_validate(created)

        except (DuplicateTitleError,):
            raise
        except Exception as exc:
            logger.error("Failed to create problem: %s", exc, exc_info=True)
            raise DatabaseError(f"Failed to create problem: {exc}") from exc

    async def get_problem(
        self, session: AsyncSession, problem_id: int
    ) -> ProblemRead:
        """Retrieve a single problem by ID.

        Args:
            session: Active async database session.
            problem_id: The problem's primary key.

        Returns:
            ProblemRead schema with full problem details.

        Raises:
            ProblemNotFoundError: If the problem does not exist.
            DatabaseError: If the database operation fails.
        """
        try:
            problem = await self.repository.get_by_id(session, problem_id)
            if not problem:
                raise ProblemNotFoundError(problem_id)
            return ProblemRead.model_validate(problem)

        except ProblemNotFoundError:
            raise
        except Exception as exc:
            logger.error(
                "Failed to fetch problem id=%s: %s",
                problem_id,
                exc,
                exc_info=True,
            )
            raise DatabaseError(
                f"Failed to fetch problem: {exc}"
            ) from exc

    async def list_problems(
        self,
        session: AsyncSession,
        *,
        skip: int = DEFAULT_SKIP,
        limit: int = DEFAULT_LIMIT,
        problem_type: str | None = None,
        difficulty: str | None = None,
        topic: str | None = None,
        search: str | None = None,
        sort_by: str = DEFAULT_SORT_FIELD,
        sort_order: str = DEFAULT_SORT_ORDER,
    ) -> PaginatedResponse[ProblemListItem]:
        """List problems with filtering, pagination, and sorting.

        Clamps limit to MAX_LIMIT. Validates sort_by and sort_order,
        falling back to defaults for invalid values.

        Args:
            session: Active async database session.
            skip: Pagination offset (default 0).
            limit: Items per page (default 10, max 100).
            problem_type: Optional filter by type.
            difficulty: Optional filter by difficulty.
            topic: Optional filter by topic (partial match).
            search: Optional full-text search in title + description.
            sort_by: Sort field (default "created_at").
            sort_order: Sort direction (default "desc").

        Returns:
            PaginatedResponse containing list of ProblemListItem and metadata.
        """
        try:
            # Clamp and validate parameters
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

            problems, total = await self.repository.list_problems(
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

            items = [ProblemListItem.model_validate(p) for p in problems]

            return PaginatedResponse[ProblemListItem](
                data=items,
                total=total,
                skip=skip,
                limit=limit,
            )

        except Exception as exc:
            logger.error("Failed to list problems: %s", exc, exc_info=True)
            raise DatabaseError(f"Failed to list problems: {exc}") from exc
