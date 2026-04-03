from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, FastAPI, Request

from integrated_platform.models import User
from integrated_platform.schemas import (
    AuthEnvelope,
    GoogleAuthConfigResponse,
    GoogleLoginRequest,
    HealthResponse,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserProfile,
)
from platform_services.common import (
    collect_health,
    create_service_app,
    get_current_user,
    get_service_orchestrator,
    get_service_runtime,
    include_router_for_prefixes,
    ready_or_503,
)


def register_routes(app: FastAPI) -> None:
    router = APIRouter()
    auth_router = APIRouter(prefix="/auth")

    @router.get("/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        return await collect_health(request.app.state.service_runtime)

    @router.get("/ready", response_model=HealthResponse)
    async def ready(request: Request) -> HealthResponse:
        return await ready_or_503(request.app.state.service_runtime)

    @router.post("/login", response_model=AuthEnvelope)
    async def login(payload: LoginRequest, runtime=Depends(get_service_orchestrator)) -> AuthEnvelope:
        return await runtime.login(payload)

    @auth_router.get("/users", response_model=dict[str, list[UserProfile]])
    async def users(runtime=Depends(get_service_orchestrator)) -> dict[str, list[UserProfile]]:
        return {"users": await runtime.list_users()}

    @auth_router.post("/register", response_model=AuthEnvelope)
    async def register(payload: RegisterRequest, runtime=Depends(get_service_orchestrator)) -> AuthEnvelope:
        return await runtime.register(payload)

    @auth_router.post("/login", response_model=AuthEnvelope)
    async def login_auth(payload: LoginRequest, runtime=Depends(get_service_orchestrator)) -> AuthEnvelope:
        return await runtime.login(payload)

    @auth_router.get("/google-config", response_model=GoogleAuthConfigResponse)
    async def google_config(runtime=Depends(get_service_orchestrator)) -> GoogleAuthConfigResponse:
        return await runtime.get_google_auth_config()

    @auth_router.post("/google-login", response_model=AuthEnvelope)
    async def google_login(payload: GoogleLoginRequest, runtime=Depends(get_service_orchestrator)) -> AuthEnvelope:
        return await runtime.google_login(payload)

    @auth_router.get("/me", response_model=dict[str, UserProfile])
    async def me(request: Request, runtime=Depends(get_service_orchestrator)) -> dict[str, UserProfile]:
        authorization = request.headers.get("Authorization")
        return {"user": await runtime.get_me(authorization)}

    @auth_router.patch("/me", response_model=dict[str, UserProfile])
    async def patch_me(
        payload: UpdateProfileRequest,
        request: Request,
        runtime=Depends(get_service_orchestrator),
    ) -> dict[str, UserProfile]:
        authorization = request.headers.get("Authorization")
        return {"user": await runtime.update_me(authorization, payload)}

    @auth_router.patch("/users/{username}")
    async def patch_user_admin_state(
        username: str,
        payload: dict[str, Any],
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> dict[str, Any]:
        return await runtime.set_user_admin_state(
            actor=current_user,
            username=username,
            is_admin=bool(payload.get("isAdmin")),
        )

    @auth_router.delete("/users/{username}")
    async def delete_user(
        username: str,
        runtime=Depends(get_service_orchestrator),
        current_user: User = Depends(get_current_user),
    ) -> dict[str, bool]:
        return await runtime.deactivate_user(actor=current_user, username=username)

    @auth_router.post("/logout")
    async def logout() -> dict[str, bool]:
        return {"ok": True}

    include_router_for_prefixes(app, router)
    include_router_for_prefixes(app, auth_router)


app = create_service_app(
    title="Platform Auth Service",
    service_name="auth-service",
    register_routes=register_routes,
    bootstrap_leaderboards=False,
)
