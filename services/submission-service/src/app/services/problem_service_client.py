"""REST client for problem-service lookups used during submission routing."""

from __future__ import annotations

import httpx

from app.config import settings
from app.exceptions import ValidationError
from app.logger import get_logger

logger = get_logger(__name__)


class ProblemServiceClient:
    """Look up problem details before routing a submission to a judge queue."""

    async def get_problem(self, problem_id: int) -> dict | None:
        """Fetch problem details from problem-service.

        Returns problem JSON on success, raises ValidationError on 404,
        and returns None when the upstream service is temporarily unavailable.
        """
        url = f"{settings.PROBLEM_SERVICE_URL.rstrip('/')}/api/problems/{problem_id}"

        try:
            async with httpx.AsyncClient(timeout=settings.PROBLEM_SERVICE_TIMEOUT) as client:
                response = await client.get(url)

            if response.status_code == 404:
                raise ValidationError(f"Problem with id {problem_id} not found")

            response.raise_for_status()
            return response.json()

        except ValidationError:
            raise
        except httpx.RequestError as exc:
            logger.warning(
                "Problem lookup unavailable for problem_id=%s: %s",
                problem_id,
                exc,
            )
            return None
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Problem lookup failed for problem_id=%s with HTTP %s",
                problem_id,
                exc.response.status_code,
            )
            return None
        except ValueError as exc:
            logger.warning(
                "Problem lookup returned invalid JSON for problem_id=%s: %s",
                problem_id,
                exc,
            )
            return None
