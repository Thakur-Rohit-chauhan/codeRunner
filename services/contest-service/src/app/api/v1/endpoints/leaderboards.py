"""Leaderboard endpoints.

Provides real-time leaderboard queries backed by Redis Sorted Sets.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Query, status

from app.redis_client import redis_client
from app.services.leaderboard_service import LeaderboardService
from app.schemas.leaderboard import LeaderboardEntry, LeaderboardResponse
from app.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get(
    "",
    response_model=LeaderboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get contest leaderboard",
)
async def get_leaderboard(
    contest_id: int = Query(..., description="Contest ID"),
    limit: int = Query(default=10, ge=1, le=100, description="Top N users"),
    user_id: str | None = Query(default=None, description="Get specific user's rank"),
) -> LeaderboardResponse:
    """Get the real-time leaderboard for a contest.

    Returns the top N users ranked by score. Optionally includes
    the requesting user's rank if user_id is provided.
    """
    leaderboard_svc = LeaderboardService(redis_client.client)

    # Get top N
    entries = await leaderboard_svc.get_leaderboard(contest_id, limit)

    leaderboard = [
        LeaderboardEntry(
            rank=e["rank"],
            user_id=e["user_id"],
            score=e["score"],
            problems_solved=e.get("problems_solved", 0),
            submissions=e.get("submissions", 0),
            accuracy=e.get("accuracy", 0.0),
        )
        for e in entries
    ]

    # Get total participants
    stats = await leaderboard_svc.get_contest_stats(contest_id)
    total_participants = stats["total_participants"]

    # Get specific user's rank if requested
    your_rank = None
    your_score = None
    if user_id:
        user_info = await leaderboard_svc.get_user_rank(contest_id, user_id)
        your_rank = user_info["rank"]
        your_score = user_info["score"]

    return LeaderboardResponse(
        contest_id=contest_id,
        timestamp=datetime.now(timezone.utc),
        leaderboard=leaderboard,
        total_participants=total_participants,
        your_rank=your_rank,
        your_score=your_score,
    )
