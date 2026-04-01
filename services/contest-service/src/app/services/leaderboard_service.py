"""Leaderboard service — real-time leaderboard management via Redis Sorted Sets."""

from datetime import datetime

import redis.asyncio as redis

from app.logger import get_logger
from app.utils.redis_keys import RedisKeys

logger = get_logger(__name__)


class LeaderboardService:
    """Manage real-time leaderboards using Redis Sorted Sets."""

    def __init__(self, redis_client: redis.Redis) -> None:
        self.redis = redis_client

    # ── Score Operations ──────────────────────────────────────

    async def update_score(
        self,
        contest_id: int,
        user_id: str,
        points: int,
        submission_id: int | None = None,
    ) -> dict:
        """Add points to a user's score in the contest leaderboard.

        Uses ZINCRBY for atomic score increment.

        Returns:
            {'new_score': int, 'rank': int, 'message': str}
        """
        try:
            leaderboard_key = RedisKeys.leaderboard(contest_id)

            # Atomic score increment
            new_score = await self.redis.zincrby(leaderboard_key, points, user_id)

            # Get updated rank (0-indexed)
            rank = await self.redis.zrevrank(leaderboard_key, user_id)

            # Update user stats hash
            stats_key = RedisKeys.user_stats(contest_id, user_id)
            await self.redis.hincrby(stats_key, "submissions", 1)

            if points > 0:
                await self.redis.hincrby(stats_key, "problems_solved", 1)
                await self.redis.hincrby(stats_key, "accepted", 1)
            else:
                await self.redis.hincrby(stats_key, "failed", 1)

            # Recompute accuracy
            stats = await self.redis.hgetall(stats_key)
            total_subs = int(stats.get("submissions", 0))
            accepted = int(stats.get("accepted", 0))
            accuracy = round((accepted / total_subs * 100), 1) if total_subs > 0 else 0.0
            await self.redis.hset(stats_key, "accuracy", str(accuracy))

            if submission_id is not None:
                await self.redis.hset(stats_key, "last_submission", str(submission_id))

            await self.redis.hset(stats_key, "last_update", datetime.utcnow().isoformat())

            display_rank = (rank + 1) if rank is not None else 0

            logger.info(
                "Score updated: user=%s, contest=%d, +%d → score=%d, rank=%d",
                user_id, contest_id, points, int(new_score), display_rank,
            )

            return {
                "new_score": int(new_score),
                "rank": display_rank,
                "message": f"Rank {display_rank}",
            }

        except Exception as exc:
            logger.error("Failed to update score: %s", exc)
            raise

    # ── Leaderboard Queries ───────────────────────────────────

    async def get_leaderboard(
        self,
        contest_id: int,
        limit: int = 10,
    ) -> list[dict]:
        """Get top N users from the leaderboard.

        Returns list of {'rank', 'user_id', 'score', 'stats'} dicts.
        """
        try:
            leaderboard_key = RedisKeys.leaderboard(contest_id)

            # ZREVRANGE returns list of (member, score) tuples
            results = await self.redis.zrevrange(
                leaderboard_key, 0, limit - 1, withscores=True
            )

            leaderboard = []
            for rank, (user_id, score) in enumerate(results, 1):
                entry = {
                    "rank": rank,
                    "user_id": user_id,
                    "score": int(score),
                }

                # Fetch user stats
                stats_key = RedisKeys.user_stats(contest_id, user_id)
                stats = await self.redis.hgetall(stats_key)
                entry["problems_solved"] = int(stats.get("problems_solved", 0))
                entry["submissions"] = int(stats.get("submissions", 0))
                entry["accuracy"] = float(stats.get("accuracy", 0.0))

                leaderboard.append(entry)

            logger.info("Retrieved top %d from contest %d", len(leaderboard), contest_id)
            return leaderboard

        except Exception as exc:
            logger.error("Failed to get leaderboard: %s", exc)
            raise

    async def get_user_rank(
        self,
        contest_id: int,
        user_id: str,
    ) -> dict:
        """Get a specific user's rank and score.

        Returns:
            {'rank': int|None, 'score': int, 'total_participants': int}
        """
        try:
            leaderboard_key = RedisKeys.leaderboard(contest_id)

            rank = await self.redis.zrevrank(leaderboard_key, user_id)
            total = await self.redis.zcard(leaderboard_key)

            if rank is None:
                return {"rank": None, "score": 0, "total_participants": total}

            score = await self.redis.zscore(leaderboard_key, user_id)

            return {
                "rank": rank + 1,
                "score": int(score) if score else 0,
                "total_participants": total,
            }

        except Exception as exc:
            logger.error("Failed to get user rank: %s", exc)
            raise

    # ── Participant Management ────────────────────────────────

    async def add_participant(
        self,
        contest_id: int,
        user_id: str,
    ) -> bool:
        """Register user in contest leaderboard with 0 initial score.

        Returns True if newly added, False if already existed.
        """
        try:
            leaderboard_key = RedisKeys.leaderboard(contest_id)

            # ZADD with NX — only add if not exists
            added = await self.redis.zadd(leaderboard_key, {user_id: 0}, nx=True)

            # Track active users
            active_key = RedisKeys.active_users(contest_id)
            await self.redis.sadd(active_key, user_id)

            # Initialize empty stats hash
            stats_key = RedisKeys.user_stats(contest_id, user_id)
            exists = await self.redis.exists(stats_key)
            if not exists:
                await self.redis.hset(
                    stats_key,
                    mapping={
                        "problems_solved": "0",
                        "submissions": "0",
                        "accepted": "0",
                        "failed": "0",
                        "accuracy": "0.0",
                        "last_update": datetime.utcnow().isoformat(),
                    },
                )

            logger.info("User %s added to contest %d (new=%s)", user_id, contest_id, bool(added))
            return bool(added)

        except Exception as exc:
            logger.error("Failed to add participant: %s", exc)
            raise

    async def get_participant_count(self, contest_id: int) -> int:
        """Get total number of participants in a contest."""
        try:
            leaderboard_key = RedisKeys.leaderboard(contest_id)
            return await self.redis.zcard(leaderboard_key)
        except Exception:
            return 0

    # ── Contest Stats ─────────────────────────────────────────

    async def get_contest_stats(self, contest_id: int) -> dict:
        """Get overall contest statistics."""
        try:
            leaderboard_key = RedisKeys.leaderboard(contest_id)
            active_key = RedisKeys.active_users(contest_id)

            participants = await self.redis.zcard(leaderboard_key)
            active_users = await self.redis.scard(active_key)

            top_results = await self.redis.zrevrange(
                leaderboard_key, 0, 0, withscores=True
            )
            top_score = int(top_results[0][1]) if top_results else 0

            return {
                "total_participants": participants,
                "active_participants": active_users,
                "top_score": top_score,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as exc:
            logger.error("Failed to get contest stats: %s", exc)
            raise
