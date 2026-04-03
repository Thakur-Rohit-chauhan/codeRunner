from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime
import inspect
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from integrated_platform.auth import (
    decode_token,
    extract_bearer_token,
    hash_password,
    issue_token,
    normalize_username,
    verify_password,
)
from integrated_platform.config import Settings, get_settings
from integrated_platform.database import create_database_engine, create_schema, create_session_factory, database_healthcheck
from integrated_platform.google_identity import verify_google_id_token
from integrated_platform.judges import preview_problem_submission
from integrated_platform.models import (
    Competition,
    Leaderboard,
    ProblemBookmark,
    Result,
    Submission,
    SubmissionLifecycle,
    SubmissionType,
    User,
    utcnow,
)
from integrated_platform.problem_catalog import get_problem, list_problem_topics, PROBLEM_CATALOG
from integrated_platform.queueing import RedisQueueManager
from integrated_platform.routing import routing_for_problem, routing_for_submission_type
from integrated_platform.schemas import (
    AuthEnvelope,
    CodeSubmissionRequest,
    CompetitionSummary,
    GoogleAuthConfigResponse,
    GoogleLoginRequest,
    HealthResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    LoginRequest,
    MLSubmissionRequest,
    PacketSubmissionRequest,
    ProblemBookmarkRequest,
    ProblemCatalogResponse,
    ProblemDetailResponse,
    ProblemRecord,
    ProblemRunRequest,
    RegisterRequest,
    SubmissionAcceptedResponse,
    SubmissionHistoryEntry,
    SubmissionHistoryResponse,
    SubmissionStatusResponse,
    UpdateProfileRequest,
    UserProfile,
    UserProfileDetail,
    UserProfileDetailResponse,
)
from integrated_platform.seeder import seed_platform_data


@dataclass(slots=True)
class SubmissionSnapshot:
    submission: Submission
    competition: Competition


