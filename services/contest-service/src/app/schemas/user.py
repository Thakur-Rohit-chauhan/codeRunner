"""Pydantic schemas for User-related operations."""

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """Request body for creating/registering a user."""

    id: str = Field(max_length=255)
    display_name: str = Field(max_length=255)
    email: str = Field(max_length=255)
