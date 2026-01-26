"""User schemas."""
from uuid import UUID
from pydantic import EmailStr

from app.schemas.common import BaseSchema, TimestampSchema


class UserBase(BaseSchema):
    """Base user schema."""

    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None


class UserResponse(UserBase, TimestampSchema):
    """User response schema."""

    id: UUID
    is_active: bool


class TokenResponse(BaseSchema):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
