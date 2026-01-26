"""Portfolio schemas."""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.schemas.common import BaseSchema
from app.models.brokerage import BrokerId
from app.brokers.models import AssetType


class PositionResponse(BaseSchema):
    """Position response schema."""
    broker_id: str
    account_id: str
    symbol: str
    quantity: Decimal
    average_cost: Decimal
    current_price: Decimal
    market_value: Decimal
    unrealized_pl: Decimal
    unrealized_pl_percent: Decimal
    asset_type: AssetType
    last_updated: datetime


class BalanceResponse(BaseSchema):
    """Balance response schema."""
    broker_id: str
    account_id: str
    cash_available: Decimal
    cash_balance: Decimal
    buying_power: Decimal
    day_trading_buying_power: Decimal | None
    portfolio_value: Decimal
    margin_used: Decimal | None


class QuoteResponse(BaseSchema):
    """Quote response schema."""
    symbol: str
    bid: Decimal
    ask: Decimal
    last: Decimal
    volume: int
    change: Decimal
    change_percent: Decimal
    high: Decimal
    low: Decimal
    open: Decimal
    previous_close: Decimal
    timestamp: datetime
    source: str


class PortfolioSummaryResponse(BaseSchema):
    """Portfolio summary response."""
    total_value: Decimal
    total_cash: Decimal
    total_buying_power: Decimal
    total_positions: int
    total_unrealized_pl: Decimal
    total_unrealized_pl_percent: Decimal
    by_broker: dict
    last_updated: datetime
