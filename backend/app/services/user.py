"""User service for CRUD operations."""
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserUpdate


class UserService:
    """User service for CRUD operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: UUID) -> User | None:
        """Get user by ID."""
        stmt = select(User).where(User.id == user_id, User.is_active == True, User.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> User | None:
        """Get user by email."""
        stmt = select(User).where(User.email == email, User.is_active == True, User.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_user(self, user_id: UUID, user_data: UserUpdate) -> User | None:
        """Update user."""
        user = await self.get_user(user_id)
        if not user:
            return None

        update_data = user_data.model_dump(exclude_unset=True)

        # Hash password if provided
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete_user(self, user_id: UUID) -> bool:
        """Soft delete user."""
        user = await self.get_user(user_id)
        if not user:
            return False

        user.is_active = False
        await self.db.commit()
        return True

    async def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """List all active users (admin only)."""
        stmt = select(User).where(User.is_active == True, User.deleted_at.is_(None)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_users(self) -> int:
        """Count all active users."""
        stmt = select(func.count(User.id)).where(User.is_active == True, User.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar() or 0
