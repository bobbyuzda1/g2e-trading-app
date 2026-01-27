"""Strategy endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import get_cache, CacheService
from app.services.strategy import StrategyService
from app.services.portfolio import PortfolioService
from app.schemas.strategy import (
    StrategyCreate,
    StrategyUpdate,
    StrategyResponse,
    StrategyAnalysisRequest,
    StrategyAnalysisResponse,
    TradingPlanCreate,
    TradingPlanResponse,
)
from app.schemas.common import MessageResponse
from app.api.deps import CurrentUser

router = APIRouter(prefix="/strategies", tags=["Strategies"])


async def get_strategy_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
) -> StrategyService:
    return StrategyService(db, cache)


@router.get("/templates")
async def get_strategy_templates(
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Get list of pre-defined strategy templates."""
    return service.get_available_strategies()


@router.post("", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    request: StrategyCreate,
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Create a new trading strategy."""
    strategy = await service.create_strategy(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        source=request.source,
        config=request.config,
        focus_config=request.focus_config,
    )
    return strategy


@router.get("", response_model=list[StrategyResponse])
async def list_strategies(
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
    active_only: bool = Query(False),
):
    """List all strategies for current user."""
    strategies = await service.list_strategies(
        user_id=current_user.id,
        active_only=active_only,
    )
    return strategies


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: UUID,
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Get a specific strategy."""
    strategy = await service.get_strategy(strategy_id, current_user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )
    return strategy


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: UUID,
    request: StrategyUpdate,
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Update a strategy."""
    strategy = await service.update_strategy(
        strategy_id=strategy_id,
        user_id=current_user.id,
        **request.model_dump(exclude_unset=True),
    )
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )
    return strategy


@router.delete("/{strategy_id}", response_model=MessageResponse)
async def delete_strategy(
    strategy_id: UUID,
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Delete a strategy."""
    success = await service.delete_strategy(strategy_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )
    return MessageResponse(message="Strategy deleted")


@router.post("/analyze", response_model=StrategyAnalysisResponse)
async def analyze_strategy_alignment(
    request: StrategyAnalysisRequest,
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
):
    """Analyze portfolio alignment with strategy."""
    # Get portfolio data
    portfolio_service = PortfolioService(db, cache)
    try:
        summary = await portfolio_service.get_portfolio_summary(current_user.id)
        portfolio_data = {
            "total_value": float(summary.total_value),
            "total_positions": summary.total_positions,
            "unrealized_pl": float(summary.total_unrealized_pl),
            "by_broker": summary.by_broker,
        }
    except Exception:
        portfolio_data = None

    try:
        result = await service.analyze_portfolio_alignment(
            user_id=current_user.id,
            strategy_id=request.strategy_id,
            portfolio_data=portfolio_data,
        )
        return StrategyAnalysisResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# Trading Plans
@router.post("/plans", response_model=TradingPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_trading_plan(
    request: TradingPlanCreate,
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Create a new trading plan."""
    plan = await service.create_plan(
        user_id=current_user.id,
        name=request.name,
        term_type=request.term_type,
        objectives=request.objectives,
        strategy_id=request.strategy_id,
    )
    return plan


@router.get("/plans", response_model=list[TradingPlanResponse])
async def list_trading_plans(
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """List all trading plans."""
    plans = await service.list_plans(current_user.id)
    return plans


@router.get("/plans/active", response_model=TradingPlanResponse | None)
async def get_active_plan(
    current_user: CurrentUser,
    service: Annotated[StrategyService, Depends(get_strategy_service)],
):
    """Get the active trading plan."""
    plan = await service.get_active_plan(current_user.id)
    return plan
