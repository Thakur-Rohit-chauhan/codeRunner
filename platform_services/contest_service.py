from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from sqlalchemy import func, select

from integrated_platform.auth import normalize_username
from integrated_platform.models import Competition, Leaderboard, User, utcnow
from integrated_platform.problem_catalog import PROBLEM_CATALOG
from integrated_platform.schemas import CompetitionSummary, HealthResponse, LeaderboardResponse, UserProfileDetailResponse
from platform_services.common import (
    collect_health,
    create_service_app,
    get_current_user,
    get_service_orchestrator,
    include_router_for_prefixes,
    ready_or_503,
)


DOMAIN_BY_MODE = {
    "code": "DSA",
    "ml": "ML",
    "packet": "CTF",
}

MODE_BY_DOMAIN = {
    "DSA": "code",
    "ML": "ml",
    "CTF": "packet",
}

QUEUE_BY_MODE = {
    "code": "queue:code:ready",
    "ml": "queue:ml:ready",
    "packet": "queue:packet:ready",
}

TYPE_BY_MODE = {
    "code": "weekly",
    "ml": "special",
    "packet": "special",
}

DURATION_BY_MODE = {
    "code": 90,
    "ml": 120,
    "packet": 180,
}

RANKING_BY_MODE = {
    "code": "score",
    "ml": "accuracy",
    "packet": "score",
}

DEFAULT_TAGS = {
    "DSA": ["Algorithms", "Practice"],
    "ML": ["Machine Learning", "Benchmark"],
    "CTF": ["Security", "Packet Lab"],
}

DEFAULT_PRIZES = {
    "DSA": ["500 CR Coins", "250 CR Coins", "100 CR Coins"],
    "ML": ["1500 CR Coins", "750 CR Coins", "300 CR Coins"],
    "CTF": ["2000 CR Coins", "1000 CR Coins", "500 CR Coins"],
}

DEFAULT_PROBLEM_IDS = {
    "DSA": [int(problem["id"]) for problem in PROBLEM_CATALOG if problem["domain"] == "DSA"][:4],
    "ML": [int(problem["id"]) for problem in PROBLEM_CATALOG if problem["domain"] == "ML"][:2],
    "CTF": [int(problem["id"]) for problem in PROBLEM_CATALOG if problem["domain"] == "CTF"][:3],
}


def _slugify(value: str) -> str:
    normalized = "".join(char.lower() if char.isalnum() else "-" for char in value.strip())
    compact = "-".join(filter(None, normalized.split("-")))
    return compact or f"contest-{uuid4().hex[:8]}"


def _domain_for_mode(mode: str) -> str:
    return DOMAIN_BY_MODE.get(mode, "DSA")


def _normalize_contest_id(contest_id: str) -> str:
    return contest_id.removeprefix("contest-").strip()


def _coerce_problem_ids(value: Any, domain: str) -> list[int]:
    if isinstance(value, list):
        ids = []
        for item in value:
            try:
                ids.append(int(item))
            except (TypeError, ValueError):
                continue
        if ids:
            return ids
    return list(DEFAULT_PROBLEM_IDS.get(domain, []))


def _default_ui_state(competition: Competition) -> dict[str, Any]:
    domain = _domain_for_mode(competition.mode)
    ui_state = dict(competition.ui_state or {})
    return {
        "status": ui_state.get("status", "active"),
        "startTime": ui_state.get("startTime") or (competition.created_at.isoformat() if competition.created_at else utcnow().isoformat()),
        "duration": int(ui_state.get("duration") or DURATION_BY_MODE.get(competition.mode, 90)),
        "type": ui_state.get("type") or TYPE_BY_MODE.get(competition.mode, "special"),
        "ranking": ui_state.get("ranking") or RANKING_BY_MODE.get(competition.mode, "score"),
        "problemIds": _coerce_problem_ids(ui_state.get("problemIds"), domain),
        "featured": bool(ui_state.get("featured", competition.mode != "code")),
        "tags": list(ui_state.get("tags") or DEFAULT_TAGS.get(domain, [])),
        "prizes": list(ui_state.get("prizes") or DEFAULT_PRIZES.get(domain, [])),
        "createdBy": ui_state.get("createdBy") or "system",
        "visibility": ui_state.get("visibility") or "public",
    }


def _frontend_leaderboard_rows(payload: LeaderboardResponse, competition: Competition) -> list[dict[str, Any]]:
    is_accuracy = competition.mode == "ml"
    denominator = max(float(competition.max_score or 100.0), 1.0)
    rows: list[dict[str, Any]] = []
    for entry in payload.entries:
        row: dict[str, Any] = {
            "rank": entry.rank,
            "name": entry.username,
            "country": "🌍",
            "time": "N/A",
            "timeSeconds": 0,
        }
        if is_accuracy:
            row["accuracy"] = round(float(entry.score) / denominator, 4)
            row["submissions"] = entry.submissions
        else:
            row["score"] = entry.score
            row["solved"] = entry.accepted
        rows.append(row)
    return rows


