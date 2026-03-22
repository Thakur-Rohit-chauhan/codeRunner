"""Score calculator — maps verdicts to point values."""

from app.logger import get_logger

logger = get_logger(__name__)

# Verdict → Points mapping
VERDICT_POINTS: dict[str, int] = {
    "AC": 100,      # Accepted — full points
    "WA": 0,         # Wrong Answer
    "TLE": 0,        # Time Limit Exceeded
    "MLE": 0,        # Memory Limit Exceeded
    "RE": 0,         # Runtime Error
    "CE": 0,         # Compilation Error
}


def calculate_points(verdict: str, points_per_ac: int = 100) -> int:
    """Calculate points for a submission verdict.

    Args:
        verdict: The judge verdict (AC, WA, TLE, etc.)
        points_per_ac: Custom points for AC (contest-specific)

    Returns:
        Points to award (0 for non-AC verdicts).
    """
    if verdict.upper() == "AC":
        return points_per_ac
    return VERDICT_POINTS.get(verdict.upper(), 0)
