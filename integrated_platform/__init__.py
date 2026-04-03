"""Shared integration runtime for the unified platform."""

from .config import Settings
from .models import CompetitionMode, SubmissionLifecycle, SubmissionType
from .queueing import RedisQueueManager, queue_name_for_type
from .routing import routing_for_domain, routing_for_problem, routing_for_submission_type

__all__ = [
    "CompetitionMode",
    "RedisQueueManager",
    "Settings",
    "SubmissionLifecycle",
    "SubmissionType",
    "queue_name_for_type",
    "routing_for_domain",
    "routing_for_problem",
    "routing_for_submission_type",
]
