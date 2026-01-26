"""Feedback schemas."""
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import Field

from app.schemas.common import BaseSchema, TimestampSchema
from app.models.feedback import FeedbackType


class FeedbackCreate(BaseSchema):
    """Create feedback schema."""
    conversation_id: UUID | None = None
    message_id: UUID | None = None
    recommendation_symbol: str
    recommendation_action: str
    recommendation_summary: str
    feedback_type: FeedbackType
    user_reasoning: str | None = None
    context_tags: list[str] = Field(default_factory=list)


class FeedbackResponse(TimestampSchema):
    """Feedback response schema."""
    id: UUID
    user_id: UUID
    conversation_id: UUID | None
    recommendation_symbol: str
    recommendation_action: str
    feedback_type: FeedbackType
    user_reasoning: str | None
    extracted_preferences: dict | None


class UserRuleCreate(BaseSchema):
    """Create explicit user rule."""
    rule_text: str = Field(max_length=500)
    category: str = Field(max_length=50)


class UserRuleResponse(TimestampSchema):
    """User rule response."""
    id: UUID
    user_id: UUID
    rule_text: str
    category: str
    is_active: bool


class UserPreferenceProfileResponse(BaseSchema):
    """User preference profile response."""
    learned_risk_tolerance: float | None
    preferred_sectors: dict
    avoided_sectors: dict
    strategy_preferences: dict
    avoided_patterns: list[str]
    position_sizing_tendency: str | None
    timing_preferences: dict
    explicit_rules: list[str]
    feedback_summary: str | None
    total_feedback_count: int
    acceptance_rate: float | None
    profile_confidence: float | None


class FeedbackContextResponse(BaseSchema):
    """AI context from user feedback."""
    context_text: str
    rule_count: int
    preference_count: int
    confidence_level: str
