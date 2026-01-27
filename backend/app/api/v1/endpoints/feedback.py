"""Feedback endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import get_cache, CacheService
from app.services.feedback_service import FeedbackService
from app.models.feedback import FeedbackType
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackResponse,
    UserRuleCreate,
    UserRuleResponse,
    UserPreferenceProfileResponse,
    FeedbackContextResponse,
)
from app.schemas.common import MessageResponse
from app.api.deps import CurrentUser

router = APIRouter(prefix="/feedback", tags=["Feedback"])


async def get_feedback_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
) -> FeedbackService:
    return FeedbackService(db, cache)


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def record_feedback(
    request: FeedbackCreate,
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
):
    """Record feedback on a recommendation."""
    feedback = await service.record_feedback(
        user_id=current_user.id,
        conversation_id=request.conversation_id,
        message_id=request.message_id,
        recommendation_symbol=request.recommendation_symbol,
        recommendation_action=request.recommendation_action,
        recommendation_summary=request.recommendation_summary,
        feedback_type=request.feedback_type,
        user_reasoning=request.user_reasoning,
        context_tags=request.context_tags,
    )
    return feedback


@router.get("", response_model=list[FeedbackResponse])
async def list_feedback(
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
    feedback_type: FeedbackType | None = None,
    limit: int = Query(20, ge=1, le=100),
):
    """List feedback history."""
    feedback = await service.get_feedback_history(
        user_id=current_user.id,
        limit=limit,
        feedback_type=feedback_type,
    )
    return feedback


@router.get("/profile", response_model=UserPreferenceProfileResponse | None)
async def get_preference_profile(
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
):
    """Get learned user preference profile."""
    profile = await service.get_preference_profile(current_user.id)
    if not profile:
        return None

    return UserPreferenceProfileResponse(
        learned_risk_tolerance=profile.learned_risk_tolerance,
        preferred_sectors=profile.preferred_sectors or {},
        avoided_sectors=profile.avoided_sectors or {},
        strategy_preferences=profile.strategy_preferences or {},
        avoided_patterns=profile.avoided_patterns or [],
        position_sizing_tendency=profile.position_sizing_tendency,
        timing_preferences=profile.timing_preferences or {},
        explicit_rules=profile.explicit_rules or [],
        feedback_summary=profile.feedback_summary,
        total_feedback_count=profile.total_feedback_count or 0,
        acceptance_rate=profile.acceptance_rate,
        profile_confidence=profile.profile_confidence,
    )


@router.get("/context", response_model=FeedbackContextResponse)
async def get_ai_context(
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
):
    """Get AI context generated from user feedback."""
    context = await service.get_ai_context(current_user.id)
    profile = await service.get_preference_profile(current_user.id)
    rules = await service.list_rules(current_user.id)

    # Determine confidence level
    if profile and profile.profile_confidence:
        if profile.profile_confidence >= 0.8:
            confidence = "high"
        elif profile.profile_confidence >= 0.5:
            confidence = "medium"
        else:
            confidence = "low"
    else:
        confidence = "none"

    return FeedbackContextResponse(
        context_text=context,
        rule_count=len(rules),
        preference_count=len(profile.preferred_sectors or {}) + len(profile.avoided_sectors or {}) if profile else 0,
        confidence_level=confidence,
    )


@router.get("/export")
async def export_profile(
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
):
    """Export user profile data for privacy compliance."""
    return await service.export_profile(current_user.id)


# Rules endpoints
@router.post("/rules", response_model=UserRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    request: UserRuleCreate,
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
):
    """Create an explicit trading rule."""
    rule = await service.add_rule(
        user_id=current_user.id,
        rule_text=request.rule_text,
        category=request.category,
    )
    return rule


@router.get("/rules", response_model=list[UserRuleResponse])
async def list_rules(
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
    active_only: bool = Query(True),
):
    """List user's explicit rules."""
    rules = await service.list_rules(
        user_id=current_user.id,
        active_only=active_only,
    )
    return rules


@router.delete("/rules/{rule_id}", response_model=MessageResponse)
async def delete_rule(
    rule_id: UUID,
    current_user: CurrentUser,
    service: Annotated[FeedbackService, Depends(get_feedback_service)],
):
    """Delete a rule."""
    success = await service.delete_rule(rule_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found",
        )
    return MessageResponse(message="Rule deleted")
