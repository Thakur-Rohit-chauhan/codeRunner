"""Pydantic schemas for Leaderboard endpoints."""

from datetime import datetime
from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    """A single user's leaderboard entry."""

    rank: int
    user_id: str
    display_name: str | None = None
    score: int
    problems_solved: int = 0
    submissions: int = 0
    accuracy: float = 0.0


class LeaderboardResponse(BaseModel):
    """Full leaderboard response with contest metadata."""

    contest_id: int
    contest_name: str | None = None
    timestamp: datetime
    leaderboard: list[LeaderboardEntry]
    total_participants: int
    your_rank: int | None = None
    your_score: int | None = None
