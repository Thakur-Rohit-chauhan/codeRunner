from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


SEED_PATH_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "problemSeed.json",
    Path(__file__).resolve().parents[1] / "data" / "problemSeed.json",
    Path("/app/src/data/problemSeed.json"),
]
SUBMISSION_SERVICE_URL = os.environ.get("SUBMISSION_SERVICE_URL", "http://127.0.0.1:8003")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://problem_user:secure_password_change_me@postgres:5432/problems_db")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_username(value: str = "") -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def normalize_tags(tags: list[str] | None) -> list[str]:
    return [str(tag).strip() for tag in (tags or []) if str(tag).strip()]


def normalize_constraints(constraints: list[str] | None) -> list[str]:
    return [str(constraint).strip() for constraint in (constraints or []) if str(constraint).strip()]


def normalize_examples(examples: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized = []
    for example in examples or []:
        if not isinstance(example, dict):
            continue
        normalized.append({
            "input": str(example.get("input") or "").strip(),
            "output": str(example.get("output") or "").strip(),
            "explanation": example.get("explanation"),
        })
    return normalized


def normalize_test_cases(test_cases: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized = []
    for case in test_cases or []:
        if not isinstance(case, dict):
            continue
        normalized.append({
            "input": str(case.get("input") or "").strip(),
            "expectedOutput": str(case.get("expectedOutput") or "").strip(),
        })
    return normalized


def load_seed() -> dict[str, Any]:
    for seed_path in SEED_PATH_CANDIDATES:
        if seed_path.exists():
            return json.loads(seed_path.read_text(encoding="utf-8"))
    return {"problems": []}


_seed_data = load_seed()
_seed_records = list(_seed_data.get("problems") or [])
_catalog = {str(problem["id"]): deepcopy(problem) for problem in _seed_records}
_catalog_order = [str(problem["id"]) for problem in _seed_records]
_topics = deepcopy(_seed_data.get("topics") or [])
_default_state = {
    problem_id: {
        "status": problem.get("defaultStatus"),
        "starred": bool(problem.get("defaultStarred")),
        "lastSubmitted": problem.get("defaultLastSubmitted"),
    }
    for problem_id, problem in _catalog.items()
}


def next_problem_id() -> int:
    numeric_ids = []
    for problem_id in _catalog.keys():
        try:
            numeric_ids.append(int(problem_id))
        except ValueError:
            continue
    return max(numeric_ids, default=0) + 1


def get_problem_or_404(problem_id: str) -> dict[str, Any]:
    problem = _catalog.get(str(problem_id))
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


def build_problem_state(problem_id: str) -> dict[str, Any]:
    state = _default_state.get(str(problem_id))
    return deepcopy(state or {"status": None, "starred": False, "lastSubmitted": None})


def ensure_user_state(username: str | None) -> dict[str, Any] | None:
    normalized = normalize_username(username or "")
    if not normalized:
        return None

    user_state = _user_state.get(normalized)
    if user_state is not None:
        return user_state

    state = {
        "problems": {problem_id: build_problem_state(problem_id) for problem_id in _catalog.keys()},
        "submissions": [],
    }
    _user_state[normalized] = state
    return state


def sync_user_problem_state(problem_id: str) -> None:
    for user_state in _user_state.values():
        user_state["problems"].setdefault(str(problem_id), build_problem_state(problem_id))


def remove_user_problem_state(problem_id: str) -> None:
    for user_state in _user_state.values():
        user_state["problems"].pop(str(problem_id), None)


def get_problem_state(problem_id: str, username: str | None) -> dict[str, Any]:
    user_state = ensure_user_state(username)
    if user_state is None:
        return build_problem_state(problem_id)
    return user_state["problems"].setdefault(str(problem_id), build_problem_state(problem_id))


def build_problem_summary(problem: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": problem["id"],
        "title": problem["title"],
        "domain": problem["domain"],
        "difficulty": problem["difficulty"],
        "acceptance": problem["acceptance"],
        "tags": deepcopy(problem.get("tags") or []),
        "status": state.get("status"),
        "starred": bool(state.get("starred")),
        "lastSubmitted": state.get("lastSubmitted"),
    }


def build_problem_detail(problem: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    return {
        **build_problem_summary(problem, state),
        "companies": deepcopy(problem.get("companies") or []),
        "description": problem.get("description") or "",
        "examples": deepcopy(problem.get("examples") or []),
        "constraints": deepcopy(problem.get("constraints") or []),
        "starterCode": deepcopy(problem.get("starterCode") or {}),
        "testCases": deepcopy(problem.get("testCases") or []),
    }


def list_user_submissions(username: str | None, problem_id: str | None = None) -> list[dict[str, Any]]:
    user_state = ensure_user_state(username)
    if user_state is None:
        return []

    submissions = user_state["submissions"]
    if problem_id is None:
        return deepcopy(submissions)
    return [deepcopy(item) for item in submissions if str(item.get("problemId")) == str(problem_id)]


def call_submission_service(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib_request.Request(
        url=f"{SUBMISSION_SERVICE_URL}{endpoint}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8") or "Submission service request failed"
        raise HTTPException(status_code=502, detail=detail) from exc
    except urllib_error.URLError as exc:
        raise HTTPException(status_code=503, detail="Submission service is unavailable") from exc


def build_submission_payload(problem: dict[str, Any], language: str | None, code: str | None, input_text: str | None = None) -> dict[str, Any]:
    return {
        "problem": {
            "id": problem["id"],
            "title": problem["title"],
            "domain": problem["domain"],
            "starterCode": deepcopy(problem.get("starterCode") or {}),
            "testCases": deepcopy(problem.get("testCases") or []),
        },
        "language": language or "python",
        "code": code or "",
        "input": input_text,
    }


def build_submission_record(problem: dict[str, Any], payload: "SubmitRequest", result: dict[str, Any], submitted_at: str) -> dict[str, Any]:
    cases = deepcopy(result.get("cases") or [])
    passed_cases = sum(1 for case in cases if case.get("status") == "Accepted")

    return {
        "id": f"{problem['id']}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "problemId": problem["id"],
        "problemTitle": problem["title"],
        "domain": problem["domain"],
        "status": result.get("status"),
        "language": payload.language or "python",
        "runtime": result.get("time"),
        "memory": result.get("memory"),
        "stdout": result.get("stdout") or "",
        "expected": result.get("expected") or "",
        "stderr": result.get("stderr") or None,
        "allPassed": bool(result.get("allPassed")),
        "passedCases": passed_cases,
        "totalCases": len(cases),
        "cases": cases,
        "submittedAt": submitted_at,
    }


def build_problem_record(problem_id: int | str, payload: "ProblemMutationRequest", existing: dict[str, Any] | None = None) -> dict[str, Any]:
    base = deepcopy(existing or {})
    title = (payload.title or base.get("title") or "").strip()
    domain = (payload.domain or base.get("domain") or "DSA").strip() or "DSA"
    difficulty = (payload.difficulty or base.get("difficulty") or "Medium").strip() or "Medium"

    if not title:
        raise HTTPException(status_code=400, detail="Problem title is required")

    starter_code = deepcopy(payload.starterCode) if payload.starterCode is not None else deepcopy(base.get("starterCode") or {})
    test_cases = normalize_test_cases(payload.testCases) if payload.testCases is not None else deepcopy(base.get("testCases") or [])
    examples = normalize_examples(payload.examples) if payload.examples is not None else deepcopy(base.get("examples") or [])
    constraints = normalize_constraints(payload.constraints) if payload.constraints is not None else deepcopy(base.get("constraints") or [])
    companies = [str(company).strip() for company in (payload.companies if payload.companies is not None else base.get("companies") or []) if str(company).strip()]

    if not test_cases:
        test_cases = [{"input": "sample input", "expectedOutput": "sample output"}]

    if not starter_code:
        starter_code = {}

    return {
        "id": existing.get("id") if existing else problem_id,
        "title": title,
        "domain": domain,
        "difficulty": difficulty,
        "acceptance": (payload.acceptance or base.get("acceptance") or "0.0%").strip() or "0.0%",
        "tags": normalize_tags(payload.tags) if payload.tags is not None else deepcopy(base.get("tags") or []),
        "description": payload.description if payload.description is not None else base.get("description") or "",
        "examples": examples,
        "constraints": constraints,
        "starterCode": starter_code,
        "testCases": test_cases,
        "companies": companies,
        "defaultStatus": base.get("defaultStatus"),
        "defaultStarred": bool(base.get("defaultStarred")),
        "defaultLastSubmitted": base.get("defaultLastSubmitted"),
    }


class BookmarkRequest(BaseModel):
    username: str
    starred: bool | None = None


class RunRequest(BaseModel):
    username: str | None = None
    language: str | None = None
    code: str | None = None
    input: str | None = None


class SubmitRequest(BaseModel):
    username: str
    language: str | None = None
    code: str | None = None


class ProblemMutationRequest(BaseModel):
    title: str | None = None
    domain: str | None = None
    difficulty: str | None = None
    acceptance: str | None = None
    tags: list[str] | None = None
    description: str | None = None
    examples: list[dict[str, Any]] | None = None
    constraints: list[str] | None = None
    starterCode: dict[str, str] | None = None
    testCases: list[dict[str, Any]] | None = None
    companies: list[str] | None = None


def normalize_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + url[len("postgresql+asyncpg://"):]
    return url


_db_pool: asyncpg.Pool | None = None


async def init_catalog_storage() -> None:
    global _db_pool, _catalog, _catalog_order, _default_state

    if _db_pool is not None:
        return

    _db_pool = await asyncpg.create_pool(
        dsn=normalize_database_url(DATABASE_URL),
        min_size=1,
        max_size=5,
    )

    async with _db_pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS problems_catalog (
                id INTEGER PRIMARY KEY,
                problem_json JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )

        rows = await conn.fetch(
            "SELECT id, problem_json FROM problems_catalog ORDER BY id ASC"
        )

        if not rows:
            if _seed_records:
                await conn.executemany(
                    """
                    INSERT INTO problems_catalog (id, problem_json, updated_at)
                    VALUES ($1, $2::jsonb, NOW())
                    ON CONFLICT (id) DO UPDATE
                    SET problem_json = EXCLUDED.problem_json, updated_at = NOW()
                    """,
                    [
                        (int(problem["id"]), json.dumps(problem))
                        for problem in _seed_records
                    ],
                )
            rows = await conn.fetch(
                "SELECT id, problem_json FROM problems_catalog ORDER BY id ASC"
            )

    _catalog = {}
    _catalog_order = []
    _default_state = {}

    for row in rows:
        raw_problem = row["problem_json"]
        if isinstance(raw_problem, str):
            problem = json.loads(raw_problem)
        elif isinstance(raw_problem, dict):
            problem = raw_problem
        else:
            problem = dict(raw_problem)
        problem_id = str(problem.get("id") or row["id"])
        problem["id"] = int(problem_id)
        _catalog[problem_id] = problem
        _catalog_order.append(problem_id)
        _default_state[problem_id] = {
            "status": problem.get("defaultStatus"),
            "starred": bool(problem.get("defaultStarred")),
            "lastSubmitted": problem.get("defaultLastSubmitted"),
        }


async def persist_problem(problem: dict[str, Any]) -> None:
    if _db_pool is None:
        return
    async with _db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO problems_catalog (id, problem_json, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE
            SET problem_json = EXCLUDED.problem_json, updated_at = NOW()
            """,
            int(problem["id"]),
            json.dumps(problem),
        )


async def remove_problem_from_storage(problem_id: str) -> None:
    if _db_pool is None:
        return
    async with _db_pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM problems_catalog WHERE id = $1",
            int(problem_id),
        )


app = FastAPI(title="Problem Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_lock = asyncio.Lock()
_user_state: dict[str, dict[str, Any]] = {}


@app.on_event("startup")
async def on_startup() -> None:
    await init_catalog_storage()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _db_pool
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "submissionServiceUrl": SUBMISSION_SERVICE_URL}


@app.get("/problems")
def list_problems(username: str | None = None) -> dict[str, Any]:
    problems = []
    for problem_id in _catalog_order:
        problem = _catalog[problem_id]
        state = get_problem_state(problem_id, username)
        problems.append(build_problem_summary(problem, state))

    return {
        "problems": problems,
        "topics": deepcopy(_topics),
    }


@app.get("/problems/{problem_id}")
def get_problem(problem_id: str, username: str | None = None) -> dict[str, Any]:
    problem = get_problem_or_404(problem_id)
    state = get_problem_state(str(problem["id"]), username)
    return {"problem": build_problem_detail(problem, state)}


@app.get("/problems/{problem_id}/submissions")
def get_problem_submissions(problem_id: str, username: str | None = None) -> dict[str, list[dict[str, Any]]]:
    get_problem_or_404(problem_id)
    return {"submissions": list_user_submissions(username, problem_id)}


@app.get("/users/{username}/submissions")
def get_user_submissions(username: str) -> dict[str, list[dict[str, Any]]]:
    return {"submissions": list_user_submissions(username)}


@app.post("/problems")
async def create_problem(payload: ProblemMutationRequest) -> dict[str, Any]:
    async with _lock:
        problem_id = next_problem_id()
        problem = build_problem_record(problem_id, payload)
        _catalog[str(problem_id)] = problem
        _catalog_order.append(str(problem_id))
        _default_state[str(problem_id)] = build_problem_state(str(problem_id))
        sync_user_problem_state(str(problem_id))
        await persist_problem(problem)
        return {"problem": build_problem_detail(problem, build_problem_state(str(problem_id)))}


@app.put("/problems/{problem_id}")
async def update_problem(problem_id: str, payload: ProblemMutationRequest) -> dict[str, Any]:
    async with _lock:
        existing = get_problem_or_404(problem_id)
        updated = build_problem_record(existing["id"], payload, existing)
        _catalog[str(problem_id)] = updated
        await persist_problem(updated)
        return {"problem": build_problem_detail(updated, build_problem_state(str(problem_id)))}


@app.delete("/problems/{problem_id}")
async def delete_problem(problem_id: str) -> dict[str, Any]:
    async with _lock:
        get_problem_or_404(problem_id)
        _catalog.pop(str(problem_id), None)
        _default_state.pop(str(problem_id), None)
        _catalog_order[:] = [entry for entry in _catalog_order if str(entry) != str(problem_id)]
        remove_user_problem_state(str(problem_id))
        await remove_problem_from_storage(str(problem_id))
        return {"ok": True}


@app.post("/problems/{problem_id}/bookmark")
async def toggle_bookmark(problem_id: str, payload: BookmarkRequest) -> dict[str, Any]:
    problem = get_problem_or_404(problem_id)
    normalized_username = normalize_username(payload.username)
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username is required")

    async with _lock:
        state = get_problem_state(str(problem["id"]), normalized_username)
        state["starred"] = (not bool(state.get("starred"))) if payload.starred is None else bool(payload.starred)
        return {"problem": build_problem_summary(problem, state)}


@app.post("/problems/{problem_id}/run")
def run_problem(problem_id: str, payload: RunRequest) -> dict[str, dict[str, Any]]:
    problem = get_problem_or_404(problem_id)
    result = call_submission_service("/run", build_submission_payload(problem, payload.language, payload.code, payload.input))
    return {"result": result}


@app.post("/problems/{problem_id}/submit")
async def submit_problem(problem_id: str, payload: SubmitRequest) -> dict[str, Any]:
    problem = get_problem_or_404(problem_id)
    normalized_username = normalize_username(payload.username)
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username is required")

    result = call_submission_service("/submit", build_submission_payload(problem, payload.language, payload.code))
    now = utc_now_iso()

    async with _lock:
        state = get_problem_state(str(problem["id"]), normalized_username)
        state["lastSubmitted"] = now
        state["status"] = "solved" if result["status"] == "Accepted" else "attempted"

        submission = build_submission_record(problem, payload, result, now)

        user_state = ensure_user_state(normalized_username)
        assert user_state is not None
        user_state["submissions"] = [submission, *user_state["submissions"]][:250]

        return {
            "result": result,
            "problem": build_problem_summary(problem, state),
            "submission": deepcopy(submission),
            "submissions": list_user_submissions(normalized_username),
            "problemSubmissions": list_user_submissions(normalized_username, str(problem["id"])),
        }
