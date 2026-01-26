"""Tests for Alpaca broker adapter."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from decimal import Decimal
from datetime import datetime, timezone

from app.brokers.alpaca import AlpacaAdapter, AlpacaTokenSet
from app.brokers.models import (
    OrderRequest,
    OrderSide,
    OrderType,
    TimeInForce,
    OrderStatus,
    AssetType,
)
from app.models.brokerage import BrokerId


@pytest.fixture
def alpaca_adapter():
    """Create a test Alpaca adapter."""
    return AlpacaAdapter(
        client_id="test_client_id",
        client_secret="test_client_secret",
        paper=True,
    )


@pytest.fixture
def live_alpaca_adapter():
    """Create a live Alpaca adapter."""
    return AlpacaAdapter(
        client_id="test_client_id",
        client_secret="test_client_secret",
        paper=False,
    )


@pytest.fixture
def mock_tokens():
    """Create mock tokens."""
    return AlpacaTokenSet(
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        expires_at=9999999999,
    )


class TestAlpacaAdapterProperties:
    """Tests for AlpacaAdapter properties."""

    def test_alpaca_broker_id(self, alpaca_adapter):
        """Test broker ID is correct."""
        assert alpaca_adapter.broker_id == BrokerId.ALPACA

    def test_alpaca_broker_name_paper(self, alpaca_adapter):
        """Test broker name for paper trading."""
        assert alpaca_adapter.broker_name == "Alpaca (Paper)"

    def test_alpaca_broker_name_live(self, live_alpaca_adapter):
        """Test broker name for live trading."""
        assert live_alpaca_adapter.broker_name == "Alpaca"

    def test_alpaca_features_include_crypto(self, alpaca_adapter):
        """Test broker features include crypto trading."""
        assert alpaca_adapter.features.crypto_trading is True
        assert alpaca_adapter.features.fractional_shares is True
        assert alpaca_adapter.features.paper_trading is True

    def test_alpaca_features_full(self, alpaca_adapter):
        """Test all broker features."""
        features = alpaca_adapter.features
        assert features.stock_trading is True
        assert features.options_trading is True
        assert features.crypto_trading is True
        assert features.fractional_shares is True
        assert features.extended_hours is True
        assert features.short_selling is True
        assert features.paper_trading is True
        assert features.real_time_quotes is True
        assert features.token_refresh_days == 0
        assert features.requires_manual_reauth is False

    def test_paper_api_url(self, alpaca_adapter):
        """Test paper trading uses correct API URL."""
        assert alpaca_adapter._api_url == "https://paper-api.alpaca.markets"

    def test_live_api_url(self, live_alpaca_adapter):
        """Test live trading uses correct API URL."""
        assert live_alpaca_adapter._api_url == "https://api.alpaca.markets"


class TestAlpacaAdapterOAuth:
    """Tests for AlpacaAdapter OAuth methods."""

    def test_alpaca_authorization_url(self, alpaca_adapter):
        """Test authorization URL building."""
        url = alpaca_adapter._build_auth_url("test_state", "http://localhost/callback")
        assert "https://app.alpaca.markets/oauth/authorize" in url
        assert "client_id=test_client_id" in url
        assert "state=test_state" in url
        assert "redirect_uri=http" in url
        assert "response_type=code" in url
        assert "scope=" in url

    @pytest.mark.asyncio
    async def test_get_authorization_url(self, alpaca_adapter):
        """Test async authorization URL method."""
        url = await alpaca_adapter.get_authorization_url("state123", "http://localhost/callback")
        assert "https://app.alpaca.markets/oauth/authorize" in url
        assert "state=state123" in url

    @pytest.mark.asyncio
    async def test_handle_oauth_callback_no_code(self, alpaca_adapter):
        """Test OAuth callback without code raises error."""
        with pytest.raises(ValueError, match="No authorization code"):
            await alpaca_adapter.handle_oauth_callback({}, "http://localhost/callback")

    @pytest.mark.asyncio
    async def test_handle_oauth_callback_success(self, alpaca_adapter):
        """Test successful OAuth callback."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
        }
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            tokens = await alpaca_adapter.handle_oauth_callback(
                {"code": "auth_code_123"},
                "http://localhost/callback",
            )

            assert tokens.access_token == "new_access_token"
            assert tokens.refresh_token == "new_refresh_token"
            assert tokens.expires_at is not None

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, alpaca_adapter):
        """Test successful token refresh."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "refreshed_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
        }
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            tokens = await alpaca_adapter.refresh_token("old_refresh_token")

            assert tokens.access_token == "refreshed_access_token"
            assert tokens.refresh_token == "new_refresh_token"


class TestAlpacaAdapterAccount:
    """Tests for AlpacaAdapter account methods."""

    @pytest.mark.asyncio
    async def test_get_accounts(self, alpaca_adapter, mock_tokens):
        """Test getting accounts."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "acc_123",
            "account_number": "1234567890",
            "account_type": "trading",
        }
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            accounts = await alpaca_adapter.get_accounts(mock_tokens)

            assert len(accounts) == 1
            assert accounts[0].account_id == "acc_123"
            assert accounts[0].account_number == "****7890"
            assert accounts[0].broker_id == BrokerId.ALPACA
            assert accounts[0].is_default is True

    @pytest.mark.asyncio
    async def test_get_account_balance(self, alpaca_adapter, mock_tokens):
        """Test getting account balance."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "acc_123",
            "cash": "10000.50",
            "buying_power": "40000.00",
            "daytrading_buying_power": "160000.00",
            "portfolio_value": "50000.00",
            "initial_margin": "5000.00",
        }
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            balance = await alpaca_adapter.get_account_balance("acc_123", mock_tokens)

            assert balance.broker_id == BrokerId.ALPACA
            assert balance.account_id == "acc_123"
            assert balance.cash_available == Decimal("10000.50")
            assert balance.buying_power == Decimal("40000.00")
            assert balance.day_trading_buying_power == Decimal("160000.00")
            assert balance.portfolio_value == Decimal("50000.00")
            assert balance.margin_used == Decimal("5000.00")


class TestAlpacaAdapterPositions:
    """Tests for AlpacaAdapter position methods."""

    @pytest.mark.asyncio
    async def test_get_positions(self, alpaca_adapter, mock_tokens):
        """Test getting positions."""
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {
                "symbol": "AAPL",
                "qty": "100",
                "avg_entry_price": "150.00",
                "current_price": "155.00",
                "market_value": "15500.00",
                "unrealized_pl": "500.00",
                "asset_class": "us_equity",
            },
            {
                "symbol": "BTC/USD",
                "qty": "0.5",
                "avg_entry_price": "40000.00",
                "current_price": "42000.00",
                "market_value": "21000.00",
                "unrealized_pl": "1000.00",
                "asset_class": "crypto",
            },
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            positions = await alpaca_adapter.get_positions("acc_123", mock_tokens)

            assert len(positions) == 2

            # Check stock position
            assert positions[0].symbol == "AAPL"
            assert positions[0].quantity == Decimal("100")
            assert positions[0].average_cost == Decimal("150.00")
            assert positions[0].current_price == Decimal("155.00")
            assert positions[0].asset_type == AssetType.STOCK

            # Check crypto position
            assert positions[1].symbol == "BTC/USD"
            assert positions[1].asset_type == AssetType.CRYPTO


class TestAlpacaAdapterOrders:
    """Tests for AlpacaAdapter order methods."""

    def test_parse_order(self, alpaca_adapter):
        """Test order parsing."""
        order_data = {
            "id": "order_123",
            "client_order_id": "client_123",
            "symbol": "AAPL",
            "side": "buy",
            "type": "limit",
            "qty": "10",
            "filled_qty": "5",
            "limit_price": "150.00",
            "time_in_force": "gtc",
            "status": "partially_filled",
            "submitted_at": "2024-01-15T10:30:00Z",
            "filled_at": None,
            "filled_avg_price": "149.50",
        }

        order = alpaca_adapter._parse_order(order_data, "acc_123")

        assert order.order_id == "order_123"
        assert order.symbol == "AAPL"
        assert order.side == OrderSide.BUY
        assert order.order_type == OrderType.LIMIT
        assert order.quantity == Decimal("10")
        assert order.filled_quantity == Decimal("5")
        assert order.limit_price == Decimal("150.00")
        assert order.time_in_force == TimeInForce.GTC
        assert order.status == OrderStatus.PARTIALLY_FILLED
        assert order.average_fill_price == Decimal("149.50")

    @pytest.mark.asyncio
    async def test_get_orders(self, alpaca_adapter, mock_tokens):
        """Test getting orders."""
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {
                "id": "order_1",
                "symbol": "AAPL",
                "side": "buy",
                "type": "market",
                "qty": "10",
                "filled_qty": "10",
                "time_in_force": "day",
                "status": "filled",
                "submitted_at": "2024-01-15T10:30:00Z",
                "filled_at": "2024-01-15T10:30:05Z",
                "filled_avg_price": "150.00",
            },
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            orders = await alpaca_adapter.get_orders("acc_123", mock_tokens)

            assert len(orders) == 1
            assert orders[0].order_id == "order_1"
            assert orders[0].status == OrderStatus.FILLED

    @pytest.mark.asyncio
    async def test_place_order_success(self, alpaca_adapter, mock_tokens):
        """Test successful order placement."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "new_order_123",
            "symbol": "AAPL",
            "side": "buy",
            "type": "limit",
            "qty": "10",
            "filled_qty": "0",
            "limit_price": "150.00",
            "time_in_force": "day",
            "status": "new",
            "submitted_at": "2024-01-15T10:30:00Z",
        }
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            order_request = OrderRequest(
                symbol="AAPL",
                side=OrderSide.BUY,
                quantity=Decimal("10"),
                order_type=OrderType.LIMIT,
                limit_price=Decimal("150.00"),
                time_in_force=TimeInForce.DAY,
            )

            result = await alpaca_adapter.place_order("acc_123", order_request, mock_tokens)

            assert result.success is True
            assert result.order_id == "new_order_123"
            assert result.order is not None
            assert result.order.symbol == "AAPL"

    @pytest.mark.asyncio
    async def test_cancel_order_success(self, alpaca_adapter, mock_tokens):
        """Test successful order cancellation."""
        mock_response = MagicMock()
        mock_response.status_code = 204

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.delete = AsyncMock(
                return_value=mock_response
            )

            result = await alpaca_adapter.cancel_order("acc_123", "order_123", mock_tokens)

            assert result.success is True
            assert result.order_id == "order_123"
            assert "canceled" in result.message.lower()


