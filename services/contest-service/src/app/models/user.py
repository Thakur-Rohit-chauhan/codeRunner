"""User SQLModel definition.

Represents a platform user who participates in contests.
"""

from datetime import datetime
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """User entity."""

    __tablename__ = "users"

    id: str = Field(primary_key=True, max_length=255)

    # Profile
    display_name: str = Field(max_length=255)
    email: str = Field(unique=True, index=True, max_length=255)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime | None = Field(default=None)
