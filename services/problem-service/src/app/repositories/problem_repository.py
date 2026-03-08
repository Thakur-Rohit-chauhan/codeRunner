"""Problem repository for async database operations.

Encapsulates all SQL queries for the problems table using SQLModel
with asyncpg. All methods are async and use parameterized queries
for SQL injection prevention.
"""

from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.logger import get_logger
from app.models.problem import Problem

logger = get_logger(__name__)


class ProblemRepository:
    """Async repository for Problem CRUD operations.

    All methods require an AsyncSession and perform parameterized
    queries via SQLModel's select() API.
    """

    async def create(self, session: AsyncSession, problem: Problem) -> Problem:
        """Insert a new problem into the database.

        Args:
            session: Active async database session.
            problem: Problem model instance to persist.

        Returns:
            The persisted problem with auto-generated ID and timestamps.
        """
        session.add(problem)
        await session.flush()
        await session.refresh(problem)
        logger.info("Created problem id=%s title='%s'", problem.id, problem.title)
        return problem

    async def get_by_id(
        self, session: AsyncSession, problem_id: int
    ) -> Problem | None:
        """Fetch a single problem by ID, excluding soft-deleted records.

        Args:
            session: Active async database session.
            problem_id: The problem's primary key.

        Returns:
            Problem instance or None if not found / soft-deleted.
        """
        statement = select(Problem).where(
            Problem.id == problem_id,
            Problem.is_deleted == False,  # noqa: E712
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()

    async def list_problems(
        self,
        session: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 10,
        problem_type: str | None = None,
        difficulty: str | None = None,
        topic: str | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Problem], int]:
        """List problems with filtering, search, pagination, and sorting.

        Args:
            session: Active async database session.
            skip: Pagination offset.
            limit: Maximum number of results.
            problem_type: Optional filter by problem type.
            difficulty: Optional filter by difficulty.
            topic: Optional filter by topic (partial match in JSON string).
            search: Optional full-text search in title and description.
            sort_by: Field to sort by (created_at, title, difficulty).
            sort_order: Sort direction ("asc" or "desc").

        Returns:
            Tuple of (list of problems, total count matching filters).
        """
        # Base query — exclude soft-deleted
        base_query = select(Problem).where(Problem.is_deleted == False)  # noqa: E712

        # Apply filters
        if problem_type:
            base_query = base_query.where(Problem.problem_type == problem_type)

        if difficulty:
            base_query = base_query.where(Problem.difficulty == difficulty)

        if topic:
            # Partial match on JSON-encoded topics string
            base_query = base_query.where(
                Problem.topics.ilike(f"%{topic}%")  # type: ignore[union-attr]
            )

        if search:
            search_pattern = f"%{search}%"
            base_query = base_query.where(
                or_(
                    Problem.title.ilike(search_pattern),  # type: ignore[union-attr]
                    Problem.description.ilike(search_pattern),  # type: ignore[union-attr]
                )
            )

        # Count total matching records
        count_statement = select(func.count()).select_from(
            base_query.subquery()
        )
        count_result = await session.execute(count_statement)
        total = count_result.scalar_one()

        # Apply sorting
        sort_column = getattr(Problem, sort_by, Problem.created_at)
        if sort_order == "asc":
            base_query = base_query.order_by(sort_column.asc())  # type: ignore[union-attr]
        else:
            base_query = base_query.order_by(sort_column.desc())  # type: ignore[union-attr]

        # Apply pagination
        base_query = base_query.offset(skip).limit(limit)

        result = await session.execute(base_query)
        problems = list(result.scalars().all())

        logger.debug(
            "Listed problems: total=%d, skip=%d, limit=%d, returned=%d",
            total,
            skip,
            limit,
            len(problems),
        )
        return problems, total

    async def check_title_exists(
        self, session: AsyncSession, title: str
    ) -> bool:
        """Check whether a problem with the given title already exists.

        Args:
            session: Active async database session.
            title: The title to check for uniqueness.

        Returns:
            True if a non-deleted problem with this title exists.
        """
        statement = select(func.count()).where(
            Problem.title == title,
            Problem.is_deleted == False,  # noqa: E712
        )
        result = await session.execute(statement)
        count = result.scalar_one()
        return count > 0