class TestAlpacaAdapterQuotes:
    """Tests for AlpacaAdapter quote methods."""

    @pytest.mark.asyncio
    async def test_get_quotes(self, alpaca_adapter, mock_tokens):
        """Test getting quotes."""
        mock_trades_response = MagicMock()
        mock_trades_response.json.return_value = {
            "trades": {
                "AAPL": {"p": 150.50, "t": "2024-01-15T10:30:00Z"},
            }
        }
        mock_trades_response.raise_for_status = MagicMock()

        mock_quotes_response = MagicMock()
        mock_quotes_response.json.return_value = {
            "quotes": {
                "AAPL": {"bp": 150.45, "ap": 150.55, "t": "2024-01-15T10:30:00Z"},
            }
        }
        mock_quotes_response.raise_for_status = MagicMock()

        mock_bars_response = MagicMock()
        mock_bars_response.json.return_value = {
            "bars": {
                "AAPL": {"o": 149.00, "h": 151.00, "l": 148.50, "c": 150.00, "v": 1000000},
            }
        }
        mock_bars_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = mock_client.return_value.__aenter__.return_value
            mock_instance.get = AsyncMock(
                side_effect=[mock_trades_response, mock_quotes_response, mock_bars_response]
            )

            quotes = await alpaca_adapter.get_quotes(["AAPL"], mock_tokens)

            assert len(quotes) == 1
            assert quotes[0].symbol == "AAPL"
            assert quotes[0].bid == Decimal("150.45")
            assert quotes[0].ask == Decimal("150.55")
            assert quotes[0].last == Decimal("150.50")
            assert quotes[0].source == BrokerId.ALPACA

    @pytest.mark.asyncio
    async def test_get_quote_single(self, alpaca_adapter, mock_tokens):
        """Test getting a single quote."""
        mock_trades_response = MagicMock()
        mock_trades_response.json.return_value = {
            "trades": {
                "AAPL": {"p": 150.50, "t": "2024-01-15T10:30:00Z"},
            }
        }
        mock_trades_response.raise_for_status = MagicMock()

        mock_quotes_response = MagicMock()
        mock_quotes_response.json.return_value = {
            "quotes": {
                "AAPL": {"bp": 150.45, "ap": 150.55},
            }
        }
        mock_quotes_response.raise_for_status = MagicMock()

        mock_bars_response = MagicMock()
        mock_bars_response.json.return_value = {
            "bars": {
                "AAPL": {"o": 149.00, "h": 151.00, "l": 148.50, "c": 150.00, "v": 1000000},
            }
        }
        mock_bars_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = mock_client.return_value.__aenter__.return_value
            mock_instance.get = AsyncMock(
                side_effect=[mock_trades_response, mock_quotes_response, mock_bars_response]
            )

            quote = await alpaca_adapter.get_quote("AAPL", mock_tokens)

            assert quote.symbol == "AAPL"
            assert quote.last == Decimal("150.50")


