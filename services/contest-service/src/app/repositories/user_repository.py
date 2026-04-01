"""User repository — async CRUD operations for users."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.logger import get_logger
from app.models.user import User

logger = get_logger(__name__)


class UserRepository:
    """Data-access layer for User entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, user: User) -> User:
        """Persist a new user."""
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        logger.info("Created user id='%s'", user.id)
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        """Fetch a user by primary key."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create(self, user_id: str) -> User:
        """Get existing user or create a new one with defaults.

        Auto-creates a user so contest joining works without
        a separate registration step.
        """
        user = await self.get_by_id(user_id)
        if user is None:
            user = User(
                id=user_id,
                display_name=user_id,
                email=f"{user_id}@contest.local",
            )
            user = await self.create(user)
        return user

    async def update_last_active(self, user_id: str) -> None:
        """Update user's last_active timestamp."""
        user = await self.get_by_id(user_id)
        if user:
            user.last_active = datetime.utcnow()
            self.session.add(user)
            await self.session.flush()
