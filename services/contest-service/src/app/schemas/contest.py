"""Pydantic schemas for Contest endpoints."""

from datetime import datetime
from pydantic import BaseModel, Field


class ContestCreate(BaseModel):
    """Request body for creating a contest."""

    name: str = Field(max_length=255)
    description: str | None = None
    start_time: datetime
    end_time: datetime
    problem_ids: list[int] = Field(min_length=1)
    points_per_ac: int = Field(default=100, ge=1)
    max_participants: int | None = Field(default=None, ge=1)


class ContestResponse(BaseModel):
    """Response body for a single contest."""

    id: int
    name: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    problem_count: int
    participant_count: int
    is_active: bool
    points_per_ac: int
    created_at: datetime


class ContestDetailResponse(ContestResponse):
    """Detailed contest response with problem IDs."""

    problem_ids: list[int]
    max_participants: int | None = None
    is_public: bool = True
    updated_at: datetime | None = None


class ContestListResponse(BaseModel):
    """Paginated list of contests."""

    data: list[ContestResponse]
    total: int
    skip: int
    limit: int


class JoinContestRequest(BaseModel):
    """Request body for joining a contest."""

    user_id: str = Field(max_length=255)


class JoinContestResponse(BaseModel):
    """Response body after joining a contest."""

    message: str
    contest_id: int
    user_id: str
    participant_count: int


class ScoreUpdateRequest(BaseModel):
    """Request body for updating a user's score in a contest."""

    user_id: str = Field(max_length=255)
    submission_id: int | None = None
    verdict: str = Field(max_length=10)
    points: int = Field(ge=0)
    timestamp: datetime | None = None


class ScoreUpdateResponse(BaseModel):
    """Response body after score update."""

    message: str
    user_id: str
    new_score: int
    new_rank: int
    contest_id: int
