"""Queue publishing service.

Encapsulates the logic for publishing submission messages
to RabbitMQ with error handling and status updates.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.logger import get_logger
from app.models.submission import Submission
from app.rabbitmq import rabbitmq_client
from app.repositories.submission_repository import SubmissionRepository
from app.utils.queue_utils import format_judge_message

logger = get_logger(__name__)


class QueueService:
    """Handles publishing submissions to RabbitMQ.

    On success, updates submission status to QUEUED.
    On failure, updates to QUEUE_FAILED but does not raise —
    the submission is still saved in the database.
    """

    def __init__(self) -> None:
        self.repository = SubmissionRepository()

    async def publish_submission(
        self, session: AsyncSession, submission: Submission
    ) -> bool:
        """Publish a submission to the judge queue.

        Args:
            session: Active database session.
            submission: The submission to publish.

        Returns:
            True if published successfully, False otherwise.
        """
        message_body = format_judge_message(
            submission_id=submission.id,  # type: ignore[arg-type]
            problem_id=submission.problem_id,
            code=submission.code,
            language=submission.language,
            user_id=submission.user_id,
            retry_count=submission.retries,
        )

        correlation_id = str(submission.id)
        success, msg_id = await rabbitmq_client.publish(message_body, correlation_id)

        if success:
            await self.repository.update_status(
                session, submission, status="QUEUED", queue_id=correlation_id
            )
            logger.info(
                "submission_id=%s | operation=publish | queue_status=published",
                submission.id,
            )
            return True
        else:
            # Don't update to QUEUE_FAILED — leave as PENDING for later retry
            submission.queue_id = None
            session.add(submission)
            await session.flush()
            logger.warning(
                "submission_id=%s | operation=publish | queue_status=failed (RabbitMQ unavailable)",
                submission.id,
            )
            return False
