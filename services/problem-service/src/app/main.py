"""FastAPI application entry point for Problem Service.

Configures lifespan events (database init/close, gRPC server),
exception handlers, CORS middleware, and router registration.

Phase 3: Runs both FastAPI REST (port 8001) and gRPC (port 50051)
from the same async event loop.
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from datetime import datetime, timezone
import asyncio

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.v1.router import api_v1_router
from app.config import settings
from app.database import init_db, close_db
from app.exceptions import (
    ProblemServiceError,
    ProblemNotFoundError,
    DuplicateTitleError,
    ValidationError,
    DatabaseError,
)
from app.logger import setup_logging, get_logger

# Initialize logging before anything else
setup_logging()
logger = get_logger(__name__)

# Global references for gRPC cleanup
_grpc_server = None
_grpc_task = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan managing startup and shutdown events.

    Startup: initializes database tables, starts gRPC server.
    Shutdown: stops gRPC server, closes database connections.
    """
    global _grpc_server, _grpc_task

    logger.info(
        "Starting %s v%s (env=%s)",
        settings.SERVICE_NAME,
        __version__,
        settings.ENVIRONMENT,
    )

    # Initialize database (creates tables for Problem + TestCase)
    await init_db()
    logger.info(
        "Database connected (pool_size=%d)", settings.DATABASE_POOL_SIZE
    )

    # Start gRPC server in background task
    from app.grpc_server.server import GrpcServer
    from app.grpc_server.servicer import ProblemServicer

    servicer = ProblemServicer()
    _grpc_server = GrpcServer(
        host=settings.GRPC_HOST,
        port=settings.GRPC_PORT,
    )
    _grpc_task = asyncio.create_task(_grpc_server.start(servicer))

    logger.info("FastAPI running on :%d", settings.SERVICE_PORT)
    logger.info("gRPC running on :%d", settings.GRPC_PORT)

    yield

    # Shutdown
    logger.info("Shutting down %s...", settings.SERVICE_NAME)

    # Stop gRPC server
    if _grpc_server:
        await _grpc_server.stop()

    # Cancel gRPC background task
    if _grpc_task:
        _grpc_task.cancel()
        try:
            await _grpc_task
        except asyncio.CancelledError:
            pass

    await close_db()
    logger.info("%s shutdown complete", settings.SERVICE_NAME)


app = FastAPI(
    title="Problem Service - Universal Contest Platform",
    description="REST API for managing DSA, ML, and Cybersecurity challenge problems.",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Exception Handlers ---


@app.exception_handler(ProblemNotFoundError)
async def problem_not_found_handler(
    request: Request, exc: ProblemNotFoundError
) -> JSONResponse:
    """Handle 404 Not Found for missing problems."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Not Found",
            "message": exc.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(DuplicateTitleError)
async def duplicate_title_handler(
    request: Request, exc: DuplicateTitleError
) -> JSONResponse:
    """Handle 409 Conflict for duplicate titles."""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "error": "Conflict",
            "message": exc.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle 400 Bad Request for custom validation errors."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Bad Request",
            "message": exc.message,
            "details": exc.errors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle 400 Bad Request for Pydantic/FastAPI validation errors.

    Transforms Pydantic error details into a user-friendly format.
    """
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field, "message": error["msg"]})

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation Error",
            "message": "Request validation failed",
            "details": errors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(DatabaseError)
async def database_error_handler(
    request: Request, exc: DatabaseError
) -> JSONResponse:
    """Handle 500 Internal Server Error for database failures."""
    logger.error("Database error: %s", exc.message)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An internal error occurred. Please try again later.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# --- Register Routers ---
app.include_router(api_v1_router)
