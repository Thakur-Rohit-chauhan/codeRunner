"""Contest service — business logic for contest management."""

import json
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.logger import get_logger
from app.models.contest import Contest
from app.repositories.contest_repository import ContestRepository
from app.repositories.user_repository import UserRepository
from app.services.leaderboard_service import LeaderboardService
from app.exceptions import (
    ContestNotFoundError,
    ContestInactiveError,
    AlreadyJoinedError,
    ContestFullError,
)

logger = get_logger(__name__)


class ContestService:
    """Orchestrates contest creation, joining, and score management."""

    def __init__(
        self,
        session: AsyncSession,
        leaderboard_service: LeaderboardService,
    ) -> None:
        self.contest_repo = ContestRepository(session)
        self.user_repo = UserRepository(session)
        self.leaderboard = leaderboard_service

    async def create_contest(
        self,
        name: str,
        description: str | None,
        start_time: datetime,
        end_time: datetime,
        problem_ids: list[int],
        points_per_ac: int = 100,
        max_participants: int | None = None,
    ) -> Contest:
        """Create a new contest."""
        contest = Contest(
            name=name,
            description=description,
            start_time=start_time.replace(tzinfo=None) if start_time.tzinfo else start_time,
            end_time=end_time.replace(tzinfo=None) if end_time.tzinfo else end_time,
            problem_ids=json.dumps(problem_ids),
            points_per_ac=points_per_ac,
            max_participants=max_participants,
        )
        contest = await self.contest_repo.create(contest)
        logger.info("Contest created: id=%s name='%s'", contest.id, contest.name)
        return contest

    async def get_contest(self, contest_id: int) -> Contest:
        """Get contest by ID or raise 404."""
        contest = await self.contest_repo.get_by_id(contest_id)
        if contest is None:
            raise ContestNotFoundError(contest_id)
        return contest

    async def list_contests(
        self,
        skip: int = 0,
        limit: int = 10,
        is_active: bool | None = None,
    ) -> tuple[list[Contest], int]:
        """List contests with pagination."""
        return await self.contest_repo.list_contests(skip, limit, is_active)

    async def join_contest(self, contest_id: int, user_id: str) -> dict:
        """Join a user to a contest.

        Creates the user if they don't exist, then registers
        them in the Redis leaderboard with 0 score.
        """
        contest = await self.get_contest(contest_id)

        if not contest.is_active:
            raise ContestInactiveError(contest_id)

        # Check capacity
        current_count = await self.leaderboard.get_participant_count(contest_id)
        if contest.max_participants and current_count >= contest.max_participants:
            raise ContestFullError(contest_id)

        # Ensure user exists in DB
        await self.user_repo.get_or_create(user_id)
        await self.user_repo.update_last_active(user_id)

        # Register in Redis leaderboard
        is_new = await self.leaderboard.add_participant(contest_id, user_id)

        if not is_new:
            raise AlreadyJoinedError(user_id, contest_id)

        new_count = await self.leaderboard.get_participant_count(contest_id)

        logger.info("User '%s' joined contest %d (participants=%d)", user_id, contest_id, new_count)

        return {
            "message": "Successfully joined contest",
            "contest_id": contest_id,
            "user_id": user_id,
            "participant_count": new_count,
        }

    async def update_score(
        self,
        contest_id: int,
        user_id: str,
        points: int,
        submission_id: int | None = None,
        verdict: str = "AC",
    ) -> dict:
        """Update a user's score in the contest leaderboard."""
        # Verify contest exists
        await self.get_contest(contest_id)

        result = await self.leaderboard.update_score(
            contest_id=contest_id,
            user_id=user_id,
            points=points,
            submission_id=submission_id,
        )

        return {
            "message": "Score updated",
            "user_id": user_id,
            "new_score": result["new_score"],
            "new_rank": result["rank"],
            "contest_id": contest_id,
        }
