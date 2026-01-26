"""Chat endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import get_cache, CacheService
from app.services.conversation import ConversationService
from app.services.portfolio import PortfolioService
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.schemas.common import MessageResponse as ApiMessageResponse
from app.api.deps import CurrentUser

router = APIRouter(prefix="/chat", tags=["Chat"])


async def get_conversation_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
) -> ConversationService:
    return ConversationService(db, cache)


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: ConversationCreate,
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
):
    """Create a new conversation."""
    conversation = await service.create_conversation(
        user_id=current_user.id,
        title=request.title,
    )
    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=0,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all conversations for current user."""
    conversations = await service.list_conversations(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )

    results = []
    for conv in conversations:
        count = await service.get_message_count(conv.id)
        results.append(ConversationResponse(
            id=conv.id,
            user_id=conv.user_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=count,
        ))

    return results


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
):
    """Get a conversation with messages."""
    conversation = await service.get_conversation(conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    messages = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            input_tokens=m.input_tokens,
            output_tokens=m.output_tokens,
            model=m.model,
            created_at=m.created_at,
            updated_at=m.created_at,  # Messages don't have updated_at
        )
        for m in conversation.messages
    ]

    return ConversationDetailResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=len(messages),
        messages=messages,
    )


@router.delete("/conversations/{conversation_id}", response_model=ApiMessageResponse)
async def delete_conversation(
    conversation_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
):
    """Delete a conversation."""
    success = await service.delete_conversation(conversation_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return ApiMessageResponse(message="Conversation deleted")


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
):
    """Send a message and get AI response."""
    try:
        # Get portfolio context
        portfolio_service = PortfolioService(db, cache)
        try:
            summary = await portfolio_service.get_portfolio_summary(current_user.id)
            portfolio_context = f"Total Value: ${summary.total_value:,.2f}, Positions: {summary.total_positions}"
        except Exception:
            portfolio_context = None

        conversation, user_msg, assistant_msg = await service.chat(
            user_id=current_user.id,
            message=request.message,
            conversation_id=request.conversation_id,
            portfolio_context=portfolio_context,
        )

        return ChatResponse(
            conversation_id=conversation.id,
            message=MessageResponse(
                id=user_msg.id,
                conversation_id=user_msg.conversation_id,
                role=user_msg.role,
                content=user_msg.content,
                created_at=user_msg.created_at,
                updated_at=user_msg.created_at,
            ),
            response=MessageResponse(
                id=assistant_msg.id,
                conversation_id=assistant_msg.conversation_id,
                role=assistant_msg.role,
                content=assistant_msg.content,
                input_tokens=assistant_msg.input_tokens,
                output_tokens=assistant_msg.output_tokens,
                model=assistant_msg.model,
                created_at=assistant_msg.created_at,
                updated_at=assistant_msg.created_at,
            ),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
