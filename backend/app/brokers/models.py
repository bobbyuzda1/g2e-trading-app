"""Broker-agnostic data models for the abstraction layer."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel

from app.models.brokerage import BrokerId


class AssetType(str, Enum):
    """Asset type enumeration."""
    STOCK = "stock"
    ETF = "etf"
    OPTION = "option"
    CRYPTO = "crypto"
    MUTUAL_FUND = "mutual_fund"


class OrderSide(str, Enum):
    """Order side enumeration."""
    BUY = "buy"
    SELL = "sell"
    BUY_TO_COVER = "buy_to_cover"
    SELL_SHORT = "sell_short"


class OrderType(str, Enum):
    """Order type enumeration."""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"


class TimeInForce(str, Enum):
    """Time in force enumeration."""
    DAY = "day"
    GTC = "gtc"  # Good till canceled
    IOC = "ioc"  # Immediate or cancel
    FOK = "fok"  # Fill or kill


class OrderStatus(str, Enum):
    """Order status enumeration."""
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELED = "canceled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Account(BaseModel):
    """Normalized account model."""

    broker_id: BrokerId
    account_id: str
    account_number: str  # Masked
    account_type: str
    account_name: str
    is_default: bool = False


class Balance(BaseModel):
    """Normalized balance model."""

    broker_id: BrokerId
    account_id: str
    cash_available: Decimal
    cash_balance: Decimal
    buying_power: Decimal
    day_trading_buying_power: Decimal | None = None
    portfolio_value: Decimal
    margin_used: Decimal | None = None


class Position(BaseModel):
    """Normalized position model."""

    broker_id: BrokerId
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


class Quote(BaseModel):
    """Normalized quote model."""

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
    source: BrokerId


class OrderRequest(BaseModel):
    """Order request model."""

    symbol: str
    side: OrderSide
    quantity: Decimal
    order_type: OrderType
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    time_in_force: TimeInForce = TimeInForce.DAY
    extended_hours: bool = False


class Order(BaseModel):
    """Normalized order model."""

    broker_id: BrokerId
    account_id: str
    order_id: str
    client_order_id: str | None = None
    symbol: str
    side: OrderSide
    quantity: Decimal
    filled_quantity: Decimal
    order_type: OrderType
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    time_in_force: TimeInForce
    status: OrderStatus
    submitted_at: datetime
    filled_at: datetime | None = None
    average_fill_price: Decimal | None = None


class OrderResult(BaseModel):
    """Order placement result."""

    success: bool
    order_id: str | None = None
    message: str | None = None
    order: Order | None = None
