"""Common response wrapper schemas."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response wrapper."""

    data: list[T]
    total: int
    skip: int
    limit: int


class ErrorDetail(BaseModel):
    """Individual field-level error detail."""

    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    """Standardized error response body."""

    error: str
    message: str
    details: list[ErrorDetail] | None = None
    timestamp: datetime | None = None


class HealthResponse(BaseModel):
    """Health check response body with RabbitMQ status."""

    status: str
    service: str
    version: str
    database: str
    rabbitmq: str
