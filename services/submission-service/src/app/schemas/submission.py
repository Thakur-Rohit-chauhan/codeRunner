"""Pydantic request/response schemas for Submission endpoints."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator

from app.utils.validators import validate_code, validate_language, validate_problem_id


class SubmissionCreate(BaseModel):
    """Schema for POST /api/submissions request body."""

    problem_id: int
    user_id: str | None = None
    contest_id: int | None = None
    code: str
    language: str

    @field_validator("problem_id")
    @classmethod
    def check_problem_id(cls, v: int) -> int:
        return validate_problem_id(v)

    @field_validator("code")
    @classmethod
    def check_code(cls, v: str) -> str:
        return validate_code(v)

    @field_validator("language")
    @classmethod
    def check_language(cls, v: str) -> str:
        return validate_language(v)


class SubmissionResponse(BaseModel):
    """Schema for POST response (202 Accepted)."""

    id: int
    problem_id: int
    user_id: str | None = None
    contest_id: int | None = None
    language: str
    status: str
    verdict: str | None = None
    created_at: datetime
    queue_id: str | None = None

    model_config = {"from_attributes": True}


class SubmissionDetail(BaseModel):
    """Full submission detail for GET /api/submissions/{id}."""

    id: int
    problem_id: int
    user_id: str | None = None
    contest_id: int | None = None
    code: str
    language: str
    status: str
    verdict: str | None = None
    test_passed: int | None = None
    test_total: int | None = None
    execution_time: int | None = None
    execution_memory: int | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    judged_at: datetime | None = None
    queue_id: str | None = None
    retries: int = 0

    model_config = {"from_attributes": True}


class SubmissionListItem(BaseModel):
    """Lightweight schema for list endpoint items."""

    id: int
    problem_id: int
    user_id: str | None = None
    contest_id: int | None = None
    language: str
    status: str
    verdict: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RetryResponse(BaseModel):
    """Schema for POST /api/submissions/{id}/retry response."""

    id: int
    status: str
    retries: int
    message: str
