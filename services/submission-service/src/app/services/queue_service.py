"""Queue publishing service."""

from app.logger import get_logger
from app.models.submission import Submission
from app.rabbitmq import rabbitmq_client
from app.utils.queue_utils import format_judge_message

logger = get_logger(__name__)


class QueueService:
    """Handles publishing submissions to RabbitMQ."""

    async def publish_submission(
        self,
        submission: Submission,
        *,
        target_queue: str,
        problem_type: str | None = None,
    ) -> tuple[bool, str | None]:
        """Publish a submission to the selected judge queue."""
        message_body = format_judge_message(
            submission_id=submission.id,  # type: ignore[arg-type]
            problem_id=submission.problem_id,
            code=submission.code,
            language=submission.language,
            problem_type=problem_type,
            user_id=submission.user_id,
            contest_id=submission.contest_id,
            retry_count=submission.retries,
        )

        correlation_id = str(submission.id)
        success, msg_id = await rabbitmq_client.publish(
            message_body,
            correlation_id,
            target_queue,
        )

        if success:
            logger.info(
                "submission_id=%s | operation=publish | queue=%s | queue_status=published",
                submission.id,
                target_queue,
            )
            return True, msg_id

        logger.warning(
            "submission_id=%s | operation=publish | queue=%s | queue_status=failed (RabbitMQ unavailable)",
            submission.id,
            target_queue,
        )
        return False, None
