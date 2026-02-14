"""Chat schemas."""
from datetime import datetime
from uuid import UUID
from pydantic import Field

from app.schemas.common import BaseSchema, TimestampSchema
from app.models.conversation import MessageRole


class MessageBase(BaseSchema):
    """Base message schema."""
    role: MessageRole
    content: str


class MessageCreate(BaseSchema):
    """Create message schema."""
    content: str


class MessageResponse(MessageBase, TimestampSchema):
    """Message response schema."""
    id: UUID
    conversation_id: UUID
    input_tokens: int | None = None
    output_tokens: int | None = None
    model: str | None = None


class ConversationCreate(BaseSchema):
    """Create conversation schema."""
    title: str | None = Field(default=None, max_length=200)


class ConversationUpdate(BaseSchema):
    """Update conversation schema."""
    title: str = Field(max_length=200)


class ConversationResponse(TimestampSchema):
    """Conversation response schema."""
    id: UUID
    user_id: UUID
    title: str
    message_count: int = 0


class ConversationDetailResponse(ConversationResponse):
    """Conversation with messages."""
    messages: list[MessageResponse] = []


class ChatRequest(BaseSchema):
    """Chat request schema."""
    message: str
    conversation_id: UUID | None = None


class ChatResponse(BaseSchema):
    """Chat response schema."""
    conversation_id: UUID
    conversation_title: str | None = None
    message: MessageResponse
    response: MessageResponse


class StreamChatRequest(BaseSchema):
    """Streaming chat request."""
    message: str
    conversation_id: UUID | None = None
