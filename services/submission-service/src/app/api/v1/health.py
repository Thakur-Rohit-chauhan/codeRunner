"""Health check endpoint for Submission Service.

Verifies database and RabbitMQ connectivity.
"""

from fastapi import APIRouter, status
from sqlalchemy import text

from app.database import async_session_factory
from app.logger import get_logger
from app.rabbitmq import rabbitmq_client
from app.schemas.responses import HealthResponse

logger = get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service health check",
)
async def health_check() -> HealthResponse:
    """Check service health, database, and RabbitMQ connectivity."""
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("Health check: database unreachable - %s", exc)
        db_status = "disconnected"

    rmq_status = await rabbitmq_client.health_check()

    overall = "healthy"
    if db_status == "disconnected":
        overall = "unhealthy"
    elif rmq_status == "disconnected":
        overall = "degraded"

    return HealthResponse(
        status=overall,
        service="submission-service",
        version="1.0.0",
        database=db_status,
        rabbitmq=rmq_status,
    )
