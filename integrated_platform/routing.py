from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .models import SubmissionType
from .queueing import queue_name_for_type


@dataclass(frozen=True)
class SubmissionRouting:
    domain: str
    submission_type: str
    queue_name: str
    worker_pool: str
    judge_label: str


ROUTING_BY_DOMAIN: dict[str, SubmissionRouting] = {
    "DSA": SubmissionRouting(
        domain="DSA",
        submission_type=SubmissionType.CODE.value,
        queue_name=queue_name_for_type(SubmissionType.CODE.value),
        worker_pool="judge-standard",
        judge_label="Standard Judge",
    ),
    "ML": SubmissionRouting(
        domain="ML",
        submission_type=SubmissionType.ML.value,
        queue_name=queue_name_for_type(SubmissionType.ML.value),
        worker_pool="judge-ml",
        judge_label="ML Judge",
    ),
    "CTF": SubmissionRouting(
        domain="CTF",
        submission_type=SubmissionType.PACKET.value,
        queue_name=queue_name_for_type(SubmissionType.PACKET.value),
        worker_pool="judge-cyber",
        judge_label="Cyber Judge",
    ),
}

ROUTING_BY_SUBMISSION_TYPE: dict[str, SubmissionRouting] = {
    route.submission_type: route
    for route in ROUTING_BY_DOMAIN.values()
}


def routing_for_domain(domain: str) -> SubmissionRouting:
    normalized = str(domain or "").upper()
    route = ROUTING_BY_DOMAIN.get(normalized)
    if route is None:
        raise ValueError(f"Unsupported problem domain: {domain}")
    return route


def routing_for_submission_type(submission_type: str) -> SubmissionRouting:
    normalized = str(submission_type or "").lower()
    route = ROUTING_BY_SUBMISSION_TYPE.get(normalized)
    if route is None:
        raise ValueError(f"Unsupported submission type: {submission_type}")
    return route


def routing_for_problem(problem: dict[str, Any]) -> SubmissionRouting:
    return routing_for_domain(str(problem.get("domain") or ""))
