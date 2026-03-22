"""FastAPI application entry point for Contest Service.

Configures lifespan events (database + Redis + RabbitMQ consumer init/close),
exception handlers, CORS middleware, and router registration.
"""

import asyncio
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.v1.router import api_v1_router
from app.config import settings
from app.database import init_db, close_db
from app.redis_client import redis_client
from app.workers.score_consumer import score_consumer
from app.exceptions import (
    ContestServiceError,
    ContestNotFoundError,
    ContestFullError,
    AlreadyJoinedError,
    ContestInactiveError,
    ValidationError,
    DatabaseError,
    RedisError,
)
from app.logger import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan managing startup and shutdown events."""
    logger.info(
        "Starting %s v%s (env=%s)",
        settings.SERVICE_NAME,
        __version__,
        settings.ENVIRONMENT,
    )

    # Initialize database
    await init_db()
    logger.info("Database connected (pool_size=%d)", settings.DATABASE_POOL_SIZE)

    # Initialize Redis
    await redis_client.connect()

    # Start RabbitMQ score consumer as background task
    consumer_task = None
    try:
        await score_consumer.start()
        logger.info("Score consumer started")
    except Exception as exc:
        logger.warning("Score consumer failed to start (non-fatal): %s", exc)

    yield

    # Shutdown
    await score_consumer.stop()
    await redis_client.disconnect()
    await close_db()
    logger.info("%s shutdown complete", settings.SERVICE_NAME)


app = FastAPI(
    title="Contest Service - Universal Contest Platform",
    description="REST API for contest management and real-time leaderboards with Redis.",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Exception Handlers ---

@app.exception_handler(ContestNotFoundError)
async def contest_not_found_handler(request: Request, exc: ContestNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": "Not Found", "message": exc.message,
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(AlreadyJoinedError)
async def already_joined_handler(request: Request, exc: AlreadyJoinedError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"error": "Conflict", "message": exc.message,
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(ContestFullError)
async def contest_full_handler(request: Request, exc: ContestFullError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"error": "Conflict", "message": exc.message,
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(ContestInactiveError)
async def contest_inactive_handler(request: Request, exc: ContestInactiveError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Bad Request", "message": exc.message,
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Bad Request", "message": exc.message,
                 "details": exc.errors,
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field, "message": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Validation Error", "message": "Request validation failed",
                 "details": errors,
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    logger.error("Database error: %s", exc.message)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error",
                 "message": "An internal error occurred. Please try again later.",
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error",
                 "message": "An unexpected error occurred.",
                 "timestamp": datetime.now(timezone.utc).isoformat()},
    )


# --- Register Routers ---
app.include_router(api_v1_router)
