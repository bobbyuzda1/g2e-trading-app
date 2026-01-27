"""Portfolio service for aggregating data across brokerages."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.brokerage import BrokerageService
from app.brokers.models import Balance, Position, Quote
from app.core.cache import CacheService
from app.models.brokerage import ConnectionStatus


class PortfolioSummary:
    """Aggregated portfolio summary across all brokerages."""

    def __init__(
        self,
        total_value: Decimal,
        total_cash: Decimal,
        total_buying_power: Decimal,
        total_positions: int,
        total_unrealized_pl: Decimal,
        total_unrealized_pl_percent: Decimal,
        by_broker: dict,
        last_updated: datetime,
    ):
        self.total_value = total_value
        self.total_cash = total_cash
        self.total_buying_power = total_buying_power
        self.total_positions = total_positions
        self.total_unrealized_pl = total_unrealized_pl
        self.total_unrealized_pl_percent = total_unrealized_pl_percent
        self.by_broker = by_broker
        self.last_updated = last_updated


class PortfolioService:
    """Service for portfolio aggregation and analysis."""

    def __init__(self, db: AsyncSession, cache: CacheService | None = None):
        self.db = db
        self.cache = cache
        self._brokerage_service = BrokerageService(db, cache)

    async def get_portfolio_summary(self, user_id: UUID) -> PortfolioSummary:
        """Get aggregated portfolio summary across all connected brokerages."""
        connections = await self._brokerage_service.get_connections(user_id)
        active_connections = [c for c in connections if c.status == ConnectionStatus.ACTIVE]

        total_value = Decimal("0")
        total_cash = Decimal("0")
        total_buying_power = Decimal("0")
        total_unrealized_pl = Decimal("0")
        total_cost_basis = Decimal("0")
        total_positions = 0
        by_broker = {}

        for connection in active_connections:
            try:
                adapter = self._brokerage_service.get_adapter(connection.broker_id)
                tokens = await self._brokerage_service.get_token_set(connection)

                # Get accounts for this connection
                accounts = await adapter.get_accounts(tokens)

                broker_data = {
                    "broker_id": connection.broker_id.value,
                    "broker_name": adapter.broker_name,
                    "accounts": [],
                    "total_value": Decimal("0"),
                    "total_cash": Decimal("0"),
                    "unrealized_pl": Decimal("0"),
                }

                for account in accounts:
                    balance = await adapter.get_account_balance(account.account_id, tokens)
                    positions = await adapter.get_positions(account.account_id, tokens)

                    account_unrealized_pl = sum(p.unrealized_pl for p in positions)
                    account_cost_basis = sum(p.quantity * p.average_cost for p in positions)

                    account_data = {
                        "account_id": account.account_id,
                        "account_name": account.account_name,
                        "portfolio_value": float(balance.portfolio_value),
                        "cash_available": float(balance.cash_available),
                        "buying_power": float(balance.buying_power),
                        "position_count": len(positions),
                        "unrealized_pl": float(account_unrealized_pl),
                    }
                    broker_data["accounts"].append(account_data)
                    broker_data["total_value"] += balance.portfolio_value
                    broker_data["total_cash"] += balance.cash_available
                    broker_data["unrealized_pl"] += account_unrealized_pl

                    total_value += balance.portfolio_value
                    total_cash += balance.cash_available
                    total_buying_power += balance.buying_power
                    total_unrealized_pl += account_unrealized_pl
                    total_cost_basis += account_cost_basis
                    total_positions += len(positions)

                by_broker[connection.broker_id.value] = broker_data

            except Exception as e:
                # Log error but continue with other brokers
                by_broker[connection.broker_id.value] = {
                    "broker_id": connection.broker_id.value,
                    "error": str(e),
                }

        # Calculate overall P/L percentage
        pl_percent = Decimal("0")
        if total_cost_basis > 0:
            pl_percent = (total_unrealized_pl / total_cost_basis) * 100

        return PortfolioSummary(
            total_value=total_value,
            total_cash=total_cash,
            total_buying_power=total_buying_power,
            total_positions=total_positions,
            total_unrealized_pl=total_unrealized_pl,
            total_unrealized_pl_percent=pl_percent,
            by_broker=by_broker,
            last_updated=datetime.now(timezone.utc),
        )

    async def get_all_positions(self, user_id: UUID) -> list[Position]:
        """Get all positions across all connected brokerages."""
        connections = await self._brokerage_service.get_connections(user_id)
        active_connections = [c for c in connections if c.status == ConnectionStatus.ACTIVE]

        all_positions = []

        for connection in active_connections:
            try:
                adapter = self._brokerage_service.get_adapter(connection.broker_id)
                tokens = await self._brokerage_service.get_token_set(connection)
                accounts = await adapter.get_accounts(tokens)

                for account in accounts:
                    positions = await adapter.get_positions(account.account_id, tokens)
                    all_positions.extend(positions)
            except Exception:
                continue

        return all_positions

    async def get_all_balances(self, user_id: UUID) -> list[Balance]:
        """Get all account balances across all connected brokerages."""
        connections = await self._brokerage_service.get_connections(user_id)
        active_connections = [c for c in connections if c.status == ConnectionStatus.ACTIVE]

        all_balances = []

        for connection in active_connections:
            try:
                adapter = self._brokerage_service.get_adapter(connection.broker_id)
                tokens = await self._brokerage_service.get_token_set(connection)
                accounts = await adapter.get_accounts(tokens)

                for account in accounts:
                    balance = await adapter.get_account_balance(account.account_id, tokens)
                    all_balances.append(balance)
            except Exception:
                continue

        return all_balances

    async def get_quotes(self, user_id: UUID, symbols: list[str]) -> list[Quote]:
        """Get quotes for symbols using the first available connection."""
        connections = await self._brokerage_service.get_connections(user_id)
        active_connections = [c for c in connections if c.status == ConnectionStatus.ACTIVE]

        if not active_connections:
            return []

        # Use first active connection for quotes
        connection = active_connections[0]
        adapter = self._brokerage_service.get_adapter(connection.broker_id)
        tokens = await self._brokerage_service.get_token_set(connection)

        return await adapter.get_quotes(symbols, tokens)

    async def get_position_by_symbol(self, user_id: UUID, symbol: str) -> list[Position]:
        """Get positions for a specific symbol across all brokerages."""
        all_positions = await self.get_all_positions(user_id)
        return [p for p in all_positions if p.symbol.upper() == symbol.upper()]
