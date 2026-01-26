"""Common schema definitions."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields."""

    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseSchema):
    """Generic paginated response."""

    items: list
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseSchema):
    """Simple message response."""

    message: str
    success: bool = True