class SubmissionOrchestrator:
    def __init__(
        self,
        *,
        settings: Settings,
        session_factory: async_sessionmaker,
        queue_manager: Any,
    ) -> None:
        self.settings = settings
        self.session_factory = session_factory
        self.queue_manager = queue_manager

    def _serialize_user(self, user: User) -> UserProfile:
        return UserProfile(
            id=user.id,
            username=user.username,
            email=user.email,
            displayName=user.display_name,
            role=user.role,
            isAdmin=user.role == "admin",
            rank=user.rank,
            rating=user.rating,
        )

    def _serialize_competition(self, competition: Competition) -> CompetitionSummary:
        return CompetitionSummary(
            id=competition.id,
            slug=competition.slug,
            title=competition.title,
            description=competition.description,
            mode=competition.mode,
            difficulty=competition.difficulty,
            maxScore=competition.max_score,
            isActive=competition.is_active,
        )

    async def _list_user_profiles(self, session) -> list[UserProfile]:
        users = (await session.scalars(select(User).where(User.is_active.is_(True)).order_by(User.username))).all()
        return [self._serialize_user(user) for user in users]

    async def build_auth_envelope(self, session, user: User) -> AuthEnvelope:
        return AuthEnvelope(
            user=self._serialize_user(user),
            token=issue_token(
                user_id=user.id,
                username=user.username,
                secret_key=self.settings.secret_key,
                ttl_seconds=self.settings.token_ttl_seconds,
            ),
            users=await self._list_user_profiles(session),
        )

    async def list_users(self) -> list[UserProfile]:
        async with self.session_factory() as session:
            return await self._list_user_profiles(session)

    async def login(self, payload: LoginRequest) -> AuthEnvelope:
        async with self.session_factory() as session:
            user = await session.scalar(select(User).where(func.lower(User.email) == payload.email.strip().lower()))
            if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            return await self.build_auth_envelope(session, user)

    async def register(self, payload: RegisterRequest) -> AuthEnvelope:
        username = normalize_username(payload.username or payload.email.split("@")[0])
        email = payload.email.strip().lower()
        if not username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required")

        async with self.session_factory() as session:
            existing_user = await session.scalar(
                select(User).where(
                    (func.lower(User.username) == username)
                    | (func.lower(User.email) == email)
                )
            )
            if existing_user:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

            user = User(
                id=str(uuid4()),
                username=username,
                email=email,
                password_hash=hash_password(payload.password),
                display_name=payload.displayName or username.replace("_", " ").title(),
                auth_provider="local",
                email_verified=False,
                role="user",
                rank="Novice",
                rating=1200,
            )
            session.add(user)
            await session.commit()
            return await self.build_auth_envelope(session, user)

    async def get_google_auth_config(self) -> GoogleAuthConfigResponse:
        client_id = self.settings.google_client_id.strip()
        return GoogleAuthConfigResponse(enabled=bool(client_id), clientId=client_id)

    async def _allocate_username(self, session, preferred: str, email: str) -> str:
        base_username = normalize_username(preferred or email.split("@")[0] or "google_user") or "google_user"
        candidate = base_username
        suffix = 1
        while True:
            existing = await session.scalar(select(User.id).where(func.lower(User.username) == candidate))
            if not existing:
                return candidate
            candidate = f"{base_username}_{suffix}"
            suffix += 1

    async def google_login(self, payload: GoogleLoginRequest) -> AuthEnvelope:
        client_id = self.settings.google_client_id.strip()
        if not client_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google sign-in is not configured on the server",
            )

        try:
            identity = await verify_google_id_token(payload.credential, client_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        async with self.session_factory() as session:
            user = await session.scalar(select(User).where(User.oauth_subject == identity.subject))
            if not user:
                user = await session.scalar(select(User).where(func.lower(User.email) == identity.email))

            if not user:
                username = await self._allocate_username(session, identity.email.split("@")[0], identity.email)
                user = User(
                    id=str(uuid4()),
                    username=username,
                    email=identity.email,
                    password_hash=hash_password(f"google:{identity.subject}"),
                    display_name=identity.display_name,
                    auth_provider="google",
                    oauth_subject=identity.subject,
                    email_verified=identity.email_verified,
                    role="user",
                    rank="Apprentice",
                    rating=1250,
                )
                session.add(user)
            else:
                if not user.is_active:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated")
                user.display_name = user.display_name or identity.display_name
                user.auth_provider = "google"
                user.oauth_subject = identity.subject
                user.email_verified = bool(identity.email_verified)
                user.updated_at = utcnow()

            await session.commit()
            return await self.build_auth_envelope(session, user)

    async def get_user_from_authorization(self, authorization: str | None) -> User:
        try:
            token = extract_bearer_token(authorization)
            payload = decode_token(token, self.settings.secret_key)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        async with self.session_factory() as session:
            user = await session.get(User, str(payload["sub"]))
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return user

    async def get_me(self, authorization: str | None) -> UserProfile:
        user = await self.get_user_from_authorization(authorization)
        return self._serialize_user(user)

    async def update_me(self, authorization: str | None, payload: UpdateProfileRequest) -> UserProfile:
        current_user = await self.get_user_from_authorization(authorization)
        async with self.session_factory() as session:
            user = await session.get(User, current_user.id)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            if payload.displayName:
                user.display_name = payload.displayName.strip()
                user.updated_at = utcnow()
            await session.commit()
            return self._serialize_user(user)

    async def set_user_admin_state(self, *, actor: User, username: str, is_admin: bool) -> dict[str, Any]:
        if actor.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required")

        normalized_username = normalize_username(username)
        if not normalized_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required")

        if normalized_username == "admin" and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The default admin account must remain an administrator",
            )

        async with self.session_factory() as session:
            user = await self._get_user_by_username(session, normalized_username)
            user.role = "admin" if is_admin else "user"
            user.updated_at = utcnow()
            await session.commit()
            users = await self._list_user_profiles(session)
            return {
                "user": self._serialize_user(user),
                "users": users,
            }

    async def deactivate_user(self, *, actor: User, username: str) -> dict[str, bool]:
        if actor.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required")

        normalized_username = normalize_username(username)
        if not normalized_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required")

        if normalized_username == "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The default admin cannot be deleted")

        async with self.session_factory() as session:
            user = await self._get_user_by_username(session, normalized_username)
            user.is_active = False
            user.updated_at = utcnow()
            await session.commit()
            return {"ok": True}

    async def list_competitions(self) -> list[CompetitionSummary]:
        async with self.session_factory() as session:
            competitions = (
                await session.scalars(select(Competition).where(Competition.is_active.is_(True)).order_by(Competition.id))
            ).all()
            return [self._serialize_competition(competition) for competition in competitions]

    async def _resolve_competition(self, session, competition_id: int, expected_mode: str) -> Competition:
        competition = await session.get(Competition, competition_id)
        if not competition or not competition.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found")
        if competition.mode != expected_mode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Competition {competition.title} expects {competition.mode} submissions",
            )
        return competition

    async def _get_user_by_username(self, session, username: str) -> User:
        normalized = normalize_username(username)
        user = await session.scalar(select(User).where(func.lower(User.username) == normalized))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    @staticmethod
    def _format_runtime(runtime_ms: int | None) -> str:
        runtime_ms = int(runtime_ms or 0)
        if runtime_ms <= 0:
            return "N/A"
        if runtime_ms < 1000:
            return f"{runtime_ms} ms"
        return f"{runtime_ms / 1000:.2f} s"

    @staticmethod
    def _format_memory(memory_kb: int | None) -> str:
        memory_kb = int(memory_kb or 0)
        if memory_kb <= 0:
            return "N/A"
        if memory_kb >= 1024 * 1024:
            return f"{memory_kb / (1024 * 1024):.2f} GB"
        if memory_kb >= 1024:
            return f"{memory_kb / 1024:.1f} MB"
        return f"{memory_kb} KB"

    @staticmethod
    def _display_submission_status(submission: Submission, result: Result | None) -> str:
        if submission.status == SubmissionLifecycle.ACCEPTED.value:
            return "Accepted"
        detail = f"{(result.stderr if result else '')} {submission.last_error or ''}".lower()
        if "time limit" in detail:
            return "Time Limit Exceeded"
        if "memory limit" in detail:
            return "Memory Limit Exceeded"
        if "wrong answer" in detail or "validation" in detail or "accuracy" in detail or "mean absolute error" in detail:
            return "Wrong Answer"
        if "compilation" in detail or "compiler" in detail:
            return "Compilation Error"
        if submission.status == SubmissionLifecycle.RUNNING.value:
            return "Running"
        if submission.status == SubmissionLifecycle.QUEUED.value:
            return "Queued"
        return "Runtime Error"

    @staticmethod
    def _display_outcome_status(outcome) -> str:
        if str(getattr(outcome, "status", "")).lower() == "completed":
            return "Finished"
        if outcome.passed:
            return "Accepted"
        detail = str(outcome.stderr or "").lower()
        if "time limit" in detail:
            return "Time Limit Exceeded"
        if "memory limit" in detail:
            return "Memory Limit Exceeded"
        if "wrong answer" in detail or "validation" in detail or "accuracy" in detail or "mean absolute error" in detail:
            return "Wrong Answer"
        if "compilation" in detail or "compiler" in detail:
            return "Compilation Error"
        return "Runtime Error"

    @staticmethod
    def _serialize_problem_record(
        problem: dict[str, Any],
        *,
        status_value: str | None = None,
        starred: bool = False,
        last_submitted=None,
    ) -> ProblemRecord:
        routing = routing_for_problem(problem)
        return ProblemRecord(
            id=int(problem["id"]),
            title=str(problem["title"]),
            domain=str(problem["domain"]),
            submissionType=routing.submission_type,
            queueName=routing.queue_name,
            workerPool=routing.worker_pool,
            judgeLabel=routing.judge_label,
            difficulty=str(problem["difficulty"]),
            acceptance=str(problem["acceptance"]),
            tags=[str(tag) for tag in problem.get("tags", [])],
            companies=[str(company) for company in problem.get("companies", [])],
            description=str(problem.get("description") or ""),
            examples=list(problem.get("examples") or []),
            constraints=[str(item) for item in problem.get("constraints", [])],
            starterCode={str(key): str(value) for key, value in (problem.get("starterCode") or {}).items()},
            testCases=list(problem.get("testCases") or []),
            status=status_value,
            starred=starred,
            lastSubmitted=last_submitted,
        )

    async def _load_user_submission_rows(self, session, user_id: str) -> list[tuple[Submission, Result | None]]:
        return (
            await session.execute(
                select(Submission, Result)
                .outerjoin(Result, Result.submission_id == Submission.id)
                .where(Submission.user_id == user_id)
                .order_by(Submission.created_at.desc())
            )
        ).all()

    async def _load_bookmarked_problem_ids(self, session, user_id: str) -> set[int]:
        bookmark_rows = (
            await session.scalars(
                select(ProblemBookmark.problem_id).where(ProblemBookmark.user_id == user_id)
            )
        ).all()
        return {int(problem_id) for problem_id in bookmark_rows}

    async def _build_problem_records_for_user(self, session, username: str | None) -> list[ProblemRecord]:
        if not username:
            return [self._serialize_problem_record(problem) for problem in PROBLEM_CATALOG]

        user = await self._get_user_by_username(session, username)
        rows = await self._load_user_submission_rows(session, user.id)
        bookmarked_problem_ids = await self._load_bookmarked_problem_ids(session, user.id)
        by_problem: dict[int, list[tuple[Submission, Result | None]]] = {}
        for submission, result in rows:
            payload = submission.payload or {}
            problem_id = payload.get("problem_id")
            if not isinstance(problem_id, int):
                continue
            by_problem.setdefault(problem_id, []).append((submission, result))

        records: list[ProblemRecord] = []
        for problem in PROBLEM_CATALOG:
            problem_id = int(problem["id"])
            submissions = by_problem.get(problem_id, [])
            status_value = None
            last_submitted = None
            if submissions:
                latest_submission, _ = submissions[0]
                last_submitted = latest_submission.completed_at or latest_submission.created_at
                if any(item.status == SubmissionLifecycle.ACCEPTED.value for item, _ in submissions):
                    status_value = "solved"
                else:
                    status_value = "attempted"
            records.append(
                self._serialize_problem_record(
                    problem,
                    status_value=status_value,
                    starred=problem_id in bookmarked_problem_ids,
                    last_submitted=last_submitted,
                )
            )
        return records

    async def _build_submission_history_for_user(self, session, username: str) -> list[SubmissionHistoryEntry]:
        user = await self._get_user_by_username(session, username)
        rows = await self._load_user_submission_rows(session, user.id)
        entries: list[SubmissionHistoryEntry] = []
        for submission, result in rows:
            payload = submission.payload or {}
            problem_id = payload.get("problem_id")
            if not isinstance(problem_id, int):
                continue
            problem = get_problem(problem_id)
            if not problem:
                continue
            metrics = result.metrics if result else {}
            total_cases = int(metrics.get("tests_total") or 0)
            passed_cases = int(metrics.get("tests_passed") or (total_cases if submission.status == SubmissionLifecycle.ACCEPTED.value else 0))
            expected_output = str(metrics.get("expected_output") or "")
            entries.append(
                SubmissionHistoryEntry(
                    id=submission.id,
                    problemId=problem_id,
                    problemTitle=str(problem["title"]),
                    domain=str(problem["domain"]),
                    status=self._display_submission_status(submission, result),
                    language=submission.language,
                    runtime=self._format_runtime(result.runtime_ms if result else 0),
                    memory=self._format_memory(result.memory_kb if result else 0),
                    stdout=result.stdout if result else "",
                    expected=expected_output,
                    stderr=result.stderr if result else (submission.last_error or ""),
                    allPassed=submission.status == SubmissionLifecycle.ACCEPTED.value,
                    passedCases=passed_cases,
                    totalCases=total_cases,
                    cases=[],
                    submittedAt=submission.completed_at or submission.created_at,
                )
            )
        return entries

    @staticmethod
    def _calculate_streak(submissions: list[SubmissionHistoryEntry]) -> int:
        active_days = sorted(
            {
                (submission.submittedAt.date()).isoformat()
                for submission in submissions
                if submission.submittedAt is not None
            }
        )
        if not active_days:
            return 0

        best = 0
        current = 0
        previous = None
        for current_day in active_days:
            current_date = current_day
            if previous is None:
                current = 1
            else:
                previous_dt = datetime.fromisoformat(previous)
                current_dt = datetime.fromisoformat(current_date)
                current = current + 1 if (current_dt - previous_dt).days == 1 else 1
            best = max(best, current)
            previous = current_date
        return best

    async def get_problem_catalog(self, username: str | None = None) -> ProblemCatalogResponse:
        async with self.session_factory() as session:
            return ProblemCatalogResponse(
                problems=await self._build_problem_records_for_user(session, username),
                topics=list_problem_topics(),
            )

    async def get_problem_detail(self, problem_id: int, username: str | None = None) -> ProblemDetailResponse:
        problem = get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        async with self.session_factory() as session:
            if username:
                records = await self._build_problem_records_for_user(session, username)
                selected = next((record for record in records if record.id == problem_id), None)
                if selected:
                    return ProblemDetailResponse(problem=selected)
            return ProblemDetailResponse(problem=self._serialize_problem_record(problem))

    async def get_user_submission_history(self, username: str) -> SubmissionHistoryResponse:
        async with self.session_factory() as session:
            return SubmissionHistoryResponse(
                submissions=await self._build_submission_history_for_user(session, username),
            )

    async def update_problem_bookmark(
        self,
        problem_id: int,
        payload: ProblemBookmarkRequest,
        current_user: User,
    ) -> ProblemDetailResponse:
        problem = get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        if payload.username and normalize_username(payload.username) != normalize_username(current_user.username):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify another user's bookmarks")

        async with self.session_factory() as session:
            existing = await session.scalar(
                select(ProblemBookmark).where(
                    ProblemBookmark.user_id == current_user.id,
                    ProblemBookmark.problem_id == problem_id,
                )
            )
            if payload.starred:
                if not existing:
                    session.add(ProblemBookmark(user_id=current_user.id, problem_id=problem_id))
            elif existing:
                await session.delete(existing)

            await session.commit()

            records = await self._build_problem_records_for_user(session, current_user.username)
            selected = next((record for record in records if record.id == problem_id), None)
            if selected:
                return ProblemDetailResponse(problem=selected)

            return ProblemDetailResponse(problem=self._serialize_problem_record(problem, starred=payload.starred))

    async def get_user_profile(self, username: str) -> UserProfileDetailResponse:
        async with self.session_factory() as session:
            user = await self._get_user_by_username(session, username)
            problem_records = await self._build_problem_records_for_user(session, user.username)
            submissions = await self._build_submission_history_for_user(session, user.username)

            solved = [problem for problem in problem_records if problem.status == "solved"]
            accepted_submissions = [submission for submission in submissions if submission.allPassed]
            language_counts: dict[str, int] = {}
            for submission in accepted_submissions:
                label = str(submission.language or "python").title()
                language_counts[label] = language_counts.get(label, 0) + 1

            easy = sum(1 for problem in solved if problem.difficulty == "Easy")
            medium = sum(1 for problem in solved if problem.difficulty == "Medium")
            hard = sum(1 for problem in solved if problem.difficulty == "Hard")
            total_submissions = len(submissions)
            accepted_count = len(accepted_submissions)
            contest_rows = (
                await session.scalars(select(Leaderboard).where(Leaderboard.user_id == user.id))
            ).all()
            competition_count = len(contest_rows)
            total_users = int(await session.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0)
            better_ratings = int(
                await session.scalar(
                    select(func.count(User.id)).where(User.is_active.is_(True), User.rating > user.rating)
                ) or 0
            )
            global_ranking = better_ratings + 1 if total_users else 0
            top_percent = f"{((global_ranking / max(total_users, 1)) * 100):.1f}" if global_ranking else "0.0"

            profile = UserProfileDetail(
                id=user.id,
                username=user.username,
                email=user.email,
                displayName=user.display_name,
                role=user.role,
                isAdmin=user.role == "admin",
                rank=user.rank,
                rating=user.rating,
                globalRanking=global_ranking,
                solvedProblems=len(solved),
                totalProblems=len(problem_records),
                easy=easy,
                medium=medium,
                hard=hard,
                streak=self._calculate_streak(submissions),
                contests=competition_count,
                topPercent=top_percent,
                views=total_submissions,
                solutions=len(solved),
                discussions=0,
                reputation=accepted_count * 10,
                followers=0,
                following=0,
                languages=[
                    {"name": language, "count": count}
                    for language, count in sorted(language_counts.items(), key=lambda item: (-item[1], item[0]))
                ],
            )
            return UserProfileDetailResponse(user=profile)

    async def run_problem_preview(self, problem_id: int, payload: ProblemRunRequest) -> dict[str, Any]:
        outcome = await preview_problem_submission(
            problem_id=problem_id,
            source_text=payload.code,
            language=payload.language,
            custom_input=payload.input,
        )
        preview_mode = str(outcome.metrics.get("preview_mode") or "")
        verified = bool(outcome.metrics.get("verified", outcome.passed))
        return {
            "result": {
                "status": self._display_outcome_status(outcome),
                "stdout": outcome.stdout,
                "expected": str(outcome.metrics.get("expected_output") or ""),
                "stderr": outcome.stderr,
                "time": self._format_runtime(outcome.runtime_ms),
                "memory": self._format_memory(outcome.memory_kb),
                "allPassed": bool(outcome.passed and verified),
                "passedCases": int(outcome.metrics.get("tests_passed") or 0),
                "totalCases": int(outcome.metrics.get("tests_total") or 0),
                "cases": list(outcome.metrics.get("case_results") or []),
                "verified": verified,
                "previewMode": preview_mode,
                "notice": (
                    "Executed with custom input. Output is shown below, but correctness was not validated."
                    if preview_mode == "custom_execution" and not verified and not outcome.stderr
                    else ""
                ),
            }
        }

    async def submit_code(self, user: User, payload: CodeSubmissionRequest) -> SubmissionAcceptedResponse:
        return await self._submit(
            user=user,
            competition_id=payload.competition_id,
            submission_type=SubmissionType.CODE.value,
            language=payload.language,
            source_text=payload.source_code,
            payload_dict={
                "source_code": payload.source_code,
                "language": payload.language,
                "problem_id": payload.problem_id,
            },
        )

    async def submit_ml(self, user: User, payload: MLSubmissionRequest) -> SubmissionAcceptedResponse:
        if isinstance(payload.notebook_payload, str):
            notebook_payload = payload.notebook_payload
            payload_dict: dict[str, Any] = {"notebook_payload": payload.notebook_payload}
        else:
            notebook_payload = str(payload.notebook_payload)
            payload_dict = {"notebook_payload": payload.notebook_payload}
        if payload.entrypoint:
            payload_dict["entrypoint"] = payload.entrypoint
        if payload.problem_id:
            payload_dict["problem_id"] = payload.problem_id
        return await self._submit(
            user=user,
            competition_id=payload.competition_id,
            submission_type=SubmissionType.ML.value,
            language="python",
            source_text=notebook_payload,
            payload_dict=payload_dict,
        )

    async def submit_packet(self, user: User, payload: PacketSubmissionRequest) -> SubmissionAcceptedResponse:
        payload_dict = {"packet_script": payload.packet_script}
        if payload.topology:
            payload_dict["topology"] = payload.topology
        if payload.problem_id:
            payload_dict["problem_id"] = payload.problem_id
        return await self._submit(
            user=user,
            competition_id=payload.competition_id,
            submission_type=SubmissionType.PACKET.value,
            language="python",
            source_text=payload.packet_script,
            payload_dict=payload_dict,
        )

    async def _submit(
        self,
        *,
        user: User,
        competition_id: int,
        submission_type: str,
        language: str | None,
        source_text: str,
        payload_dict: dict[str, Any],
    ) -> SubmissionAcceptedResponse:
        async with self.session_factory() as session:
            competition = await self._resolve_competition(session, competition_id, submission_type)
            problem_id = payload_dict.get("problem_id")
            submission_route = routing_for_submission_type(submission_type)
            if problem_id is not None:
                problem = get_problem(int(problem_id))
                if not problem:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
                problem_route = routing_for_problem(problem)
                if problem_route.submission_type != submission_type:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Problem {problem_id} belongs to the {problem_route.domain} lane and "
                            f"must be judged by {problem_route.worker_pool}"
                        ),
                    )
                submission_route = problem_route
            submission = Submission(
                id=str(uuid4()),
                user_id=user.id,
                competition_id=competition.id,
                submission_type=submission_type,
                queue_name=submission_route.queue_name,
                language=language,
                source_text=source_text,
                payload=payload_dict,
                status=SubmissionLifecycle.QUEUED.value,
                max_attempts=self.settings.queue_retry_limit,
            )
            session.add(submission)
            await session.commit()

        try:
            await self.queue_manager.enqueue(
                submission_type,
                {
                    "submission_id": submission.id,
                    "competition_id": competition_id,
                    "submission_type": submission_type,
                    "user_id": user.id,
                    "max_attempts": submission.max_attempts,
                },
            )
        except Exception as exc:  # pragma: no cover
            async with self.session_factory() as session:
                db_submission = await session.get(Submission, submission.id)
                if db_submission:
                    db_submission.status = SubmissionLifecycle.FAILED.value
                    db_submission.completed_at = utcnow()
                    db_submission.updated_at = utcnow()
                    db_submission.worker_name = "queue-enqueue-failure"
                    db_submission.last_error = "Queue is unavailable"
                    await session.commit()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Queue is unavailable") from exc

        return SubmissionAcceptedResponse(
            submissionId=submission.id,
            competitionId=competition_id,
            submissionType=submission_type,
            queue=submission.queue_name,
            status=submission.status,
            maxAttempts=submission.max_attempts,
        )

    async def get_submission_status(self, submission_id: str, authorization: str | None) -> SubmissionStatusResponse:
        current_user = await self.get_user_from_authorization(authorization)
        async with self.session_factory() as session:
            submission = await session.get(Submission, submission_id)
            if not submission:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
            if current_user.role != "admin" and submission.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Submission does not belong to the current user")

            competition = await session.get(Competition, submission.competition_id)
            result = await session.scalar(select(Result).where(Result.submission_id == submission_id))
            return SubmissionStatusResponse(
                submissionId=submission.id,
                competitionId=submission.competition_id,
                competitionTitle=competition.title if competition else "Unknown competition",
                userId=submission.user_id,
                submissionType=submission.submission_type,
                queue=submission.queue_name,
                status=submission.status,
                language=submission.language,
                score=result.score if result else submission.score,
                attemptCount=submission.attempt_count,
                maxAttempts=submission.max_attempts,
                lastError=submission.last_error,
                stdout=result.stdout if result else "",
                stderr=result.stderr if result else "",
                metrics=result.metrics if result else {},
                runtimeMs=result.runtime_ms if result else 0,
                memoryKb=result.memory_kb if result else 0,
                worker=result.judged_by if result else submission.worker_name,
                createdAt=submission.created_at,
                startedAt=submission.started_at,
                completedAt=submission.completed_at,
            )

    async def get_leaderboard(self, competition_id: int, limit: int = 20) -> LeaderboardResponse:
        async with self.session_factory() as session:
            competition = await session.get(Competition, competition_id)
            if not competition:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found")

            try:
                redis_rows = await self.queue_manager.fetch_leaderboard(competition_id, limit)
            except Exception:  # pragma: no cover - DB fallback remains the source of truth
                redis_rows = []
            if redis_rows:
                user_ids = [user_id for user_id, _ in redis_rows]
                board_rows = (
                    await session.execute(
                        select(Leaderboard, User)
                        .join(User, Leaderboard.user_id == User.id)
                        .where(Leaderboard.competition_id == competition_id, Leaderboard.user_id.in_(user_ids))
                    )
                ).all()
                board_map = {leaderboard.user_id: (leaderboard, user) for leaderboard, user in board_rows}
                entries = []
                for index, (user_id, score) in enumerate(redis_rows, start=1):
                    leaderboard_row, user = board_map.get(user_id, (None, None))
                    if not leaderboard_row or not user:
                        continue
                    entries.append(
                        LeaderboardEntry(
                            rank=index,
                            userId=user.id,
                            username=user.username,
                            displayName=user.display_name,
                            score=round(float(score), 2),
                            submissions=leaderboard_row.submissions_count,
                            accepted=leaderboard_row.accepted_count,
                            lastStatus=leaderboard_row.last_status,
                        )
                    )
            else:
                rows = (
                    await session.execute(
                        select(Leaderboard, User)
                        .join(User, Leaderboard.user_id == User.id)
                        .where(Leaderboard.competition_id == competition_id)
                        .order_by(Leaderboard.best_score.desc(), Leaderboard.updated_at.asc())
                        .limit(limit)
                    )
                ).all()
                entries = [
                    LeaderboardEntry(
                        rank=index,
                        userId=user.id,
                        username=user.username,
                        displayName=user.display_name,
                        score=round(float(leaderboard.best_score), 2),
                        submissions=leaderboard.submissions_count,
                        accepted=leaderboard.accepted_count,
                        lastStatus=leaderboard.last_status,
                    )
                    for index, (leaderboard, user) in enumerate(rows, start=1)
                ]

            participant_count = await session.scalar(
                select(func.count(Leaderboard.id)).where(Leaderboard.competition_id == competition_id)
            )
            return LeaderboardResponse(
                competitionId=competition.id,
                competitionTitle=competition.title,
                mode=competition.mode,
                entries=entries,
                totalParticipants=int(participant_count or 0),
            )

    async def bootstrap_leaderboards(self) -> None:
        async with self.session_factory() as session:
            competitions = (await session.scalars(select(Competition).order_by(Competition.id))).all()
            for competition in competitions:
                rows = (
                    await session.scalars(
                        select(Leaderboard)
                        .where(Leaderboard.competition_id == competition.id)
                        .order_by(Leaderboard.best_score.desc(), Leaderboard.updated_at.asc())
                    )
                ).all()
                await self.queue_manager.replace_leaderboard(
                    competition.id,
                    [(row.user_id, float(row.best_score)) for row in rows],
                )

    async def claim_submission_for_worker(self, submission_id: str, worker_name: str) -> SubmissionSnapshot | None:
        async with self.session_factory() as session:
            submission = await session.get(Submission, submission_id)
            if not submission:
                return None
            if submission.status in {SubmissionLifecycle.ACCEPTED.value, SubmissionLifecycle.FAILED.value}:
                return None
            competition = await session.get(Competition, submission.competition_id)
            if not competition:
                return None
            submission.status = SubmissionLifecycle.RUNNING.value
            submission.attempt_count += 1
            submission.worker_name = worker_name
            submission.started_at = submission.started_at or utcnow()
            submission.updated_at = utcnow()
            await session.commit()
            return SubmissionSnapshot(submission=submission, competition=competition)

    async def requeue_submission(self, *, submission_id: str, worker_name: str, last_error: str) -> None:
        async with self.session_factory() as session:
            submission = await session.get(Submission, submission_id)
            if not submission:
                return
            submission.status = SubmissionLifecycle.QUEUED.value
            submission.worker_name = worker_name
            submission.last_error = last_error
            submission.completed_at = None
            submission.updated_at = utcnow()
            await session.commit()

    async def complete_submission(
        self,
        *,
        submission_id: str,
        worker_name: str,
        outcome_status: str,
        score: float,
        stdout: str,
        stderr: str,
        metrics: dict[str, Any],
        runtime_ms: int,
        memory_kb: int,
        passed: bool,
    ) -> None:
        async with self.session_factory() as session:
            submission = await session.get(Submission, submission_id)
            if not submission:
                return

            submission.status = outcome_status
            submission.score = score
            submission.worker_name = worker_name
            submission.completed_at = utcnow()
            submission.updated_at = utcnow()
            submission.last_error = None if passed else (stderr.strip() or submission.last_error)

            result = await session.scalar(select(Result).where(Result.submission_id == submission_id))
            if not result:
                result = Result(
                    submission_id=submission.id,
                    competition_id=submission.competition_id,
                    user_id=submission.user_id,
                    status=outcome_status,
                    score=score,
                    stdout=stdout,
                    stderr=stderr,
                    metrics=metrics,
                    runtime_ms=runtime_ms,
                    memory_kb=memory_kb,
                    judged_by=worker_name,
                    judged_at=utcnow(),
                )
                session.add(result)
            else:
                result.status = outcome_status
                result.score = score
                result.stdout = stdout
                result.stderr = stderr
                result.metrics = metrics
                result.runtime_ms = runtime_ms
                result.memory_kb = memory_kb
                result.judged_by = worker_name
                result.judged_at = utcnow()

            leaderboard = await session.scalar(
                select(Leaderboard).where(
                    Leaderboard.competition_id == submission.competition_id,
                    Leaderboard.user_id == submission.user_id,
                )
            )
            if not leaderboard:
                leaderboard = Leaderboard(
                    competition_id=submission.competition_id,
                    user_id=submission.user_id,
                    best_score=score if passed else 0.0,
                    submissions_count=1,
                    accepted_count=1 if passed else 0,
                    last_submission_id=submission.id,
                    last_status=outcome_status,
                    updated_at=utcnow(),
                )
                session.add(leaderboard)
            else:
                leaderboard.submissions_count += 1
                if passed:
                    leaderboard.accepted_count += 1
                    leaderboard.best_score = max(float(leaderboard.best_score), float(score))
                leaderboard.last_submission_id = submission.id
                leaderboard.last_status = outcome_status
                leaderboard.updated_at = utcnow()

            await session.commit()

        try:
            await self.queue_manager.upsert_leaderboard_score(
                submission.competition_id,
                submission.user_id,
                float(leaderboard.best_score),
            )
        except Exception:  # pragma: no cover - DB state is authoritative if Redis is degraded
            return