async def _build_contest_payload(runtime, competition: Competition) -> dict[str, Any]:
    ui_state = _default_ui_state(competition)
    leaderboard = await runtime.orchestrator.get_leaderboard(competition.id, limit=20)
    return {
        "id": competition.slug,
        "competitionId": competition.id,
        "slug": competition.slug,
        "title": competition.title,
        "domain": _domain_for_mode(competition.mode),
        "ranking": ui_state["ranking"],
        "type": ui_state["type"],
        "status": ui_state["status"],
        "startTime": ui_state["startTime"],
        "duration": ui_state["duration"],
        "participants": leaderboard.totalParticipants,
        "problemIds": ui_state["problemIds"],
        "difficulty": competition.difficulty.title(),
        "prizes": ui_state["prizes"],
        "tags": ui_state["tags"],
        "createdBy": ui_state["createdBy"],
        "description": competition.description,
        "featured": ui_state["featured"],
        "visibility": ui_state["visibility"],
        "leaderboard": _frontend_leaderboard_rows(leaderboard, competition),
    }


async def _resolve_competition(session, contest_id: str) -> Competition:
    normalized = _normalize_contest_id(contest_id)
    competition = None
    if normalized.isdigit():
        competition = await session.get(Competition, int(normalized))
    if not competition:
        competition = await session.scalar(select(Competition).where(Competition.slug == normalized))
    if not competition:
        competition = await session.scalar(select(Competition).where(Competition.slug == contest_id))
    if not competition or not competition.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    return competition


def _require_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required")


