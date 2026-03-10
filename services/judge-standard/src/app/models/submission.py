"""Submission SQLModel — mirror of submission-service's model.

The judge-standard writes directly to this table to update
status, verdict, and execution results.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Text


class Submission(SQLModel, table=True):
    """User code submission entity.

    Mirrors submission-service's model for direct DB writes.
    """

    __tablename__ = "submissions"

    id: int | None = Field(default=None, primary_key=True)

    # Core fields
    problem_id: int = Field(index=True)
    user_id: str | None = Field(default=None, max_length=255, index=True)

    # Code submission
    code: str = Field(sa_column=Column(Text, nullable=False))
    language: str = Field(max_length=20)

    # Status tracking
    status: str = Field(default="PENDING", index=True, max_length=20)

    # Results (populated by judge)
    verdict: str | None = Field(default=None, max_length=10)
    test_passed: int | None = Field(default=None)
    test_total: int | None = Field(default=None)
    execution_time: int | None = Field(default=None)   # ms
    execution_memory: int | None = Field(default=None)  # MB
    error_message: str | None = Field(
        default=None, sa_column=Column("error_message", Text, nullable=True)
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    judged_at: datetime | None = Field(default=None)

    # Queue tracking
    queue_id: str | None = Field(default=None, max_length=255)
    retries: int = Field(default=0)

    # Soft delete
    is_deleted: bool = Field(default=False, index=True)
