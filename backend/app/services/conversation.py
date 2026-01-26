"""Conversation service for chat history management."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message, MessageRole
from app.services.gemini import GeminiService, get_gemini_service
from app.services.portfolio import PortfolioService
from app.core.ai import AIRole
from app.core.cache import CacheService


class ConversationService:
    """Service for managing AI conversations."""

    def __init__(self, db: AsyncSession, cache: CacheService | None = None):
        self.db = db
        self.cache = cache
        self._gemini = get_gemini_service()

    async def create_conversation(
        self,
        user_id: UUID,
        title: str | None = None,
        context_snapshot: dict | None = None,
    ) -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(
            user_id=user_id,
            title=title or f"Chat {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
            context_snapshot=context_snapshot,
        )
        self.db.add(conversation)
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def get_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID,
    ) -> Conversation | None:
        """Get a conversation by ID."""
        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.deleted_at.is_(None),
        ).options(selectinload(Conversation.messages))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_conversations(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Conversation]:
        """List conversations for a user."""
        stmt = select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.deleted_at.is_(None),
        ).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Soft delete a conversation."""
        conversation = await self.get_conversation(conversation_id, user_id)
        if not conversation:
            return False

        conversation.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True

    async def add_message(
        self,
        conversation_id: UUID,
        role: MessageRole,
        content: str,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        model: str | None = None,
        metadata: dict | None = None,
    ) -> Message:
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=model,
            metadata=metadata,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_conversation_history(
        self,
        conversation_id: UUID,
        limit: int = 20,
    ) -> list[dict]:
        """Get conversation history in chat format."""
        stmt = select(Message).where(
            Message.conversation_id == conversation_id,
        ).order_by(Message.created_at.desc()).limit(limit)

        result = await self.db.execute(stmt)
        messages = list(result.scalars().all())

        # Reverse to get chronological order and convert to chat format
        return [
            {"role": m.role.value, "content": m.content}
            for m in reversed(messages)
        ]

    async def chat(
        self,
        user_id: UUID,
        message: str,
        conversation_id: UUID | None = None,
        portfolio_context: dict | None = None,
        feedback_context: str | None = None,
    ) -> tuple[Conversation, Message, Message]:
        """Send a chat message and get AI response.

        Returns:
            Tuple of (conversation, user_message, assistant_message)
        """
        # Get or create conversation
        if conversation_id:
            conversation = await self.get_conversation(conversation_id, user_id)
            if not conversation:
                raise ValueError("Conversation not found")
        else:
            conversation = await self.create_conversation(user_id)

        # Add user message
        user_message = await self.add_message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=message,
        )

        # Get conversation history
        history = await self.get_conversation_history(conversation.id)

        # Build context
        context_parts = []
        if portfolio_context:
            context_parts.append(f"User Portfolio:\n{portfolio_context}")
        if feedback_context:
            context_parts.append(f"User Preferences:\n{feedback_context}")

        context = "\n\n".join(context_parts) if context_parts else None

        # Generate AI response
        response_text, usage = await self._gemini.generate(
            prompt=message,
            context=context,
            history=history[:-1],  # Exclude the just-added message
        )

        # Add assistant message
        assistant_message = await self.add_message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
            model=usage.get("model"),
        )

        # Update conversation title if it's the first message
        if len(history) <= 1:
            # Generate a title from the first message
            title = message[:50] + "..." if len(message) > 50 else message
            conversation.title = title
            await self.db.commit()

        return conversation, user_message, assistant_message

    async def get_message_count(self, conversation_id: UUID) -> int:
        """Get message count for a conversation."""
        stmt = select(func.count(Message.id)).where(
            Message.conversation_id == conversation_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
