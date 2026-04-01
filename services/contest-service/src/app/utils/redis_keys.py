"""Redis key naming conventions for contest-service.

Centralizes all Redis key patterns to avoid magic strings
scattered across the codebase.
"""


class RedisKeys:
    """Generate standardized Redis key names."""

    @staticmethod
    def leaderboard(contest_id: int) -> str:
        """Sorted Set for contest leaderboard rankings."""
        return f"contest:{contest_id}:leaderboard"

    @staticmethod
    def user_stats(contest_id: int, user_id: str) -> str:
        """Hash for per-user statistics within a contest."""
        return f"contest:{contest_id}:user_stats:{user_id}"

    @staticmethod
    def submission_time(contest_id: int, user_id: str) -> str:
        """Sorted Set for submission timestamps (tiebreaker)."""
        return f"contest:{contest_id}:submission_time:{user_id}"

    @staticmethod
    def active_users(contest_id: int) -> str:
        """Set of active user IDs in a contest."""
        return f"contest:{contest_id}:active_users"
