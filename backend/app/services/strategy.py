"""Strategy service for managing trading strategies and plans."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.strategy import TradingStrategy, TradingPlan, StrategySource
from app.services.gemini import GeminiService, get_gemini_service
from app.services.portfolio import PortfolioService
from app.core.cache import CacheService


# Strategy knowledge base - extracted from G2E-knowledge.md
STRATEGY_KNOWLEDGE = {
    "value_investing": {
        "name": "Value Investing",
        "description": "Buy undervalued stocks based on fundamental analysis",
        "metrics": ["P/E ratio", "P/B ratio", "Free cash flow", "Debt/equity"],
        "time_horizon": "long",
        "risk_level": "medium",
    },
    "growth_investing": {
        "name": "Growth Investing",
        "description": "Invest in companies with high earnings growth potential",
        "metrics": ["Revenue growth", "EPS growth", "Market expansion"],
        "time_horizon": "long",
        "risk_level": "high",
    },
    "dividend_growth": {
        "name": "Dividend Growth (DRIP to FIRE)",
        "description": "Build passive income through dividend-paying stocks",
        "metrics": ["Dividend yield", "Payout ratio", "Dividend growth rate"],
        "time_horizon": "long",
        "risk_level": "low",
    },
    "momentum_trading": {
        "name": "Momentum Trading",
        "description": "Follow price trends and market momentum",
        "metrics": ["RSI", "MACD", "Moving averages", "Volume"],
        "time_horizon": "short",
        "risk_level": "high",
    },
    "swing_trading": {
        "name": "Swing Trading",
        "description": "Capture short-term price swings over days to weeks",
        "metrics": ["Support/resistance", "Chart patterns", "Volume"],
        "time_horizon": "short",
        "risk_level": "high",
    },
    "day_trading": {
        "name": "Day Trading",
        "description": "Intraday trading with no overnight positions",
        "metrics": ["Level 2 data", "Volume", "Volatility", "Time of day"],
        "time_horizon": "intraday",
        "risk_level": "very_high",
    },
    "covered_calls": {
        "name": "Covered Calls / Wheel Strategy",
        "description": "Generate income by selling options on owned stocks",
        "metrics": ["IV rank", "Delta", "Days to expiration", "Premium"],
        "time_horizon": "medium",
        "risk_level": "medium",
    },
    "pairs_trading": {
        "name": "Pairs Trading",
        "description": "Trade correlated securities when spread diverges",
        "metrics": ["Correlation", "Spread z-score", "Cointegration"],
        "time_horizon": "medium",
        "risk_level": "medium",
    },
    "mean_reversion": {
        "name": "Mean Reversion",
        "description": "Bet on prices returning to historical averages",
        "metrics": ["Bollinger Bands", "RSI", "Historical volatility"],
        "time_horizon": "short",
        "risk_level": "medium",
    },
}


class StrategyService:
    """Service for managing trading strategies and analysis."""

    def __init__(self, db: AsyncSession, cache: CacheService | None = None):
        self.db = db
        self.cache = cache
        self._gemini = get_gemini_service()

    async def create_strategy(
        self,
        user_id: UUID,
        name: str,
        description: str | None = None,
        source: StrategySource = StrategySource.MANUAL,
        config: dict | None = None,
        focus_config: dict | None = None,
    ) -> TradingStrategy:
        """Create a new trading strategy."""
        strategy = TradingStrategy(
            user_id=user_id,
            name=name,
            description=description,
            source=source,
            config=config or {},
            focus_config=focus_config,
        )
        self.db.add(strategy)
        await self.db.commit()
        await self.db.refresh(strategy)
        return strategy

    async def get_strategy(
        self,
        strategy_id: UUID,
        user_id: UUID,
    ) -> TradingStrategy | None:
        """Get a strategy by ID."""
        stmt = select(TradingStrategy).where(
            TradingStrategy.id == strategy_id,
            TradingStrategy.user_id == user_id,
            TradingStrategy.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_strategies(
        self,
        user_id: UUID,
        active_only: bool = False,
    ) -> list[TradingStrategy]:
        """List all strategies for a user."""
        stmt = select(TradingStrategy).where(
            TradingStrategy.user_id == user_id,
            TradingStrategy.deleted_at.is_(None),
        )
        if active_only:
            stmt = stmt.where(TradingStrategy.is_active == True)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_strategy(
        self,
        strategy_id: UUID,
        user_id: UUID,
        **updates,
    ) -> TradingStrategy | None:
        """Update a strategy."""
        strategy = await self.get_strategy(strategy_id, user_id)
        if not strategy:
            return None

        for field, value in updates.items():
            if value is not None and hasattr(strategy, field):
                setattr(strategy, field, value)

        await self.db.commit()
        await self.db.refresh(strategy)
        return strategy

    async def delete_strategy(
        self,
        strategy_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Soft delete a strategy."""
        strategy = await self.get_strategy(strategy_id, user_id)
        if not strategy:
            return False

        strategy.deleted_at = datetime.now(timezone.utc)
        strategy.is_active = False
        await self.db.commit()
        return True

    async def analyze_portfolio_alignment(
        self,
        user_id: UUID,
        strategy_id: UUID | None = None,
        portfolio_data: dict | None = None,
    ) -> dict:
        """Analyze how well portfolio aligns with strategy."""
        # Get active strategy if not specified
        if not strategy_id:
            strategies = await self.list_strategies(user_id, active_only=True)
            if strategies:
                strategy = strategies[0]
            else:
                return {
                    "strategy_name": "None",
                    "alignment_score": Decimal("0"),
                    "analysis": "No active strategy configured. Create a strategy to get alignment analysis.",
                    "recommendations": [],
                    "warnings": ["No active strategy"],
                }
        else:
            strategy = await self.get_strategy(strategy_id, user_id)
            if not strategy:
                raise ValueError("Strategy not found")

        # Get strategy knowledge if it matches a known strategy
        strategy_key = strategy.name.lower().replace(" ", "_")
        strategy_info = STRATEGY_KNOWLEDGE.get(strategy_key, {})

        # Build analysis context
        context = f"""
Strategy: {strategy.name}
Description: {strategy.description or 'N/A'}
Configuration: {json.dumps(strategy.config, indent=2)}
Strategy Type Info: {json.dumps(strategy_info, indent=2) if strategy_info else 'Custom strategy'}

Portfolio Data:
{json.dumps(portfolio_data, indent=2, default=str) if portfolio_data else 'No portfolio data available'}
"""

        # Use AI to analyze alignment
        result = await self._gemini.analyze_portfolio(
            portfolio_data=portfolio_data or {},
            strategy_name=strategy.name,
            user_preferences=strategy.config,
        )

        # Calculate alignment score based on analysis
        # This is a simplified scoring - in production, would use more sophisticated analysis
        alignment_score = Decimal("75")  # Default moderate alignment
        warnings = []

        if not portfolio_data or portfolio_data.get("total_positions", 0) == 0:
            alignment_score = Decimal("0")
            warnings.append("No positions to analyze")

        return {
            "strategy_name": strategy.name,
            "alignment_score": alignment_score,
            "analysis": result["analysis"],
            "recommendations": [],
            "warnings": warnings,
        }

    def get_available_strategies(self) -> list[dict]:
        """Get list of pre-defined strategy templates."""
        return [
            {
                "key": key,
                "name": info["name"],
                "description": info["description"],
                "time_horizon": info["time_horizon"],
                "risk_level": info["risk_level"],
            }
            for key, info in STRATEGY_KNOWLEDGE.items()
        ]

    # Trading Plan methods
    async def create_plan(
        self,
        user_id: UUID,
        name: str,
        term_type: str,
        objectives: dict,
        strategy_id: UUID | None = None,
    ) -> TradingPlan:
        """Create a new trading plan."""
        plan = TradingPlan(
            user_id=user_id,
            strategy_id=strategy_id,
            name=name,
            term_type=term_type,
            objectives=objectives,
            progress={},
        )
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan

    async def get_active_plan(self, user_id: UUID) -> TradingPlan | None:
        """Get the active trading plan for a user."""
        stmt = select(TradingPlan).where(
            TradingPlan.user_id == user_id,
            TradingPlan.is_active == True,
            TradingPlan.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_plans(self, user_id: UUID) -> list[TradingPlan]:
        """List all trading plans for a user."""
        stmt = select(TradingPlan).where(
            TradingPlan.user_id == user_id,
            TradingPlan.deleted_at.is_(None),
        ).order_by(TradingPlan.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())
