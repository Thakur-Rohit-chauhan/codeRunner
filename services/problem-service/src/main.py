from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from threading import Lock
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


SEED_PATH = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "problemSeed.json"
SUBMISSION_SERVICE_URL = os.environ.get("SUBMISSION_SERVICE_URL", "http://127.0.0.1:8003")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_username(value: str = "") -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


_seed_data = load_seed()
_seed_records = list(_seed_data.get("problems") or [])
_catalog = {str(problem["id"]): problem for problem in _seed_records}
_catalog_order = [str(problem["id"]) for problem in _seed_records]
_default_state = {
    problem_id: {
        "status": problem.get("defaultStatus"),
        "starred": bool(problem.get("defaultStarred")),
        "lastSubmitted": problem.get("defaultLastSubmitted"),
    }
    for problem_id, problem in _catalog.items()
}


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


app = FastAPI(title="Problem Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_lock = Lock()
_user_state: dict[str, dict[str, Any]] = {}


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
        "topics": deepcopy(_seed_data.get("topics") or []),
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


@app.post("/problems/{problem_id}/bookmark")
def toggle_bookmark(problem_id: str, payload: BookmarkRequest) -> dict[str, Any]:
    problem = get_problem_or_404(problem_id)
    normalized_username = normalize_username(payload.username)
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username is required")

    with _lock:
        state = get_problem_state(str(problem["id"]), normalized_username)
        state["starred"] = (not bool(state.get("starred"))) if payload.starred is None else bool(payload.starred)
        return {"problem": build_problem_summary(problem, state)}


@app.post("/problems/{problem_id}/run")
def run_problem(problem_id: str, payload: RunRequest) -> dict[str, dict[str, Any]]:
    problem = get_problem_or_404(problem_id)
    result = call_submission_service("/run", build_submission_payload(problem, payload.language, payload.code, payload.input))
    return {"result": result}


@app.post("/problems/{problem_id}/submit")
def submit_problem(problem_id: str, payload: SubmitRequest) -> dict[str, Any]:
    problem = get_problem_or_404(problem_id)
    normalized_username = normalize_username(payload.username)
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username is required")

    result = call_submission_service("/submit", build_submission_payload(problem, payload.language, payload.code))
    now = utc_now_iso()

    with _lock:
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
