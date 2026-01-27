"""Trading strategy models."""
from enum import Enum
from sqlalchemy import String, Text, Boolean, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class StrategySource(str, Enum):
    """How the strategy was created."""
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"
    AI_REFINED = "ai_refined"


class TradingStrategy(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """User's trading strategy configuration."""

    __tablename__ = "trading_strategies"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[StrategySource] = mapped_column(
        SQLEnum(StrategySource),
        default=StrategySource.MANUAL,
        nullable=False,
    )

    # Strategy configuration (JSON)
    # Contains: risk_tolerance, time_horizon, preferred_sectors, etc.
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Focus configuration (from stock/industry focus feature)
    # Contains: focus_type, focus_targets, related_tickers, news_keywords
    focus_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="trading_strategies")


class TradingPlan(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Term-based trading plan with specific objectives."""

    __tablename__ = "trading_plans"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    strategy_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trading_strategies.id", ondelete="SET NULL"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    term_type: Mapped[str] = mapped_column(String(20), nullable=False)  # short/medium/long

    # Plan objectives (JSON)
    # Contains: target_return, max_drawdown, sector_allocation, etc.
    objectives: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Progress tracking (JSON)
    # Contains: milestones, current_progress, metrics
    progress: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Note: Only one active plan per user (enforced at application level)