class TestAlpacaTokenSet:
    """Tests for AlpacaTokenSet."""

    def test_token_set_creation(self):
        """Test creating a token set."""
        tokens = AlpacaTokenSet(
            access_token="access123",
            refresh_token="refresh456",
            expires_at=1234567890,
        )

        assert tokens.access_token == "access123"
        assert tokens.refresh_token == "refresh456"
        assert tokens.expires_at == 1234567890

    def test_token_set_optional_fields(self):
        """Test token set with optional fields."""
        tokens = AlpacaTokenSet(access_token="access123")

        assert tokens.access_token == "access123"
        assert tokens.refresh_token is None
        assert tokens.expires_at is None


class TestAlpacaOrderStatusMapping:
    """Tests for order status mapping."""

    def test_all_alpaca_statuses_mapped(self, alpaca_adapter):
        """Test that all Alpaca statuses are mapped."""
        alpaca_statuses = [
            "new", "accepted", "pending_new", "accepted_for_bidding",
            "stopped", "rejected", "suspended", "calculated",
            "partially_filled", "filled", "done_for_day", "canceled",
            "expired", "replaced", "pending_cancel", "pending_replace", "held"
        ]

        for status in alpaca_statuses:
            assert status in alpaca_adapter.ORDER_STATUS_MAP

    def test_status_mapping_values(self, alpaca_adapter):
        """Test specific status mappings."""
        assert alpaca_adapter.ORDER_STATUS_MAP["filled"] == OrderStatus.FILLED
        assert alpaca_adapter.ORDER_STATUS_MAP["canceled"] == OrderStatus.CANCELED
        assert alpaca_adapter.ORDER_STATUS_MAP["rejected"] == OrderStatus.REJECTED
        assert alpaca_adapter.ORDER_STATUS_MAP["partially_filled"] == OrderStatus.PARTIALLY_FILLED
        assert alpaca_adapter.ORDER_STATUS_MAP["expired"] == OrderStatus.EXPIRED
