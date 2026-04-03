from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from redis import asyncio as redis_async


KNOWN_SUBMISSION_TYPES = ("code", "ml", "packet")


def queue_name_for_type(submission_type: str) -> str:
    return f"queue:{submission_type}:ready"


def processing_queue_name(submission_type: str) -> str:
    return f"queue:{submission_type}:processing"


def retry_queue_name(submission_type: str) -> str:
    return f"queue:{submission_type}:retry"


def dead_letter_queue_name(submission_type: str) -> str:
    return f"queue:{submission_type}:dead-letter"


def leaderboard_key(competition_id: int) -> str:
    return f"leaderboard:{competition_id}"


class RedisQueueManager:
    def __init__(
        self,
        redis_url: str,
        client: redis_async.Redis | None = None,
        *,
        retry_limit: int = 3,
        retry_base_delay_seconds: float = 2.0,
        retry_max_delay_seconds: float = 30.0,
    ) -> None:
        self.client = client or redis_async.from_url(redis_url, decode_responses=True)
        self._owns_client = client is None
        self.retry_limit = retry_limit
        self.retry_base_delay_seconds = retry_base_delay_seconds
        self.retry_max_delay_seconds = retry_max_delay_seconds

    async def ping(self) -> bool:
        return bool(await self.client.ping())

    def _retry_delay_seconds(self, attempt: int) -> float:
        exponent = max(attempt - 1, 0)
        return min(self.retry_base_delay_seconds * (2**exponent), self.retry_max_delay_seconds)

    def _serialize_job(self, payload: dict[str, Any]) -> str:
        job = dict(payload)
        job.setdefault("attempt", 0)
        job.setdefault("max_attempts", self.retry_limit)
        job.setdefault("enqueued_at", time.time())
        return json.dumps(job)

    def _deserialize_job(self, raw_job: str) -> dict[str, Any]:
        job = json.loads(raw_job)
        if not isinstance(job, dict):  # pragma: no cover - defensive runtime guard
            raise ValueError("Queue payload must decode to an object")
        job.setdefault("attempt", 0)
        job.setdefault("max_attempts", self.retry_limit)
        return job

    async def enqueue(self, submission_type: str, payload: dict[str, Any]) -> None:
        await self.client.rpush(queue_name_for_type(submission_type), self._serialize_job(payload))

    async def promote_retries(self, submission_type: str) -> int:
        key = retry_queue_name(submission_type)
        ready_key = queue_name_for_type(submission_type)
        due_at = time.time()
        due_jobs = await self.client.zrangebyscore(key, min="-inf", max=due_at)
        if not due_jobs:
            return 0

        pipeline = self.client.pipeline(transaction=True)
        for raw_job in due_jobs:
            pipeline.zrem(key, raw_job)
            pipeline.rpush(ready_key, raw_job)
        await pipeline.execute()
        return len(due_jobs)

    async def claim_next(self, submission_type: str, timeout: int) -> tuple[str | None, dict[str, Any] | None]:
        await self.promote_retries(submission_type)
        raw_job = await self.client.brpoplpush(
            queue_name_for_type(submission_type),
            processing_queue_name(submission_type),
            timeout=timeout,
        )
        if not raw_job:
            return None, None
        return raw_job, self._deserialize_job(raw_job)

    async def ack(self, submission_type: str, raw_job: str) -> None:
        await self.client.lrem(processing_queue_name(submission_type), 1, raw_job)

    async def nack(self, submission_type: str, raw_job: str, reason: str) -> dict[str, Any]:
        payload = self._deserialize_job(raw_job)
        payload["attempt"] = int(payload.get("attempt", 0)) + 1
        payload["last_error"] = reason
        payload["last_failed_at"] = time.time()
        max_attempts = int(payload.get("max_attempts", self.retry_limit))

        pipeline = self.client.pipeline(transaction=True)
        pipeline.lrem(processing_queue_name(submission_type), 1, raw_job)

        if payload["attempt"] >= max_attempts:
            payload["dead_lettered_at"] = time.time()
            pipeline.rpush(dead_letter_queue_name(submission_type), json.dumps(payload))
            outcome = {
                "status": "dead-lettered",
                "attempt": int(payload["attempt"]),
                "max_attempts": max_attempts,
            }
        else:
            available_at = time.time() + self._retry_delay_seconds(int(payload["attempt"]))
            payload["available_at"] = available_at
            pipeline.zadd(retry_queue_name(submission_type), {json.dumps(payload): available_at})
            outcome = {
                "status": "retry-scheduled",
                "attempt": int(payload["attempt"]),
                "max_attempts": max_attempts,
                "available_at": available_at,
            }

        await pipeline.execute()
        return outcome

    async def replace_leaderboard(self, competition_id: int, entries: list[tuple[str, float]]) -> None:
        key = leaderboard_key(competition_id)
        await self.client.delete(key)
        if entries:
            await self.client.zadd(key, {user_id: score for user_id, score in entries})

    async def upsert_leaderboard_score(self, competition_id: int, user_id: str, score: float) -> None:
        await self.client.zadd(leaderboard_key(competition_id), {user_id: score})

    async def fetch_leaderboard(self, competition_id: int, limit: int) -> list[tuple[str, float]]:
        rows = await self.client.zrevrange(leaderboard_key(competition_id), 0, max(limit - 1, 0), withscores=True)
        return [(user_id, float(score)) for user_id, score in rows]

    async def queue_depths(self) -> dict[str, dict[str, int]]:
        depths: dict[str, dict[str, int]] = {}
        for submission_type in KNOWN_SUBMISSION_TYPES:
            ready_count, processing_count, retry_count, dead_count = await asyncio.gather(
                self.client.llen(queue_name_for_type(submission_type)),
                self.client.llen(processing_queue_name(submission_type)),
                self.client.zcard(retry_queue_name(submission_type)),
                self.client.llen(dead_letter_queue_name(submission_type)),
            )
            depths[submission_type] = {
                "ready": int(ready_count),
                "processing": int(processing_count),
                "retry": int(retry_count),
                "dead_letter": int(dead_count),
            }
        return depths

    async def close(self) -> None:
        if not self._owns_client:
            return
        aclose = getattr(self.client, "aclose", None)
        if callable(aclose):
            await aclose()
            return
        await self.client.close()
