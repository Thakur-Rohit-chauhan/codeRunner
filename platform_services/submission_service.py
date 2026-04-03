from __future__ import annotations

from fastapi import APIRouter, Depends, FastAPI, Request

from integrated_platform.models import User
from integrated_platform.schemas import (
    CodeSubmissionRequest,
    HealthResponse,
    MLSubmissionRequest,
    PacketSubmissionRequest,
    SubmissionAcceptedResponse,
    SubmissionStatusResponse,
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

    @router.get("/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        return await collect_health(request.app.state.service_runtime)

    @router.get("/ready", response_model=HealthResponse)
    async def ready(request: Request) -> HealthResponse:
        return await ready_or_503(request.app.state.service_runtime)

    @router.post("/submit/code", response_model=SubmissionAcceptedResponse, status_code=202)
    async def submit_code(
        payload: CodeSubmissionRequest,
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> SubmissionAcceptedResponse:
        return await runtime.submit_code(current_user, payload)

    @router.post("/submit/ml", response_model=SubmissionAcceptedResponse, status_code=202)
    async def submit_ml(
        payload: MLSubmissionRequest,
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> SubmissionAcceptedResponse:
        return await runtime.submit_ml(current_user, payload)

    @router.post("/submit/packet", response_model=SubmissionAcceptedResponse, status_code=202)
    async def submit_packet(
        payload: PacketSubmissionRequest,
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> SubmissionAcceptedResponse:
        return await runtime.submit_packet(current_user, payload)

    @router.get("/submission-status/{submission_id}", response_model=SubmissionStatusResponse)
    async def submission_status(
        submission_id: str,
        request: Request,
        runtime=Depends(get_service_orchestrator),
    ) -> SubmissionStatusResponse:
        authorization = request.headers.get("Authorization")
        return await runtime.get_submission_status(submission_id, authorization)

    include_router_for_prefixes(app, router)


app = create_service_app(
    title="Platform Submission Service",
    service_name="submission-service",
    register_routes=register_routes,
    bootstrap_leaderboards=True,
)
