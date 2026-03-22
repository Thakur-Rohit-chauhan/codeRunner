"""Contest repository — async CRUD operations for contests."""

import json
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.logger import get_logger
from app.models.contest import Contest

logger = get_logger(__name__)


class ContestRepository:
    """Data-access layer for Contest entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, contest: Contest) -> Contest:
        """Persist a new contest."""
        self.session.add(contest)
        await self.session.flush()
        await self.session.refresh(contest)
        logger.info("Created contest id=%s name='%s'", contest.id, contest.name)
        return contest

    async def get_by_id(self, contest_id: int) -> Contest | None:
        """Fetch a contest by primary key."""
        result = await self.session.execute(
            select(Contest).where(Contest.id == contest_id)
        )
        return result.scalar_one_or_none()

    async def list_contests(
        self,
        skip: int = 0,
        limit: int = 10,
        is_active: bool | None = None,
    ) -> tuple[list[Contest], int]:
        """Return a paginated list of contests with total count."""
        query = select(Contest)
        count_query = select(func.count()).select_from(Contest)

        if is_active is not None:
            query = query.where(Contest.is_active == is_active)
            count_query = count_query.where(Contest.is_active == is_active)

        query = query.order_by(Contest.created_at.desc()).offset(skip).limit(limit)

        result = await self.session.execute(query)
        contests = list(result.scalars().all())

        count_result = await self.session.execute(count_query)
        total = count_result.scalar_one()

        return contests, total

    async def update(self, contest: Contest) -> Contest:
        """Update an existing contest."""
        contest.updated_at = datetime.utcnow()
        self.session.add(contest)
        await self.session.flush()
        await self.session.refresh(contest)
        return contest

    @staticmethod
    def get_problem_ids(contest: Contest) -> list[int]:
        """Parse problem_ids JSON string to list of ints."""
        try:
            return json.loads(contest.problem_ids)
        except (json.JSONDecodeError, TypeError):
            return []

    @staticmethod
    def get_problem_count(contest: Contest) -> int:
        """Get the number of problems in a contest."""
        return len(ContestRepository.get_problem_ids(contest))
