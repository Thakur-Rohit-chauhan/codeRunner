from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_in(delta: timedelta) -> str:
    return (utc_now() + delta).isoformat()


def score_leaderboard(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = sorted(
        rows,
        key=lambda row: (
            -(row.get("score") or 0),
            -(row.get("solved") or 0),
            row.get("timeSeconds") or 0,
        ),
    )
    return [{**row, "rank": index + 1} for index, row in enumerate(ranked)]


def accuracy_leaderboard(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = sorted(
        rows,
        key=lambda row: (
            -(row.get("accuracy") or 0),
            row.get("timeSeconds") or 0,
        ),
    )
    return [{**row, "rank": index + 1} for index, row in enumerate(ranked)]


def rank_leaderboard(contest: dict[str, Any], rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranking = contest.get("ranking") or ("accuracy" if contest.get("domain") == "ML" else "score")
    return accuracy_leaderboard(rows) if ranking == "accuracy" else score_leaderboard(rows)


SEEDED_SCORE_ROWS = [
    {"name": "alex_coder", "country": "🇺🇸", "score": 4200, "solved": 4, "time": "1h 12m", "timeSeconds": 4320},
    {"name": "devMaster99", "country": "🇮🇳", "score": 3900, "solved": 4, "time": "1h 28m", "timeSeconds": 5280},
    {"name": "rushikesh_r", "country": "🇮🇳", "score": 3500, "solved": 3, "time": "58m", "timeSeconds": 3480},
    {"name": "codewizard22", "country": "🇩🇪", "score": 3200, "solved": 3, "time": "1h 05m", "timeSeconds": 3900},
    {"name": "algo_queen", "country": "🇬🇧", "score": 2800, "solved": 3, "time": "1h 20m", "timeSeconds": 4800},
]

SEEDED_CYBER_ROWS = [
    {"name": "packetghost", "country": "🇸🇬", "score": 5100, "solved": 3, "time": "1h 18m", "timeSeconds": 4680},
    {"name": "hexhunter", "country": "🇮🇳", "score": 4700, "solved": 3, "time": "1h 32m", "timeSeconds": 5520},
    {"name": "root_kitten", "country": "🇺🇸", "score": 4200, "solved": 2, "time": "59m", "timeSeconds": 3540},
    {"name": "shellshift", "country": "🇩🇪", "score": 3900, "solved": 2, "time": "1h 11m", "timeSeconds": 4260},
]

SEEDED_ML_ROWS = [
    {"name": "visionary_ai", "country": "🇺🇸", "accuracy": 0.9342, "submissions": 11, "time": "47m", "timeSeconds": 2820},
    {"name": "tensortrail", "country": "🇮🇳", "accuracy": 0.9218, "submissions": 9, "time": "54m", "timeSeconds": 3240},
    {"name": "bertbuilder", "country": "🇬🇧", "accuracy": 0.9087, "submissions": 8, "time": "1h 09m", "timeSeconds": 4140},
    {"name": "gradboosted", "country": "🇩🇪", "accuracy": 0.8925, "submissions": 7, "time": "1h 16m", "timeSeconds": 4560},
]

DSA_IDS = [1758, 1, 2, 4, 21, 22, 23]
CTF_IDS = [18, 19, 20]
ML_IDS = [15, 16, 17]


def seeded_contests() -> list[dict[str, Any]]:
    contests = [
        {
            "id": "cr-weekly-142",
            "title": "CodeRunner Weekly #142",
            "domain": "DSA",
            "ranking": "score",
            "type": "weekly",
            "status": "upcoming",
            "startTime": iso_in(timedelta(days=2, hours=5)),
            "duration": 90,
            "participants": 4812,
            "problemIds": DSA_IDS[:4],
            "difficulty": "Mixed",
            "prizes": ["500 CR Coins", "250 CR Coins", "100 CR Coins"],
            "tags": ["DSA", "Algorithms"],
            "createdBy": "system",
            "description": "Our classic weekly contest. Four problems ranging from easy warm-ups to hard brain-teasers. Solve as many as possible within 90 minutes!",
            "featured": True,
            "leaderboard": rank_leaderboard({"domain": "DSA", "ranking": "score"}, deepcopy(SEEDED_SCORE_ROWS)),
        },
        {
            "id": "cr-biweekly-68",
            "title": "Biweekly Contest #68",
            "domain": "DSA",
            "ranking": "score",
            "type": "biweekly",
            "status": "upcoming",
            "startTime": iso_in(timedelta(days=9)),
            "duration": 75,
            "participants": 2341,
            "problemIds": DSA_IDS[:3],
            "difficulty": "Easy–Medium",
            "prizes": ["250 CR Coins", "100 CR Coins", "50 CR Coins"],
            "tags": ["Arrays", "Strings"],
            "createdBy": "system",
            "description": "A more approachable contest — three problems for intermediate coders. Perfect for beginners looking to get their first rating.",
            "featured": False,
            "leaderboard": rank_leaderboard({"domain": "DSA", "ranking": "score"}, deepcopy(SEEDED_SCORE_ROWS[:4])),
        },
        {
            "id": "cr-cyber-cup-3",
            "title": "Cyber Security Cup III",
            "domain": "CTF",
            "ranking": "score",
            "type": "special",
            "status": "upcoming",
            "startTime": iso_in(timedelta(days=14)),
            "duration": 180,
            "participants": 1234,
            "problemIds": CTF_IDS[:3],
            "difficulty": "Hard",
            "prizes": ["2000 CR Coins", "1000 CR Coins", "500 CR Coins"],
            "tags": ["CTF", "Cryptography", "Binary"],
            "createdBy": "system",
            "description": "Push your binary exploitation and network forensics skills to the limit. A 3-hour CTF-style special event.",
            "featured": True,
            "leaderboard": rank_leaderboard({"domain": "CTF", "ranking": "score"}, deepcopy(SEEDED_CYBER_ROWS)),
        },
        {
            "id": "cr-weekly-141",
            "title": "CodeRunner Weekly #141",
            "domain": "DSA",
            "ranking": "score",
            "type": "weekly",
            "status": "past",
            "startTime": iso_in(-timedelta(days=7)),
            "duration": 90,
            "participants": 5120,
            "problemIds": DSA_IDS[:4],
            "difficulty": "Mixed",
            "prizes": ["500 CR Coins", "250 CR Coins", "100 CR Coins"],
            "tags": ["DSA", "DP"],
            "createdBy": "system",
            "description": "Last week's contest. Dynamic programming and graph problems featured.",
            "featured": False,
            "leaderboard": rank_leaderboard({"domain": "DSA", "ranking": "score"}, deepcopy(SEEDED_SCORE_ROWS)),
        },
        {
            "id": "cr-biweekly-67",
            "title": "Biweekly Contest #67",
            "domain": "DSA",
            "ranking": "score",
            "type": "biweekly",
            "status": "past",
            "startTime": iso_in(-timedelta(days=14)),
            "duration": 75,
            "participants": 3876,
            "problemIds": DSA_IDS[:3],
            "difficulty": "Easy–Medium",
            "prizes": ["250 CR Coins"],
            "tags": ["Graphs", "Trees"],
            "createdBy": "system",
            "description": "Biweekly #67 focused on tree traversals and BFS/DFS graph problems.",
            "featured": False,
            "leaderboard": rank_leaderboard({"domain": "DSA", "ranking": "score"}, deepcopy(SEEDED_SCORE_ROWS[:4])),
        },
        {
            "id": "cr-ml-sprint-1",
            "title": "ML Sprint Challenge I",
            "domain": "ML",
            "ranking": "accuracy",
            "type": "special",
            "status": "past",
            "startTime": iso_in(-timedelta(days=21)),
            "duration": 120,
            "participants": 2210,
            "problemIds": ML_IDS[:2],
            "difficulty": "Medium–Hard",
            "prizes": ["1500 CR Coins", "750 CR Coins", "300 CR Coins"],
            "tags": ["ML", "Statistics"],
            "createdBy": "system",
            "description": "Machine learning challenge covering regression models and neural network design patterns.",
            "featured": False,
            "leaderboard": rank_leaderboard({"domain": "ML", "ranking": "accuracy"}, deepcopy(SEEDED_ML_ROWS)),
        },
    ]
    return contests


def normalize_contest_record(contest: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(contest)
    normalized["ranking"] = normalized.get("ranking") or ("accuracy" if normalized.get("domain") == "ML" else "score")
    normalized["participants"] = int(normalized.get("participants") or 0)
    normalized["duration"] = int(normalized.get("duration") or 90)
    normalized["problemIds"] = list(normalized.get("problemIds") or [])
    normalized["prizes"] = [str(prize).strip() for prize in (normalized.get("prizes") or []) if str(prize).strip()]
    normalized["tags"] = [str(tag).strip() for tag in (normalized.get("tags") or []) if str(tag).strip()]
    normalized["leaderboard"] = rank_leaderboard(normalized, normalized.get("leaderboard") or [])
    return normalized


class ContestCreate(BaseModel):
    title: str
    domain: str = "DSA"
    ranking: str | None = None
    type: str = "custom"
    description: str = ""
    startTime: str
    duration: int = 90
    prizes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    problemIds: list[int | str] = Field(default_factory=list)
    createdBy: str | None = None
    featured: bool = False


class ContestUpdate(BaseModel):
    title: str | None = None
    domain: str | None = None
    ranking: str | None = None
    type: str | None = None
    description: str | None = None
    startTime: str | None = None
    duration: int | None = None
    prizes: list[str] | None = None
    tags: list[str] | None = None
    problemIds: list[int | str] | None = None
    createdBy: str | None = None
    featured: bool | None = None


class RegistrationRequest(BaseModel):
    username: str | None = None


class ContestResult(BaseModel):
    name: str
    country: str | None = "🌍"
    score: int | None = None
    solved: int | None = None
    accuracy: float | None = None
    submissions: int | None = None
    time: str | None = None
    timeSeconds: int | None = None


app = FastAPI(title="Contest Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_lock = Lock()
_contests = {contest["id"]: normalize_contest_record(contest) for contest in seeded_contests()}
_registrations: dict[str, set[str]] = {}


def sorted_contests() -> list[dict[str, Any]]:
    return sorted((deepcopy(contest) for contest in _contests.values()), key=lambda contest: contest["startTime"])


def copy_contest(contest: dict[str, Any]) -> dict[str, Any]:
    return deepcopy(contest)


def get_contest_or_404(contest_id: str) -> dict[str, Any]:
    contest = _contests.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    return contest


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/contests")
def list_contests() -> dict[str, list[dict[str, Any]]]:
    return {"contests": sorted_contests()}


@app.get("/contests/{contest_id}")
def get_contest(contest_id: str) -> dict[str, dict[str, Any]]:
    contest = get_contest_or_404(contest_id)
    return {"contest": copy_contest(contest)}


@app.post("/contests")
def create_contest(payload: ContestCreate) -> dict[str, Any]:
    contest_id = f"cr-custom-{int(utc_now().timestamp() * 1000)}"
    contest = normalize_contest_record({
        "id": contest_id,
        "title": payload.title,
        "domain": payload.domain,
        "ranking": payload.ranking or ("accuracy" if payload.domain == "ML" else "score"),
        "type": payload.type,
        "status": "upcoming",
        "startTime": payload.startTime,
        "duration": payload.duration,
        "participants": 0,
        "problemIds": list(payload.problemIds),
        "difficulty": "Mixed",
        "prizes": list(payload.prizes),
        "tags": list(payload.tags),
        "createdBy": payload.createdBy or "user",
        "description": payload.description,
        "featured": bool(payload.featured),
        "leaderboard": [],
    })

    with _lock:
        _contests[contest_id] = contest

    return {"contest": copy_contest(contest)}


@app.put("/contests/{contest_id}")
def update_contest(contest_id: str, payload: ContestUpdate) -> dict[str, Any]:
    with _lock:
        existing = get_contest_or_404(contest_id)
        updated = normalize_contest_record({
            **existing,
            **payload.dict(exclude_unset=True),
        })
        _contests[contest_id] = updated
        return {"contest": copy_contest(updated)}


@app.delete("/contests/{contest_id}")
def delete_contest(contest_id: str) -> dict[str, bool]:
    with _lock:
        get_contest_or_404(contest_id)
        _contests.pop(contest_id, None)
        _registrations.pop(contest_id, None)
    return {"ok": True}


@app.post("/contests/{contest_id}/register")
def register_contest(contest_id: str, payload: RegistrationRequest) -> dict[str, Any]:
    contest = get_contest_or_404(contest_id)
    username = (payload.username or "").strip().lower()

    with _lock:
        registrations = _registrations.setdefault(contest_id, set())
        if username:
            registrations.add(username)
        contest["participants"] = max(contest.get("participants") or 0, len(registrations))
        return {"contest": copy_contest(normalize_contest_record(contest))}


@app.post("/contests/{contest_id}/unregister")
def unregister_contest(contest_id: str, payload: RegistrationRequest) -> dict[str, Any]:
    contest = get_contest_or_404(contest_id)
    username = (payload.username or "").strip().lower()

    with _lock:
        registrations = _registrations.setdefault(contest_id, set())
        if username:
            registrations.discard(username)
        contest["participants"] = max(len(registrations), 0)
        return {"contest": copy_contest(normalize_contest_record(contest))}


@app.post("/contests/{contest_id}/results")
def record_contest_result(contest_id: str, payload: ContestResult) -> dict[str, Any]:
    with _lock:
        contest = get_contest_or_404(contest_id)
        leaderboard = deepcopy(contest.get("leaderboard") or [])
        ranking = contest.get("ranking") or ("accuracy" if contest.get("domain") == "ML" else "score")
        existing_index = next((index for index, row in enumerate(leaderboard) if row.get("name") == payload.name), -1)
        existing = leaderboard[existing_index] if existing_index >= 0 else None

        if ranking == "accuracy":
            candidate_metric = payload.accuracy or 0
            keep_existing = existing and (
                (existing.get("accuracy") or 0) > candidate_metric
                or (
                    (existing.get("accuracy") or 0) == candidate_metric
                    and (existing.get("timeSeconds") or 0) <= (payload.timeSeconds or 0)
                )
            )
            row = existing if keep_existing else {
                "name": payload.name,
                "country": payload.country or "🌍",
                "accuracy": candidate_metric,
                "submissions": payload.submissions or 0,
                "time": payload.time,
                "timeSeconds": payload.timeSeconds or 0,
            }
        else:
            candidate_metric = payload.score or 0
            keep_existing = existing and (
                (existing.get("score") or 0) > candidate_metric
                or (
                    (existing.get("score") or 0) == candidate_metric
                    and (existing.get("timeSeconds") or 0) <= (payload.timeSeconds or 0)
                )
            )
            row = existing if keep_existing else {
                "name": payload.name,
                "country": payload.country or "🌍",
                "score": candidate_metric,
                "solved": payload.solved or 0,
                "time": payload.time,
                "timeSeconds": payload.timeSeconds or 0,
            }

        if existing_index >= 0:
            leaderboard[existing_index] = row
        else:
            leaderboard.append(row)

        contest["leaderboard"] = rank_leaderboard(contest, leaderboard)
        return {"contest": copy_contest(contest)}
