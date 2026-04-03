from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, FastAPI, Request

from integrated_platform.models import User
from integrated_platform.schemas import (
    HealthResponse,
    ProblemBookmarkRequest,
    ProblemCatalogResponse,
    ProblemDetailResponse,
    ProblemRunRequest,
    SubmissionHistoryResponse,
)
from platform_services.common import (
    collect_health,
    create_service_app,
    get_current_user,
    get_service_orchestrator,
    include_router_for_prefixes,
    ready_or_503,
)


def register_routes(app: FastAPI) -> None:
    router = APIRouter()
    problem_router = APIRouter(prefix="/problem")

    @router.get("/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        return await collect_health(request.app.state.service_runtime)

    @router.get("/ready", response_model=HealthResponse)
    async def ready(request: Request) -> HealthResponse:
        return await ready_or_503(request.app.state.service_runtime)

    @problem_router.get("/problems", response_model=ProblemCatalogResponse)
    async def problems(
        username: str | None = None,
        runtime=Depends(get_service_orchestrator),
    ) -> ProblemCatalogResponse:
        return await runtime.get_problem_catalog(username)

    @problem_router.get("/problems/{problem_id}", response_model=ProblemDetailResponse)
    async def problem_detail(
        problem_id: int,
        username: str | None = None,
        runtime=Depends(get_service_orchestrator),
    ) -> ProblemDetailResponse:
        return await runtime.get_problem_detail(problem_id, username)

    @problem_router.get("/users/{username}/submissions", response_model=SubmissionHistoryResponse)
    async def user_submissions(
        username: str,
        runtime=Depends(get_service_orchestrator),
    ) -> SubmissionHistoryResponse:
        return await runtime.get_user_submission_history(username)

    @problem_router.post("/problems/{problem_id}/bookmark", response_model=ProblemDetailResponse)
    async def update_problem_bookmark(
        problem_id: int,
        payload: ProblemBookmarkRequest,
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> ProblemDetailResponse:
        return await runtime.update_problem_bookmark(problem_id, payload, current_user)

    @problem_router.post("/problems/{problem_id}/run")
    async def run_problem(
        problem_id: int,
        payload: ProblemRunRequest,
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> dict[str, Any]:
        _ = current_user
        return await runtime.run_problem_preview(problem_id, payload)

    include_router_for_prefixes(app, router)
    include_router_for_prefixes(app, problem_router)


app = create_service_app(
    title="Platform Problem Service",
    service_name="problem-service",
    register_routes=register_routes,
    bootstrap_leaderboards=False,
)
