"""Trading endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import get_cache, CacheService
from app.services.trading import TradingService
from app.brokers.models import OrderRequest
from app.models.brokerage import BrokerId
from app.schemas.trading import (
    OrderPreviewRequest,
    OrderPreviewResponse,
    PlaceOrderRequest,
    OrderResponse,
    OrderResultResponse,
    CancelOrderRequest,
)
from app.api.deps import CurrentUser

router = APIRouter(prefix="/trading", tags=["Trading"])


async def get_trading_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
) -> TradingService:
    return TradingService(db, cache)


@router.post("/preview", response_model=OrderPreviewResponse)
async def preview_order(
    request: OrderPreviewRequest,
    current_user: CurrentUser,
    service: Annotated[TradingService, Depends(get_trading_service)],
):
    """Preview an order before execution.

    Returns estimated cost, buying power impact, risk assessment, and warnings.
    """
    preview = await service.preview_order(
        user_id=current_user.id,
        broker_id=BrokerId(request.broker_id),
        account_id=request.account_id,
        symbol=request.symbol,
        side=request.side,
        quantity=request.quantity,
        order_type=request.order_type,
        limit_price=request.limit_price,
        stop_price=request.stop_price,
    )

    return OrderPreviewResponse(
        symbol=preview.symbol,
        side=preview.side,
        quantity=preview.quantity,
        order_type=preview.order_type,
        estimated_cost=preview.estimated_cost,
        estimated_price=preview.estimated_price,
        buying_power_impact=preview.buying_power_impact,
        buying_power_after=preview.buying_power_after,
        position_after=preview.position_after,
        risk_assessment=preview.risk_assessment,
        warnings=preview.warnings,
        can_execute=preview.can_execute,
    )


@router.post("/orders", response_model=OrderResultResponse)
async def place_order(
    request: PlaceOrderRequest,
    current_user: CurrentUser,
    service: Annotated[TradingService, Depends(get_trading_service)],
):
    """Place an order."""
    order_request = OrderRequest(
        symbol=request.symbol,
        side=request.side,
        quantity=request.quantity,
        order_type=request.order_type,
        limit_price=request.limit_price,
        stop_price=request.stop_price,
        time_in_force=request.time_in_force,
        extended_hours=request.extended_hours,
    )

    result = await service.place_order(
        user_id=current_user.id,
        broker_id=BrokerId(request.broker_id),
        account_id=request.account_id,
        order_request=order_request,
    )

    return OrderResultResponse(
        success=result.success,
        order_id=result.order_id,
        message=result.message,
    )


@router.get("/orders", response_model=list[OrderResponse])
async def get_orders(
    current_user: CurrentUser,
    service: Annotated[TradingService, Depends(get_trading_service)],
    broker_id: str | None = Query(None, description="Filter by broker"),
    status: str | None = Query(None, description="Filter by status"),
):
    """Get all orders across connected brokerages."""
    broker = BrokerId(broker_id) if broker_id else None
    orders = await service.get_orders(current_user.id, broker, status)

    return [
        OrderResponse(
            broker_id=o.broker_id.value,
            account_id=o.account_id,
            order_id=o.order_id,
            client_order_id=o.client_order_id,
            symbol=o.symbol,
            side=o.side,
            quantity=o.quantity,
            filled_quantity=o.filled_quantity,
            order_type=o.order_type,
            limit_price=o.limit_price,
            stop_price=o.stop_price,
            time_in_force=o.time_in_force,
            status=o.status,
            submitted_at=o.submitted_at,
            filled_at=o.filled_at,
            average_fill_price=o.average_fill_price,
        )
        for o in orders
    ]


@router.delete("/orders", response_model=OrderResultResponse)
async def cancel_order(
    request: CancelOrderRequest,
    current_user: CurrentUser,
    service: Annotated[TradingService, Depends(get_trading_service)],
):
    """Cancel an order."""
    result = await service.cancel_order(
        user_id=current_user.id,
        broker_id=BrokerId(request.broker_id),
        account_id=request.account_id,
        order_id=request.order_id,
    )

    return OrderResultResponse(
        success=result.success,
        message=result.message,
    )
