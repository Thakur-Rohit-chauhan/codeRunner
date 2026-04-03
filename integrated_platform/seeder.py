from __future__ import annotations

from datetime import timedelta
import random
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from .auth import hash_password
from .config import Settings
from .models import Competition, CompetitionMode, Leaderboard, Result, Submission, SubmissionLifecycle, User, utcnow


DEFAULT_ADMIN_EMAIL = "admin@gmail.com"
DEFAULT_ADMIN_PASSWORD = "Admin123"


def _build_seed_users(total_users: int) -> list[User]:
    ranks = ["Novice", "Apprentice", "Guardian", "Elite", "Legend"]
    users: list[User] = [
        User(
            id=str(uuid4()),
            username="admin",
            email=DEFAULT_ADMIN_EMAIL,
            password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
            display_name="Platform Admin",
            role="admin",
            rank="Admin",
            rating=2100,
        )
    ]

    for index in range(1, total_users):
        rating = 1180 + (index * 17) % 760
        users.append(
            User(
                id=str(uuid4()),
                username=f"user{index:02d}",
                email=f"user{index:02d}@example.com",
                password_hash=hash_password("password123"),
                display_name=f"Learner {index:02d}",
                role="user",
                rank=ranks[index % len(ranks)],
                rating=rating,
            )
        )

    return users


def _build_seed_competitions() -> list[Competition]:
    return [
        Competition(
            slug="array-arena",
            title="Array Arena",
            description="Classic algorithmic challenge with standard code judging.",
            mode=CompetitionMode.CODE.value,
            difficulty="easy",
            max_score=100.0,
            queue_name="queue:code:ready",
        ),
        Competition(
            slug="graph-gauntlet",
            title="Graph Gauntlet",
            description="Async judge queue for graph-heavy code execution.",
            mode=CompetitionMode.CODE.value,
            difficulty="hard",
            max_score=100.0,
            queue_name="queue:code:ready",
        ),
        Competition(
            slug="vision-benchmark",
            title="Vision Benchmark",
            description="Notebook-based ML evaluation with metric extraction.",
            mode=CompetitionMode.ML.value,
            difficulty="medium",
            max_score=100.0,
            queue_name="queue:ml:ready",
        ),
        Competition(
            slug="packet-forensics",
            title="Packet Forensics",
            description="Scapy-driven packet lab with isolated validation.",
            mode=CompetitionMode.PACKET.value,
            difficulty="medium",
            max_score=100.0,
            queue_name="queue:packet:ready",
        ),
        Competition(
            slug="forecast-sprint",
            title="Forecast Sprint",
            description="Time-series notebook race with CPU and GPU queue metadata.",
            mode=CompetitionMode.ML.value,
            difficulty="hard",
            max_score=100.0,
            queue_name="queue:ml:ready",
        ),
    ]


def _seed_payload(mode: str, score: float) -> tuple[str, dict]:
    if mode == CompetitionMode.CODE.value:
        source = (
            "def solve(data):\n"
            "    values = list(map(int, data.split())) if data else []\n"
            "    return str(sum(values))\n"
            f"# seeded_score={score:.2f}\n"
        )
        return source, {"kind": "code", "seeded_score": score}

    if mode == CompetitionMode.ML.value:
        source = (
            "import sklearn\n"
            "def train(dataset):\n"
            "    accuracy = 0.0\n"
            f"    hidden_test_accuracy={score / 100:.4f}\n"
            "    return accuracy\n"
        )
        return source, {"kind": "ml", "hidden_test_accuracy": round(score / 100, 4)}

    source = (
        "from scapy.all import IP, TCP, UDP\n"
        f"packet = IP(dst='10.0.0.1')/TCP(flags='S')  # seeded_score={score:.2f}\n"
    )
    return source, {"kind": "packet", "validated_packets": max(1, int(score // 20))}


async def seed_platform_data(session_factory: async_sessionmaker, settings: Settings) -> bool:
    async with session_factory() as session:
        existing_users = await session.scalar(select(func.count(User.id)))
        if existing_users:
            return False

        users = _build_seed_users(settings.seed_users)
        competitions = _build_seed_competitions()[: settings.seed_competitions]

        session.add_all(users)
        session.add_all(competitions)
        await session.flush()

        rng = random.Random(20260402)
        leaderboard_state: dict[tuple[int, str], dict[str, object]] = {}
        submissions: list[Submission] = []
        results: list[Result] = []
        now = utcnow()

        for index in range(settings.seed_submissions):
            user = rng.choice(users)
            competition = rng.choice(competitions)
            score = round(rng.uniform(38.0, competition.max_score), 2)
            accepted = rng.random() > 0.18
            created_at = now - timedelta(hours=settings.seed_submissions - index)
            started_at = created_at + timedelta(seconds=3)
            completed_at = started_at + timedelta(seconds=5)
            source_text, payload = _seed_payload(competition.mode, score)
            submission_id = str(uuid4())
            final_status = SubmissionLifecycle.ACCEPTED.value if accepted else SubmissionLifecycle.FAILED.value
            final_score = score if accepted else round(score * 0.35, 2)

            submissions.append(
                Submission(
                    id=submission_id,
                    user_id=user.id,
                    competition_id=competition.id,
                    submission_type=competition.mode,
                    queue_name=competition.queue_name,
                    language="python" if competition.mode != CompetitionMode.PACKET.value else "scapy",
                    source_text=source_text,
                payload=payload,
                status=final_status,
                score=final_score,
                attempt_count=1,
                max_attempts=3,
                last_error=None if accepted else "seeded synthetic failure",
                worker_name=f"seed-{competition.mode}",
                created_at=created_at,
                updated_at=completed_at,
                    started_at=started_at,
                    completed_at=completed_at,
                )
            )

            results.append(
                Result(
                    submission_id=submission_id,
                    competition_id=competition.id,
                    user_id=user.id,
                    status=final_status,
                    score=final_score,
                    stdout="seeded_result=true",
                    stderr="" if accepted else "seeded synthetic failure",
                    metrics={"seeded": True},
                    runtime_ms=120 + (index % 40),
                    memory_kb=8192 + (index % 512),
                    judged_by=f"seed-{competition.mode}",
                    judged_at=completed_at,
                )
            )

            key = (competition.id, user.id)
            row = leaderboard_state.setdefault(
                key,
                {
                    "competition_id": competition.id,
                    "user_id": user.id,
                    "best_score": 0.0,
                    "submissions_count": 0,
                    "accepted_count": 0,
                    "last_submission_id": submission_id,
                    "last_status": final_status,
                    "updated_at": completed_at,
                },
            )
            row["submissions_count"] = int(row["submissions_count"]) + 1
            row["last_submission_id"] = submission_id
            row["last_status"] = final_status
            row["updated_at"] = completed_at
            if accepted:
                row["accepted_count"] = int(row["accepted_count"]) + 1
                row["best_score"] = max(float(row["best_score"]), final_score)

        session.add_all(submissions)
        await session.flush()
        session.add_all(results)
        session.add_all(
            Leaderboard(
                competition_id=value["competition_id"],
                user_id=value["user_id"],
                best_score=float(value["best_score"]),
                submissions_count=int(value["submissions_count"]),
                accepted_count=int(value["accepted_count"]),
                last_submission_id=str(value["last_submission_id"]),
                last_status=str(value["last_status"]),
                updated_at=value["updated_at"],
            )
            for value in leaderboard_state.values()
        )
        await session.commit()
        return True
