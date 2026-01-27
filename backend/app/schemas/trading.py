"""Trading schemas."""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from app.schemas.common import BaseSchema
from app.brokers.models import OrderSide, OrderType, TimeInForce, OrderStatus


class OrderPreviewRequest(BaseSchema):
    """Order preview request."""
    broker_id: str
    account_id: str
    symbol: str
    side: OrderSide
    quantity: Decimal = Field(gt=0)
    order_type: OrderType = OrderType.MARKET
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None


class OrderPreviewResponse(BaseSchema):
    """Order preview response."""
    symbol: str
    side: OrderSide
    quantity: Decimal
    order_type: OrderType
    estimated_cost: Decimal
    estimated_price: Decimal
    buying_power_impact: Decimal
    buying_power_after: Decimal
    position_after: Decimal
    risk_assessment: dict
    warnings: list[str]
    can_execute: bool


class PlaceOrderRequest(BaseSchema):
    """Place order request."""
    broker_id: str
    account_id: str
    symbol: str
    side: OrderSide
    quantity: Decimal = Field(gt=0)
    order_type: OrderType = OrderType.MARKET
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    time_in_force: TimeInForce = TimeInForce.DAY
    extended_hours: bool = False


class OrderResponse(BaseSchema):
    """Order response."""
    broker_id: str
    account_id: str
    order_id: str
    client_order_id: str | None
    symbol: str
    side: OrderSide
    quantity: Decimal
    filled_quantity: Decimal
    order_type: OrderType
    limit_price: Decimal | None
    stop_price: Decimal | None
    time_in_force: TimeInForce
    status: OrderStatus
    submitted_at: datetime
    filled_at: datetime | None
    average_fill_price: Decimal | None


class OrderResultResponse(BaseSchema):
    """Order placement result response."""
    success: bool
    order_id: str | None = None
    message: str | None = None


class CancelOrderRequest(BaseSchema):
    """Cancel order request."""
    broker_id: str
    account_id: str
    order_id: str
