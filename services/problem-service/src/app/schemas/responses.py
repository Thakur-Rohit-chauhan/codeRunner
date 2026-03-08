"""Common response wrapper schemas.

Provides standardized response formats for pagination, errors,
and health check endpoints across the service.
"""

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response wrapper.

    Attributes:
        data: List of items for the current page.
        total: Total number of matching records.
        skip: Current pagination offset.
        limit: Number of items per page.
    """

    data: list[T]
    total: int
    skip: int
    limit: int


class ErrorDetail(BaseModel):
    """Individual field-level error detail."""

    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    """Standardized error response body.

    Attributes:
        error: Human-readable error type.
        message: Descriptive error message.
        details: Optional list of field-level errors.
        timestamp: When the error occurred (UTC).
    """

    error: str
    message: str
    details: list[ErrorDetail] | None = None
    timestamp: datetime | None = None


class HealthResponse(BaseModel):
    """Health check response body.

    Attributes:
        status: Service status ("healthy" or "unhealthy").
        service: Service name identifier.
        version: Service version string.
        database: Database connection status.
    """

    status: str
    service: str
    version: str
    database: str