def create_app(
    *,
    settings_override: Settings | None = None,
    queue_manager_override: Any | None = None,
) -> FastAPI:
    settings = settings_override or get_settings()
    engine: AsyncEngine = create_database_engine(settings.database_url)
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

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.auto_create_schema:
            await create_schema(engine)
        if settings.seed_data_on_boot:
            await seed_platform_data(session_factory, settings)
        await orchestrator.bootstrap_leaderboards()
        app.state.settings = settings
        app.state.engine = engine
        app.state.queue_manager = queue_manager
        app.state.orchestrator = orchestrator
        yield
        await queue_manager.close()
        await engine.dispose()

    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def get_runtime(request: Request) -> SubmissionOrchestrator:
        return request.app.state.orchestrator

    async def get_current_user(
        authorization: str | None = Header(default=None),
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> User:
        return await runtime.get_user_from_authorization(authorization)

    async def collect_health() -> HealthResponse:
        checks: dict[str, str] = {}
        details: dict[str, Any] = {}

        database_ok, database_detail = await database_healthcheck(engine)
        checks["postgres"] = "ok" if database_ok else "error"
        if not database_ok:
            details["postgres"] = database_detail

        try:
            redis_ok = bool(await queue_manager.ping())
            checks["redis"] = "ok" if redis_ok else "error"
        except Exception as exc:  # pragma: no cover - runtime guard
            checks["redis"] = "error"
            details["redis"] = str(exc)

        if hasattr(queue_manager, "queue_depths"):
            try:
                queue_depths = queue_manager.queue_depths()
                details["queues"] = await queue_depths if inspect.isawaitable(queue_depths) else queue_depths
            except Exception as exc:  # pragma: no cover - best-effort observability
                details["queues"] = {"error": str(exc)}

        overall = "ok" if all(value == "ok" for value in checks.values()) else "degraded"
        return HealthResponse(status=overall, service="backend", checks=checks, details=details)

    unified_router = APIRouter()
    auth_router = APIRouter(prefix="/auth")
    problem_router = APIRouter(prefix="/problem")

    @unified_router.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return await collect_health()

    @unified_router.get("/ready", response_model=HealthResponse)
    async def ready() -> HealthResponse:
        response = await collect_health()
        if response.status != "ok":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=response.model_dump())
        return response

    @unified_router.post("/login", response_model=AuthEnvelope)
    async def login(payload: LoginRequest, runtime: SubmissionOrchestrator = Depends(get_runtime)) -> AuthEnvelope:
        return await runtime.login(payload)

    @unified_router.get("/competitions", response_model=list[CompetitionSummary])
    async def competitions(runtime: SubmissionOrchestrator = Depends(get_runtime)) -> list[CompetitionSummary]:
        return await runtime.list_competitions()

    @unified_router.post("/submit/code", response_model=SubmissionAcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
    async def submit_code(
        payload: CodeSubmissionRequest,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
        current_user: User = Depends(get_current_user),
    ) -> SubmissionAcceptedResponse:
        return await runtime.submit_code(current_user, payload)

    @unified_router.post("/submit/ml", response_model=SubmissionAcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
    async def submit_ml(
        payload: MLSubmissionRequest,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
        current_user: User = Depends(get_current_user),
    ) -> SubmissionAcceptedResponse:
        return await runtime.submit_ml(current_user, payload)

    @unified_router.post("/submit/packet", response_model=SubmissionAcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
    async def submit_packet(
        payload: PacketSubmissionRequest,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
        current_user: User = Depends(get_current_user),
    ) -> SubmissionAcceptedResponse:
        return await runtime.submit_packet(current_user, payload)

    @unified_router.get("/submission-status/{submission_id}", response_model=SubmissionStatusResponse)
    async def submission_status(
        submission_id: str,
        authorization: str | None = Header(default=None),
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> SubmissionStatusResponse:
        return await runtime.get_submission_status(submission_id, authorization)

    @unified_router.get("/leaderboard", response_model=LeaderboardResponse)
    async def leaderboard(
        competition_id: int,
        limit: int = 20,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> LeaderboardResponse:
        return await runtime.get_leaderboard(competition_id, limit)

    @unified_router.get("/users/{username}/profile", response_model=UserProfileDetailResponse)
    async def user_profile(
        username: str,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> UserProfileDetailResponse:
        return await runtime.get_user_profile(username)

    @problem_router.get("/problems", response_model=ProblemCatalogResponse)
    async def problems(
        username: str | None = None,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> ProblemCatalogResponse:
        return await runtime.get_problem_catalog(username)

    @problem_router.get("/problems/{problem_id}", response_model=ProblemDetailResponse)
    async def problem_detail(
        problem_id: int,
        username: str | None = None,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> ProblemDetailResponse:
        return await runtime.get_problem_detail(problem_id, username)

    @problem_router.get("/users/{username}/submissions", response_model=SubmissionHistoryResponse)
    async def user_submissions(
        username: str,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> SubmissionHistoryResponse:
        return await runtime.get_user_submission_history(username)

    @problem_router.post("/problems/{problem_id}/bookmark", response_model=ProblemDetailResponse)
    async def update_problem_bookmark(
        problem_id: int,
        payload: ProblemBookmarkRequest,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
        current_user: User = Depends(get_current_user),
    ) -> ProblemDetailResponse:
        return await runtime.update_problem_bookmark(problem_id, payload, current_user)

    @problem_router.post("/problems/{problem_id}/run")
    async def run_problem(
        problem_id: int,
        payload: ProblemRunRequest,
        runtime: SubmissionOrchestrator = Depends(get_runtime),
        current_user: User = Depends(get_current_user),
    ) -> dict[str, Any]:
        _ = current_user
        return await runtime.run_problem_preview(problem_id, payload)

    @auth_router.get("/users", response_model=dict[str, list[UserProfile]])
    async def users(runtime: SubmissionOrchestrator = Depends(get_runtime)) -> dict[str, list[UserProfile]]:
        return {"users": await runtime.list_users()}

    @auth_router.post("/register", response_model=AuthEnvelope)
    async def register(payload: RegisterRequest, runtime: SubmissionOrchestrator = Depends(get_runtime)) -> AuthEnvelope:
        return await runtime.register(payload)

    @auth_router.post("/login", response_model=AuthEnvelope)
    async def login_auth(payload: LoginRequest, runtime: SubmissionOrchestrator = Depends(get_runtime)) -> AuthEnvelope:
        return await runtime.login(payload)

    @auth_router.get("/google-config", response_model=GoogleAuthConfigResponse)
    async def google_config(runtime: SubmissionOrchestrator = Depends(get_runtime)) -> GoogleAuthConfigResponse:
        return await runtime.get_google_auth_config()

    @auth_router.post("/google-login", response_model=AuthEnvelope)
    async def google_login(payload: GoogleLoginRequest, runtime: SubmissionOrchestrator = Depends(get_runtime)) -> AuthEnvelope:
        return await runtime.google_login(payload)

    @auth_router.get("/me", response_model=dict[str, UserProfile])
    async def me(
        authorization: str | None = Header(default=None),
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> dict[str, UserProfile]:
        return {"user": await runtime.get_me(authorization)}

    @auth_router.patch("/me", response_model=dict[str, UserProfile])
    async def patch_me(
        payload: UpdateProfileRequest,
        authorization: str | None = Header(default=None),
        runtime: SubmissionOrchestrator = Depends(get_runtime),
    ) -> dict[str, UserProfile]:
        return {"user": await runtime.update_me(authorization, payload)}

    @auth_router.post("/logout")
    async def logout() -> dict[str, bool]:
        return {"ok": True}

    for prefix in ("", settings.api_prefix):
        app.include_router(unified_router, prefix=prefix)
        app.include_router(auth_router, prefix=prefix)
        app.include_router(problem_router, prefix=prefix)

    return app


app = create_app()
