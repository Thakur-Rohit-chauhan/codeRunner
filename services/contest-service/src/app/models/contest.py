"""Contest SQLModel definition.

Represents a competitive programming contest with problem sets,
timing, and scoring configuration.
"""

from datetime import datetime
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Text


class Contest(SQLModel, table=True):
    """Contest entity."""

    __tablename__ = "contests"

    id: int | None = Field(default=None, primary_key=True)

    # Core fields
    name: str = Field(max_length=255, index=True)
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    # Contest timing
    start_time: datetime
    end_time: datetime

    # Problem configuration — JSON array of problem IDs
    problem_ids: str = Field(sa_column=Column(Text, nullable=False))

    # Scoring configuration
    points_per_ac: int = Field(default=100)
    points_per_partial: int = Field(default=50)
    max_participants: int | None = Field(default=None)

    # Status
    is_active: bool = Field(default=True, index=True)
    is_public: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str | None = Field(default=None, max_length=255)
