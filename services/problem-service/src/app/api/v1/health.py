"""Health check endpoint for Docker health checks and K8s liveness probes.

Verifies service status and database connectivity.
"""

from fastapi import APIRouter, status
from sqlalchemy import text

from app.database import async_session_factory
from app.logger import get_logger
from app.schemas.responses import HealthResponse

logger = get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service health check",
    description="Returns service status and database connectivity for monitoring.",
)
async def health_check() -> HealthResponse:
    """Check service health and database connectivity.

    Returns:
        HealthResponse with service status and database connection state.
    """
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("Health check: database unreachable - %s", exc)
        db_status = "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        service="problem-service",
        version="1.0.0",
        database=db_status,
    )
