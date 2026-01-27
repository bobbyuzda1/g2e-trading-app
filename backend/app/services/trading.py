"""Trading service for order management."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.brokerage import BrokerageService
from app.services.portfolio import PortfolioService
from app.brokers.models import OrderRequest, OrderResult, OrderSide, OrderType, TimeInForce, Order
from app.models.brokerage import ConnectionStatus, BrokerId
from app.core.cache import CacheService


class OrderPreview:
    """Preview of an order before execution."""

    def __init__(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        order_type: OrderType,
        estimated_cost: Decimal,
        estimated_price: Decimal,
        buying_power_impact: Decimal,
        buying_power_after: Decimal,
        position_after: Decimal,
        risk_assessment: dict,
        warnings: list[str],
        can_execute: bool,
    ):
        self.symbol = symbol
        self.side = side
        self.quantity = quantity
        self.order_type = order_type
        self.estimated_cost = estimated_cost
        self.estimated_price = estimated_price
        self.buying_power_impact = buying_power_impact
        self.buying_power_after = buying_power_after
        self.position_after = position_after
        self.risk_assessment = risk_assessment
        self.warnings = warnings
        self.can_execute = can_execute


class TradingService:
    """Service for trading operations."""

    def __init__(self, db: AsyncSession, cache: CacheService | None = None):
        self.db = db
        self.cache = cache
        self._brokerage_service = BrokerageService(db, cache)
        self._portfolio_service = PortfolioService(db, cache)

    async def preview_order(
        self,
        user_id: UUID,
        broker_id: BrokerId,
        account_id: str,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        order_type: OrderType,
        limit_price: Decimal | None = None,
        stop_price: Decimal | None = None,
    ) -> OrderPreview:
        """Preview an order before execution."""
        warnings = []
        can_execute = True

        # Get connection and tokens
        connections = await self._brokerage_service.get_connections(user_id)
        connection = next(
            (c for c in connections if c.broker_id == broker_id and c.status == ConnectionStatus.ACTIVE),
            None
        )

        if not connection:
            return OrderPreview(
                symbol=symbol,
                side=side,
                quantity=quantity,
                order_type=order_type,
                estimated_cost=Decimal("0"),
                estimated_price=Decimal("0"),
                buying_power_impact=Decimal("0"),
                buying_power_after=Decimal("0"),
                position_after=Decimal("0"),
                risk_assessment={"error": "No active connection"},
                warnings=["No active connection for this broker"],
                can_execute=False,
            )

        adapter = self._brokerage_service.get_adapter(broker_id)
        tokens = await self._brokerage_service.get_token_set(connection)

        # Get current quote
        try:
            quote = await adapter.get_quote(symbol, tokens)
            estimated_price = limit_price if limit_price else quote.last
        except Exception as e:
            estimated_price = limit_price or Decimal("0")
            warnings.append(f"Could not get quote: {str(e)}")

        # Get current balance and positions
        try:
            balance = await adapter.get_account_balance(account_id, tokens)
            positions = await adapter.get_positions(account_id, tokens)
        except Exception as e:
            return OrderPreview(
                symbol=symbol,
                side=side,
                quantity=quantity,
                order_type=order_type,
                estimated_cost=Decimal("0"),
                estimated_price=estimated_price,
                buying_power_impact=Decimal("0"),
                buying_power_after=Decimal("0"),
                position_after=Decimal("0"),
                risk_assessment={"error": str(e)},
                warnings=[f"Could not get account data: {str(e)}"],
                can_execute=False,
            )

        # Calculate estimated cost
        estimated_cost = quantity * estimated_price

        # Calculate buying power impact
        if side in [OrderSide.BUY, OrderSide.BUY_TO_COVER]:
            buying_power_impact = -estimated_cost
        else:
            buying_power_impact = estimated_cost

        buying_power_after = balance.buying_power + buying_power_impact

        # Check sufficient buying power for buys
        if side in [OrderSide.BUY, OrderSide.BUY_TO_COVER] and estimated_cost > balance.buying_power:
            warnings.append("Insufficient buying power")
            can_execute = False

        # Calculate position after trade
        current_position = next((p for p in positions if p.symbol.upper() == symbol.upper()), None)
        current_qty = current_position.quantity if current_position else Decimal("0")

        if side in [OrderSide.BUY, OrderSide.BUY_TO_COVER]:
            position_after = current_qty + quantity
        else:
            position_after = current_qty - quantity

        # Check if selling more than owned
        if side in [OrderSide.SELL] and quantity > current_qty:
            warnings.append("Selling more shares than owned")
            if not adapter.features.short_selling:
                warnings.append("This broker does not support short selling")
                can_execute = False

        # Risk assessment
        portfolio_concentration = Decimal("0")
        if balance.portfolio_value > 0:
            portfolio_concentration = (estimated_cost / balance.portfolio_value) * 100

        risk_assessment = {
            "portfolio_concentration_percent": float(portfolio_concentration),
            "is_concentrated": portfolio_concentration > Decimal("10"),
            "position_size_dollars": float(estimated_cost),
            "current_position_qty": float(current_qty),
            "broker_supports_feature": {
                "extended_hours": adapter.features.extended_hours,
                "fractional_shares": adapter.features.fractional_shares,
                "short_selling": adapter.features.short_selling,
            },
        }

        # Add warnings for high concentration
        if portfolio_concentration > Decimal("20"):
            warnings.append("High concentration: position would be >20% of portfolio")
        elif portfolio_concentration > Decimal("10"):
            warnings.append("Moderate concentration: position would be >10% of portfolio")

        return OrderPreview(
            symbol=symbol,
            side=side,
            quantity=quantity,
            order_type=order_type,
            estimated_cost=estimated_cost,
            estimated_price=estimated_price,
            buying_power_impact=buying_power_impact,
            buying_power_after=buying_power_after,
            position_after=position_after,
            risk_assessment=risk_assessment,
            warnings=warnings,
            can_execute=can_execute,
        )

    async def place_order(
        self,
        user_id: UUID,
        broker_id: BrokerId,
        account_id: str,
        order_request: OrderRequest,
    ) -> OrderResult:
        """Place an order."""
        # Get connection
        connections = await self._brokerage_service.get_connections(user_id)
        connection = next(
            (c for c in connections if c.broker_id == broker_id and c.status == ConnectionStatus.ACTIVE),
            None
        )

        if not connection:
            return OrderResult(success=False, message="No active connection for this broker")

        adapter = self._brokerage_service.get_adapter(broker_id)
        tokens = await self._brokerage_service.get_token_set(connection)

        return await adapter.place_order(account_id, order_request, tokens)

    async def cancel_order(
        self,
        user_id: UUID,
        broker_id: BrokerId,
        account_id: str,
        order_id: str,
    ) -> OrderResult:
        """Cancel an order."""
        connections = await self._brokerage_service.get_connections(user_id)
        connection = next(
            (c for c in connections if c.broker_id == broker_id and c.status == ConnectionStatus.ACTIVE),
            None
        )

        if not connection:
            return OrderResult(success=False, message="No active connection for this broker")

        adapter = self._brokerage_service.get_adapter(broker_id)
        tokens = await self._brokerage_service.get_token_set(connection)

        return await adapter.cancel_order(account_id, order_id, tokens)

    async def get_orders(
        self,
        user_id: UUID,
        broker_id: BrokerId | None = None,
        status: str | None = None,
    ) -> list[Order]:
        """Get all orders across brokerages."""
        connections = await self._brokerage_service.get_connections(user_id)
        active_connections = [c for c in connections if c.status == ConnectionStatus.ACTIVE]

        if broker_id:
            active_connections = [c for c in active_connections if c.broker_id == broker_id]

        all_orders = []

        for connection in active_connections:
            try:
                adapter = self._brokerage_service.get_adapter(connection.broker_id)
                tokens = await self._brokerage_service.get_token_set(connection)
                accounts = await adapter.get_accounts(tokens)

                for account in accounts:
                    orders = await adapter.get_orders(account.account_id, tokens, status)
                    all_orders.extend(orders)
            except Exception:
                continue

        return all_orders
