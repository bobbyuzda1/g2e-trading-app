"""User feedback models for learning user preferences."""
from enum import Enum
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, JSON, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class FeedbackType(str, Enum):
    """Type of feedback provided by user."""
    ACCEPT = "accept"
    REJECT = "reject"
    MODIFY = "modify"
    QUESTION = "question"


class RecommendationFeedback(Base, UUIDMixin, TimestampMixin):
    """Individual feedback entry on a trade recommendation.

    Captures user's response to AI recommendations for learning.
    """

    __tablename__ = "recommendation_feedback"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    conversation_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    message_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    # The recommendation that was given
    recommendation_symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    recommendation_action: Mapped[str] = mapped_column(String(20), nullable=False)  # BUY/SELL/HOLD
    recommendation_summary: Mapped[str] = mapped_column(Text, nullable=False)

    # User's feedback
    feedback_type: Mapped[FeedbackType] = mapped_column(
        SQLEnum(FeedbackType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    user_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI-extracted preferences from user reasoning (JSON)
    # Contains: risk_tolerance_signal, sector_preference, avoided_patterns, etc.
    extracted_preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Tags for categorization (e.g., ["earnings_avoidance", "prefers_dividends"])
    context_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # If feedback_type is MODIFY, what was changed
    original_position_size: Mapped[float | None] = mapped_column(Float, nullable=True)
    modified_position_size: Mapped[float | None] = mapped_column(Float, nullable=True)
    modification_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class UserPreferenceProfile(Base, UUIDMixin, TimestampMixin):
    """Synthesized user preference profile derived from feedback.

    This is the "Feedback Context" that gets included in AI prompts.
    Updated periodically as new feedback is collected.
    """

    __tablename__ = "user_preference_profiles"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One profile per user
    )

    # Learned risk tolerance (1-10 scale, derived from feedback patterns)
    learned_risk_tolerance: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)

    # Sector preferences with confidence scores (JSON)
    # Format: {"Technology": 0.85, "Healthcare": 0.72, ...}
    preferred_sectors: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Avoided sectors with reasons (JSON)
    # Format: {"Energy": "ESG concerns", "Chinese ADRs": "regulatory uncertainty"}
    avoided_sectors: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Strategy preferences with success rates (JSON)
    # Format: {"value": {"preference": 0.8, "success_rate": 0.65}, ...}
    strategy_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Patterns the user consistently avoids (JSON array)
    # Format: ["high_short_interest", "pre_earnings", "penny_stocks"]
    avoided_patterns: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Position sizing tendency
    position_sizing_tendency: Mapped[str] = mapped_column(
        String(20),
        default="moderate",
        nullable=False,
    )  # conservative, moderate, aggressive

    # Timing preferences (JSON)
    # Format: {"avoid_monday_opens": true, "prefer_limit_orders": true, ...}
    timing_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Explicit user-stated rules (JSON array of strings)
    explicit_rules: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Natural language summary for AI context injection
    feedback_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Metrics
    total_feedback_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    acceptance_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    modification_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    profile_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Is the profile in "learning mode" (< 10 interactions)
    is_learning_mode: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Is feedback collection paused by user
    is_paused: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    user = relationship("User", backref="preference_profile")


class ExplicitUserRule(Base, UUIDMixin, TimestampMixin):
    """Explicit rules stated by user that never decay.

    Examples:
    - "Never recommend stocks within 2 weeks of earnings"
    - "I prefer companies with positive free cash flow"
    - "Avoid Chinese ADRs due to regulatory uncertainty"
    """

    __tablename__ = "explicit_user_rules"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # The rule in natural language
    rule_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Parsed rule components for programmatic filtering (JSON)
    # Format: {"type": "earnings_buffer", "value": 14, "unit": "days"}
    parsed_rule: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Category for organization
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # e.g., "timing", "sector", "risk", "fundamentals"

    # Is the rule currently active
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Source of the rule
    source: Mapped[str] = mapped_column(
        String(20),
        default="user_stated",
        nullable=False,
    )  # user_stated, inferred_confirmed
