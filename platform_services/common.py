from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
import inspect
from typing import Any, Callable

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from integrated_platform.config import Settings, get_settings
from integrated_platform.database import create_database_engine, create_schema, create_session_factory, database_healthcheck
from integrated_platform.models import User
from integrated_platform.queueing import RedisQueueManager
from integrated_platform.schemas import HealthResponse
from integrated_platform.seeder import seed_platform_data
from orchestrator import SubmissionOrchestrator


@dataclass(slots=True)
class ServiceRuntime:
    service_name: str
    settings: Settings
    engine: AsyncEngine
    session_factory: async_sessionmaker
    queue_manager: Any
    orchestrator: SubmissionOrchestrator


def build_runtime(
    *,
    service_name: str,
    settings_override: Settings | None = None,
    queue_manager_override: Any | None = None,
) -> ServiceRuntime:
    settings = settings_override or get_settings()
    engine = create_database_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    queue_manager = queue_manager_override or RedisQueueManager(
        settings.redis_url,
        retry_limit=settings.queue_retry_limit,
        retry_base_delay_seconds=settings.queue_retry_base_delay_seconds,
        retry_max_delay_seconds=settings.queue_retry_max_delay_seconds,
    )
    orchestrator = SubmissionOrchestrator(
        settings=settings,
        session_factory=session_factory,
        queue_manager=queue_manager,
    )
    return ServiceRuntime(
        service_name=service_name,
        settings=settings,
        engine=engine,
        session_factory=session_factory,
        queue_manager=queue_manager,
        orchestrator=orchestrator,
    )


def include_router_for_prefixes(app: FastAPI, router, prefixes: tuple[str, ...] = ("", "/api")) -> None:
    for prefix in prefixes:
        app.include_router(router, prefix=prefix)


async def get_service_runtime(request: Request) -> ServiceRuntime:
    return request.app.state.service_runtime


async def get_service_orchestrator(request: Request) -> SubmissionOrchestrator:
    return request.app.state.service_runtime.orchestrator


async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> User:
    runtime: ServiceRuntime = request.app.state.service_runtime
    return await runtime.orchestrator.get_user_from_authorization(authorization)


async def collect_health(runtime: ServiceRuntime) -> HealthResponse:
    checks: dict[str, str] = {}
    details: dict[str, Any] = {}

    database_ok, database_detail = await database_healthcheck(runtime.engine)
    checks["postgres"] = "ok" if database_ok else "error"
    if not database_ok:
        details["postgres"] = database_detail

    try:
        redis_ok = bool(await runtime.queue_manager.ping())
        checks["redis"] = "ok" if redis_ok else "error"
    except Exception as exc:  # pragma: no cover - runtime guard
        checks["redis"] = "error"
        details["redis"] = str(exc)

    if hasattr(runtime.queue_manager, "queue_depths"):
        try:
            queue_depths = runtime.queue_manager.queue_depths()
            details["queues"] = await queue_depths if inspect.isawaitable(queue_depths) else queue_depths
        except Exception as exc:  # pragma: no cover - best effort only
            details["queues"] = {"error": str(exc)}

    overall = "ok" if all(value == "ok" for value in checks.values()) else "degraded"
    return HealthResponse(status=overall, service=runtime.service_name, checks=checks, details=details)


def create_service_app(
    *,
    title: str,
    service_name: str,
    register_routes: Callable[[FastAPI], None],
    settings_override: Settings | None = None,
    queue_manager_override: Any | None = None,
    bootstrap_leaderboards: bool = False,
    seed_data_on_boot: bool = True,
) -> FastAPI:
    runtime = build_runtime(
        service_name=service_name,
        settings_override=settings_override,
        queue_manager_override=queue_manager_override,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if runtime.settings.auto_create_schema:
            await create_schema(runtime.engine)
        if seed_data_on_boot and runtime.settings.seed_data_on_boot:
            await seed_platform_data(runtime.session_factory, runtime.settings)
        if bootstrap_leaderboards:
            await runtime.orchestrator.bootstrap_leaderboards()

        app.state.service_runtime = runtime
        yield
        await runtime.queue_manager.close()
        await runtime.engine.dispose()

    app = FastAPI(title=title, version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=runtime.settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_routes(app)
    return app


async def ready_or_503(runtime: ServiceRuntime) -> HealthResponse:
    response = await collect_health(runtime)
    if response.status != "ok":
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=response.model_dump())
    return response
