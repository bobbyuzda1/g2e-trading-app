"""Portfolio endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import get_cache, CacheService
from app.services.portfolio import PortfolioService
from app.schemas.portfolio import (
    PortfolioSummaryResponse,
    PositionResponse,
    BalanceResponse,
    QuoteResponse,
)
from app.api.deps import CurrentUser

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


async def get_portfolio_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
) -> PortfolioService:
    return PortfolioService(db, cache)


@router.get("/summary", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(
    current_user: CurrentUser,
    service: Annotated[PortfolioService, Depends(get_portfolio_service)],
):
    """Get aggregated portfolio summary across all connected brokerages."""
    summary = await service.get_portfolio_summary(current_user.id)
    return PortfolioSummaryResponse(
        total_value=summary.total_value,
        total_cash=summary.total_cash,
        total_buying_power=summary.total_buying_power,
        total_positions=summary.total_positions,
        total_unrealized_pl=summary.total_unrealized_pl,
        total_unrealized_pl_percent=summary.total_unrealized_pl_percent,
        by_broker=summary.by_broker,
        last_updated=summary.last_updated,
    )


@router.get("/positions", response_model=list[PositionResponse])
async def get_all_positions(
    current_user: CurrentUser,
    service: Annotated[PortfolioService, Depends(get_portfolio_service)],
    symbol: str | None = Query(None, description="Filter by symbol"),
):
    """Get all positions across all connected brokerages."""
    if symbol:
        positions = await service.get_position_by_symbol(current_user.id, symbol)
    else:
        positions = await service.get_all_positions(current_user.id)

    return [
        PositionResponse(
            broker_id=p.broker_id.value,
            account_id=p.account_id,
            symbol=p.symbol,
            quantity=p.quantity,
            average_cost=p.average_cost,
            current_price=p.current_price,
            market_value=p.market_value,
            unrealized_pl=p.unrealized_pl,
            unrealized_pl_percent=p.unrealized_pl_percent,
            asset_type=p.asset_type,
            last_updated=p.last_updated,
        )
        for p in positions
    ]


@router.get("/balances", response_model=list[BalanceResponse])
async def get_all_balances(
    current_user: CurrentUser,
    service: Annotated[PortfolioService, Depends(get_portfolio_service)],
):
    """Get all account balances across all connected brokerages."""
    balances = await service.get_all_balances(current_user.id)
    return [
        BalanceResponse(
            broker_id=b.broker_id.value,
            account_id=b.account_id,
            cash_available=b.cash_available,
            cash_balance=b.cash_balance,
            buying_power=b.buying_power,
            day_trading_buying_power=b.day_trading_buying_power,
            portfolio_value=b.portfolio_value,
            margin_used=b.margin_used,
        )
        for b in balances
    ]


@router.get("/quotes", response_model=list[QuoteResponse])
async def get_quotes(
    current_user: CurrentUser,
    service: Annotated[PortfolioService, Depends(get_portfolio_service)],
    symbols: str = Query(..., description="Comma-separated list of symbols"),
):
    """Get quotes for specified symbols."""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    quotes = await service.get_quotes(current_user.id, symbol_list)
    return [
        QuoteResponse(
            symbol=q.symbol,
            bid=q.bid,
            ask=q.ask,
            last=q.last,
            volume=q.volume,
            change=q.change,
            change_percent=q.change_percent,
            high=q.high,
            low=q.low,
            open=q.open,
            previous_close=q.previous_close,
            timestamp=q.timestamp,
            source=q.source.value,
        )
        for q in quotes
    ]
