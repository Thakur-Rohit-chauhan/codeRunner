"""Problem SQLModel definition.

Represents the core `problems` table in PostgreSQL with support for
DSA, ML, and Cybersecurity challenge types via type-specific metadata.
"""

from datetime import datetime
from typing import Any

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Text, JSON


class Problem(SQLModel, table=True):
    """Base problem entity for all challenge types.

    Attributes:
        id: Auto-incrementing primary key.
        title: Unique, indexed problem title (3-255 chars).
        description: Markdown-supported problem description.
        problem_type: Challenge type - "dsa", "ml", or "cyber".
        time_limit: Execution time limit in milliseconds.
        memory_limit: Memory limit in MB.
        difficulty: Problem difficulty - "easy", "medium", or "hard".
        topics: JSON-encoded list of topic tags.
        metadata_: Type-specific metadata as JSON dict.
        created_at: Timestamp of creation (UTC).
        updated_at: Timestamp of last update (UTC).
        created_by: User ID of creator (populated in Phase 2).
        is_deleted: Soft delete flag for audit trail.
    """

    __tablename__ = "problems"

    id: int | None = Field(default=None, primary_key=True)

    # Core fields
    title: str = Field(
        index=True,
        max_length=255,
        sa_column_kwargs={"unique": True},
    )
    description: str = Field(sa_column=Column(Text, nullable=False))
    problem_type: str = Field(index=True, max_length=20)

    # Execution constraints
    time_limit: int  # milliseconds
    memory_limit: int  # MB

    # Difficulty
    difficulty: str = Field(default="medium", max_length=20)

    # Topics/tags stored as JSON string
    topics: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    # Type-specific metadata stored as JSON
    metadata_: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column("metadata", JSON, nullable=True),
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow
    )

    # Creator (will link to Auth Service in Phase 2)
    created_by: str | None = Field(default=None, max_length=255)

    # Soft delete
    is_deleted: bool = Field(default=False, index=True)
