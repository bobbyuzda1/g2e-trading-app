"""Strategy schemas."""
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import Field

from app.schemas.common import BaseSchema, TimestampSchema
from app.models.strategy import StrategySource


class StrategyBase(BaseSchema):
    """Base strategy schema."""
    name: str = Field(max_length=100)
    description: str | None = None
    source: StrategySource = StrategySource.MANUAL
    config: dict = Field(default_factory=dict)
    focus_config: dict | None = None


class StrategyCreate(StrategyBase):
    """Create strategy schema."""
    pass


class StrategyUpdate(BaseSchema):
    """Update strategy schema."""
    name: str | None = Field(default=None, max_length=100)
    description: str | None = None
    config: dict | None = None
    focus_config: dict | None = None
    is_active: bool | None = None


class StrategyResponse(StrategyBase, TimestampSchema):
    """Strategy response schema."""
    id: UUID
    user_id: UUID
    is_active: bool


class StrategyAnalysisRequest(BaseSchema):
    """Request for strategy analysis."""
    strategy_id: UUID | None = None
    include_recommendations: bool = True


class StrategyAnalysisResponse(BaseSchema):
    """Strategy analysis response."""
    strategy_name: str
    alignment_score: Decimal
    analysis: str
    recommendations: list[dict]
    warnings: list[str]


class TradingPlanBase(BaseSchema):
    """Base trading plan schema."""
    name: str = Field(max_length=100)
    term_type: str  # short, medium, long
    objectives: dict = Field(default_factory=dict)


class TradingPlanCreate(TradingPlanBase):
    """Create trading plan schema."""
    strategy_id: UUID | None = None


class TradingPlanResponse(TradingPlanBase, TimestampSchema):
    """Trading plan response."""
    id: UUID
    user_id: UUID
    strategy_id: UUID | None
    progress: dict
    is_active: bool
