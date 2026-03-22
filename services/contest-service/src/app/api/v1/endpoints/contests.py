"""Contest management endpoints.

Provides CRUD for contests, joining, and score updates.
"""

import json

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.redis_client import redis_client
from app.repositories.contest_repository import ContestRepository
from app.services.contest_service import ContestService
from app.services.leaderboard_service import LeaderboardService
from app.schemas.contest import (
    ContestCreate,
    ContestResponse,
    ContestDetailResponse,
    ContestListResponse,
    JoinContestRequest,
    JoinContestResponse,
    ScoreUpdateRequest,
    ScoreUpdateResponse,
)
from app.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/contests", tags=["contests"])


def _get_contest_service(session: AsyncSession) -> ContestService:
    """Build a ContestService with the current session and Redis client."""
    leaderboard_svc = LeaderboardService(redis_client.client)
    return ContestService(session, leaderboard_svc)


# ── GET /api/contests ─────────────────────────────────────────

@router.get(
    "",
    response_model=ContestListResponse,
    status_code=status.HTTP_200_OK,
    summary="List contests",
)
async def list_contests(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    is_active: bool | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> ContestListResponse:
    """Get a paginated list of contests."""
    svc = _get_contest_service(session)
    leaderboard_svc = LeaderboardService(redis_client.client)
    contests, total = await svc.list_contests(skip, limit, is_active)

    data = []
    for c in contests:
        participant_count = await leaderboard_svc.get_participant_count(c.id)
        data.append(
            ContestResponse(
                id=c.id,
                name=c.name,
                description=c.description,
                start_time=c.start_time,
                end_time=c.end_time,
                problem_count=ContestRepository.get_problem_count(c),
                participant_count=participant_count,
                is_active=c.is_active,
                points_per_ac=c.points_per_ac,
                created_at=c.created_at,
            )
        )

    return ContestListResponse(data=data, total=total, skip=skip, limit=limit)


# ── GET /api/contests/{contest_id} ────────────────────────────

@router.get(
    "/{contest_id}",
    response_model=ContestDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get contest details",
)
async def get_contest(
    contest_id: int,
    session: AsyncSession = Depends(get_session),
) -> ContestDetailResponse:
    """Get detailed information about a contest."""
    svc = _get_contest_service(session)
    leaderboard_svc = LeaderboardService(redis_client.client)

    contest = await svc.get_contest(contest_id)
    participant_count = await leaderboard_svc.get_participant_count(contest.id)

    return ContestDetailResponse(
        id=contest.id,
        name=contest.name,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        problem_ids=ContestRepository.get_problem_ids(contest),
        problem_count=ContestRepository.get_problem_count(contest),
        participant_count=participant_count,
        is_active=contest.is_active,
        points_per_ac=contest.points_per_ac,
        max_participants=contest.max_participants,
        is_public=contest.is_public,
        created_at=contest.created_at,
        updated_at=contest.updated_at,
    )


# ── POST /api/contests ────────────────────────────────────────

@router.post(
    "",
    response_model=ContestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new contest",
)
async def create_contest(
    body: ContestCreate,
    session: AsyncSession = Depends(get_session),
) -> ContestResponse:
    """Create a new contest with problem set and scoring rules."""
    svc = _get_contest_service(session)

    contest = await svc.create_contest(
        name=body.name,
        description=body.description,
        start_time=body.start_time,
        end_time=body.end_time,
        problem_ids=body.problem_ids,
        points_per_ac=body.points_per_ac,
        max_participants=body.max_participants,
    )

    return ContestResponse(
        id=contest.id,
        name=contest.name,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        problem_count=ContestRepository.get_problem_count(contest),
        participant_count=0,
        is_active=contest.is_active,
        points_per_ac=contest.points_per_ac,
        created_at=contest.created_at,
    )


# ── POST /api/contests/{contest_id}/join ───────────────────────

@router.post(
    "/{contest_id}/join",
    response_model=JoinContestResponse,
    status_code=status.HTTP_200_OK,
    summary="Join a contest",
)
async def join_contest(
    contest_id: int,
    body: JoinContestRequest,
    session: AsyncSession = Depends(get_session),
) -> JoinContestResponse:
    """Register a user as a participant in a contest."""
    svc = _get_contest_service(session)
    result = await svc.join_contest(contest_id, body.user_id)
    return JoinContestResponse(**result)


# ── POST /api/contests/{contest_id}/score ──────────────────────

@router.post(
    "/{contest_id}/score",
    response_model=ScoreUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user score",
)
async def update_score(
    contest_id: int,
    body: ScoreUpdateRequest,
    session: AsyncSession = Depends(get_session),
) -> ScoreUpdateResponse:
    """Update a user's score in the contest leaderboard."""
    svc = _get_contest_service(session)
    result = await svc.update_score(
        contest_id=contest_id,
        user_id=body.user_id,
        points=body.points,
        submission_id=body.submission_id,
        verdict=body.verdict,
    )
    return ScoreUpdateResponse(**result)
