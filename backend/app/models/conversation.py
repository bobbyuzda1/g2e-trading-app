"""AI conversation models."""
from enum import Enum
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class MessageRole(str, Enum):
    """Message sender role."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """AI chat conversation."""

    __tablename__ = "conversations"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    # Context snapshot at conversation start
    # Contains: active_plan_id, strategy_id, portfolio_snapshot
    context_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


class Message(Base, UUIDMixin, TimestampMixin):
    """Individual message in a conversation."""

    __tablename__ = "messages"

    conversation_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[MessageRole] = mapped_column(
        SQLEnum(MessageRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Token counts for cost tracking
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Model used
    model: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Extra data (JSON)
    # Contains: tool_calls, citations, confidence_score
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