def register_routes(app: FastAPI) -> None:
    router = APIRouter()
    contest_router = APIRouter(prefix="/contest")

    @router.get("/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        return await collect_health(request.app.state.service_runtime)

    @router.get("/ready", response_model=HealthResponse)
    async def ready(request: Request) -> HealthResponse:
        return await ready_or_503(request.app.state.service_runtime)

    @router.get("/competitions", response_model=list[CompetitionSummary])
    async def competitions(runtime=Depends(get_service_orchestrator)) -> list[CompetitionSummary]:
        return await runtime.list_competitions()

    @router.get("/leaderboard", response_model=LeaderboardResponse)
    async def leaderboard(
        competition_id: int,
        limit: int = 20,
        runtime=Depends(get_service_orchestrator),
    ) -> LeaderboardResponse:
        return await runtime.get_leaderboard(competition_id, limit)

    @router.get("/users/{username}/profile", response_model=UserProfileDetailResponse)
    async def user_profile(username: str, runtime=Depends(get_service_orchestrator)) -> UserProfileDetailResponse:
        return await runtime.get_user_profile(username)

    @contest_router.get("/contests")
    async def contests(request: Request, runtime=Depends(get_service_orchestrator)) -> dict[str, list[dict[str, Any]]]:
        async with request.app.state.service_runtime.session_factory() as session:
            competitions = (
                await session.scalars(select(Competition).where(Competition.is_active.is_(True)).order_by(Competition.created_at.desc()))
            ).all()
        payload = [await _build_contest_payload(request.app.state.service_runtime, competition) for competition in competitions]
        return {"contests": payload}

    @contest_router.get("/contests/{contest_id}")
    async def contest_detail(contest_id: str, request: Request) -> dict[str, Any]:
        async with request.app.state.service_runtime.session_factory() as session:
            competition = await _resolve_competition(session, contest_id)
        return {"contest": await _build_contest_payload(request.app.state.service_runtime, competition)}

    @contest_router.post("/contests/{contest_id}/register")
    async def register_contest(contest_id: str, request: Request) -> dict[str, Any]:
        async with request.app.state.service_runtime.session_factory() as session:
            competition = await _resolve_competition(session, contest_id)
        return {"contest": await _build_contest_payload(request.app.state.service_runtime, competition)}

    @contest_router.post("/contests/{contest_id}/unregister")
    async def unregister_contest(contest_id: str, request: Request) -> dict[str, Any]:
        async with request.app.state.service_runtime.session_factory() as session:
            competition = await _resolve_competition(session, contest_id)
        return {"contest": await _build_contest_payload(request.app.state.service_runtime, competition)}

    @contest_router.post("/contests")
    async def create_contest(
        payload: dict[str, Any],
        request: Request,
        current_user: User = Depends(get_current_user),
    ) -> dict[str, Any]:
        _require_admin(current_user)
        title = str(payload.get("title") or "Untitled Contest").strip()
        domain = str(payload.get("domain") or "DSA").upper()
        mode = MODE_BY_DOMAIN.get(domain, "code")
        slug = _slugify(f"{title}-{uuid4().hex[:6]}")
        ui_state = {
            "status": "active",
            "startTime": payload.get("startTime") or utcnow().isoformat(),
            "duration": int(payload.get("duration") or DURATION_BY_MODE.get(mode, 90)),
            "type": payload.get("type") or TYPE_BY_MODE.get(mode, "special"),
            "ranking": payload.get("ranking") or RANKING_BY_MODE.get(mode, "score"),
            "problemIds": _coerce_problem_ids(payload.get("selectedProblems"), domain),
            "featured": bool(payload.get("featured", False)),
            "tags": list(payload.get("tags") or []),
            "prizes": [value for value in payload.get("prizes", []) if value],
            "createdBy": current_user.username,
            "visibility": payload.get("visibility") or "public",
        }

        async with request.app.state.service_runtime.session_factory() as session:
            competition = Competition(
                slug=slug,
                title=title,
                description=str(payload.get("description") or ""),
                mode=mode,
                difficulty=str(payload.get("difficulty") or "medium").lower(),
                max_score=100.0,
                queue_name=QUEUE_BY_MODE.get(mode, "queue:code:ready"),
                ui_state=ui_state,
            )
            session.add(competition)
            await session.commit()
            await session.refresh(competition)
        return {"contest": await _build_contest_payload(request.app.state.service_runtime, competition)}

    @contest_router.put("/contests/{contest_id}")
    async def update_contest(
        contest_id: str,
        payload: dict[str, Any],
        request: Request,
        current_user: User = Depends(get_current_user),
    ) -> dict[str, Any]:
        _require_admin(current_user)
        async with request.app.state.service_runtime.session_factory() as session:
            competition = await _resolve_competition(session, contest_id)
            ui_state = dict(competition.ui_state or {})

            if payload.get("title"):
                competition.title = str(payload["title"]).strip()
            if "description" in payload:
                competition.description = str(payload.get("description") or "")
            if payload.get("domain"):
                domain = str(payload["domain"]).upper()
                mode = MODE_BY_DOMAIN.get(domain, competition.mode)
                competition.mode = mode
                competition.queue_name = QUEUE_BY_MODE.get(mode, competition.queue_name)
            if payload.get("difficulty"):
                competition.difficulty = str(payload["difficulty"]).lower()

            for key in ("startTime", "duration", "type", "ranking", "featured", "visibility"):
                if key in payload:
                    ui_state[key] = payload.get(key)
            if "selectedProblems" in payload:
                ui_state["problemIds"] = _coerce_problem_ids(payload.get("selectedProblems"), _domain_for_mode(competition.mode))
            if "tags" in payload:
                tags = payload.get("tags")
                ui_state["tags"] = [tag.strip() for tag in tags.split(",")] if isinstance(tags, str) else list(tags or [])
            if "prizes" in payload:
                ui_state["prizes"] = [value for value in payload.get("prizes", []) if value]

            competition.ui_state = ui_state
            competition.updated_at = utcnow()
            await session.commit()
            await session.refresh(competition)
        return {"contest": await _build_contest_payload(request.app.state.service_runtime, competition)}

    @contest_router.delete("/contests/{contest_id}")
    async def delete_contest(
        contest_id: str,
        request: Request,
        current_user: User = Depends(get_current_user),
    ) -> dict[str, bool]:
        _require_admin(current_user)
        async with request.app.state.service_runtime.session_factory() as session:
            competition = await _resolve_competition(session, contest_id)
            competition.is_active = False
            competition.updated_at = utcnow()
            await session.commit()
        return {"ok": True}

    @contest_router.post("/contests/{contest_id}/results")
    async def record_results(
        contest_id: str,
        payload: dict[str, Any],
        request: Request,
    ) -> dict[str, Any]:
        runtime = request.app.state.service_runtime
        username = normalize_username(str(payload.get("name") or payload.get("username") or ""))
        if not username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Participant username is required")

        async with runtime.session_factory() as session:
            competition = await _resolve_competition(session, contest_id)
            user = await session.scalar(select(User).where(func.lower(User.username) == username, User.is_active.is_(True)))
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            if competition.mode == "ml":
                raw_accuracy = float(payload.get("accuracy") or 0.0)
                best_score = raw_accuracy * float(competition.max_score or 100.0)
                accepted_count = 1 if raw_accuracy > 0 else 0
                submissions_count = int(payload.get("submissions") or 1)
            else:
                best_score = float(payload.get("score") or 0.0)
                accepted_count = int(payload.get("solved") or 0)
                submissions_count = max(1, int(payload.get("submissions") or 1))

            row = await session.scalar(
                select(Leaderboard).where(
                    Leaderboard.competition_id == competition.id,
                    Leaderboard.user_id == user.id,
                )
            )
            if not row:
                row = Leaderboard(
                    competition_id=competition.id,
                    user_id=user.id,
                    best_score=best_score,
                    submissions_count=submissions_count,
                    accepted_count=accepted_count,
                    last_status="accepted" if best_score > 0 else "failed",
                    updated_at=utcnow(),
                )
                session.add(row)
            else:
                row.best_score = max(float(row.best_score), best_score)
                row.submissions_count = max(int(row.submissions_count), submissions_count)
                row.accepted_count = max(int(row.accepted_count), accepted_count)
                row.last_status = "accepted" if best_score > 0 else "failed"
                row.updated_at = utcnow()
            await session.commit()

        await runtime.queue_manager.upsert_leaderboard_score(competition.id, user.id, float(row.best_score))
        return {"contest": await _build_contest_payload(runtime, competition)}

    include_router_for_prefixes(app, router)
    include_router_for_prefixes(app, contest_router)


app = create_service_app(
    title="Platform Contest Service",
    service_name="contest-service",
    register_routes=register_routes,
    bootstrap_leaderboards=True,
)
