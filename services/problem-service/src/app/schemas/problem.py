"""Pydantic request/response schemas for Problem endpoints.

Separates API-level validation (Pydantic) from database-level (SQLModel).
Handles serialization of topics between list (API) and JSON string (DB).
"""

import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_validator

from app.utils.validators import (
    validate_title,
    validate_description,
    validate_problem_type,
    validate_difficulty,
    validate_time_limit,
    validate_memory_limit,
)


class ProblemCreate(BaseModel):
    """Schema for POST /api/problems request body.

    All validation is performed before data reaches the service layer.
    """

    title: str
    description: str
    problem_type: str
    time_limit: int
    memory_limit: int
    difficulty: str = "medium"
    topics: list[str] | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        """Validate title length and whitespace."""
        return validate_title(v)

    @field_validator("description")
    @classmethod
    def check_description(cls, v: str) -> str:
        """Validate description minimum length."""
        return validate_description(v)

    @field_validator("problem_type")
    @classmethod
    def check_problem_type(cls, v: str) -> str:
        """Validate problem_type is one of allowed values."""
        return validate_problem_type(v)

    @field_validator("difficulty")
    @classmethod
    def check_difficulty(cls, v: str) -> str:
        """Validate difficulty is one of allowed values."""
        return validate_difficulty(v)

    @field_validator("time_limit")
    @classmethod
    def check_time_limit(cls, v: int) -> int:
        """Validate time_limit within range."""
        return validate_time_limit(v)

    @field_validator("memory_limit")
    @classmethod
    def check_memory_limit(cls, v: int) -> int:
        """Validate memory_limit within range."""
        return validate_memory_limit(v)


class ProblemRead(BaseModel):
    """Schema for single problem response (GET /api/problems/{id}).

    Includes full metadata. Topics are deserialized from JSON string to list.
    """

    id: int
    title: str
    description: str
    problem_type: str
    time_limit: int
    memory_limit: int
    difficulty: str
    topics: list[str] | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    created_by: str | None = None

    @model_validator(mode="before")
    @classmethod
    def deserialize_fields(cls, data: Any) -> Any:
        """Deserialize topics from JSON string and remap metadata_ to metadata."""
        if hasattr(data, "__dict__"):
            # SQLModel instance
            values = {}
            values["id"] = data.id
            values["title"] = data.title
            values["description"] = data.description
            values["problem_type"] = data.problem_type
            values["time_limit"] = data.time_limit
            values["memory_limit"] = data.memory_limit
            values["difficulty"] = data.difficulty
            values["created_at"] = data.created_at
            values["updated_at"] = data.updated_at
            values["created_by"] = data.created_by

            # Deserialize topics from JSON string
            if data.topics:
                try:
                    values["topics"] = json.loads(data.topics)
                except (json.JSONDecodeError, TypeError):
                    values["topics"] = None
            else:
                values["topics"] = None

            # Remap metadata_ to metadata
            values["metadata"] = data.metadata_

            return values
        return data

    model_config = {"from_attributes": True}


class ProblemListItem(BaseModel):
    """Schema for list endpoint items (GET /api/problems).

    Omits metadata for lighter responses in list views.
    """

    id: int
    title: str
    description: str
    problem_type: str
    time_limit: int
    memory_limit: int
    difficulty: str
    topics: list[str] | None = None
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def deserialize_topics(cls, data: Any) -> Any:
        """Deserialize topics from JSON string."""
        if hasattr(data, "__dict__"):
            values = {}
            values["id"] = data.id
            values["title"] = data.title
            values["description"] = data.description
            values["problem_type"] = data.problem_type
            values["time_limit"] = data.time_limit
            values["memory_limit"] = data.memory_limit
            values["difficulty"] = data.difficulty
            values["created_at"] = data.created_at

            if data.topics:
                try:
                    values["topics"] = json.loads(data.topics)
                except (json.JSONDecodeError, TypeError):
                    values["topics"] = None
            else:
                values["topics"] = None

            return values
        return data

    model_config = {"from_attributes": True}
