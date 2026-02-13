"""Alpaca brokerage adapter."""
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import urlencode
import httpx

from app.models.brokerage import BrokerId
from app.brokers.base import IBrokerAdapter, BrokerFeatures, TokenSet
from app.brokers.models import (
    Account,
    Balance,
    Position,
    Quote,
    Order,
    OrderRequest,
    OrderResult,
    AssetType,
    OrderSide,
    OrderType,
    TimeInForce,
    OrderStatus,
)


class AlpacaTokenSet:
    """Alpaca OAuth token set."""

    def __init__(
        self,
        access_token: str,
        refresh_token: str | None = None,
        expires_at: int | None = None,
    ):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = expires_at


class AlpacaAdapter(IBrokerAdapter):
    """Alpaca brokerage adapter implementation."""

    # API endpoints
    OAUTH_URL = "https://app.alpaca.markets/oauth/authorize"
    TOKEN_URL = "https://api.alpaca.markets/oauth/token"
    PAPER_API_URL = "https://paper-api.alpaca.markets"
    LIVE_API_URL = "https://api.alpaca.markets"
    DATA_URL = "https://data.alpaca.markets"

    # Order status mapping from Alpaca to our normalized status
    ORDER_STATUS_MAP = {
        "new": OrderStatus.OPEN,
        "accepted": OrderStatus.OPEN,
        "pending_new": OrderStatus.PENDING,
        "accepted_for_bidding": OrderStatus.OPEN,
        "stopped": OrderStatus.OPEN,
        "rejected": OrderStatus.REJECTED,
        "suspended": OrderStatus.OPEN,
        "calculated": OrderStatus.OPEN,
        "partially_filled": OrderStatus.PARTIALLY_FILLED,
        "filled": OrderStatus.FILLED,
        "done_for_day": OrderStatus.OPEN,
        "canceled": OrderStatus.CANCELED,
        "expired": OrderStatus.EXPIRED,
        "replaced": OrderStatus.CANCELED,
        "pending_cancel": OrderStatus.OPEN,
        "pending_replace": OrderStatus.OPEN,
        "held": OrderStatus.PENDING,
    }

    # Order side mapping
    ORDER_SIDE_MAP = {
        "buy": OrderSide.BUY,
        "sell": OrderSide.SELL,
    }

    # Order type mapping
    ORDER_TYPE_MAP = {
        "market": OrderType.MARKET,
        "limit": OrderType.LIMIT,
        "stop": OrderType.STOP,
        "stop_limit": OrderType.STOP_LIMIT,
        "trailing_stop": OrderType.TRAILING_STOP,
    }

    # Time in force mapping
    TIF_MAP = {
        "day": TimeInForce.DAY,
        "gtc": TimeInForce.GTC,
        "ioc": TimeInForce.IOC,
        "fok": TimeInForce.FOK,
    }

    # Reverse mappings for outgoing requests
    ORDER_SIDE_REVERSE = {
        OrderSide.BUY: "buy",
        OrderSide.SELL: "sell",
        OrderSide.BUY_TO_COVER: "buy",
        OrderSide.SELL_SHORT: "sell",
    }

    ORDER_TYPE_REVERSE = {
        OrderType.MARKET: "market",
        OrderType.LIMIT: "limit",
        OrderType.STOP: "stop",
        OrderType.STOP_LIMIT: "stop_limit",
        OrderType.TRAILING_STOP: "trailing_stop",
    }

    TIF_REVERSE = {
        TimeInForce.DAY: "day",
        TimeInForce.GTC: "gtc",
        TimeInForce.IOC: "ioc",
        TimeInForce.FOK: "fok",
    }

    def __init__(self, client_id: str, client_secret: str, paper: bool = True):
        self._client_id = client_id
        self._client_secret = client_secret
        self._paper = paper
        self._api_url = self.PAPER_API_URL if paper else self.LIVE_API_URL

    @property
    def broker_id(self) -> BrokerId:
        return BrokerId.ALPACA

    @property
    def broker_name(self) -> str:
        return "Alpaca" + (" (Paper)" if self._paper else "")

    @property
    def features(self) -> BrokerFeatures:
        return BrokerFeatures(
            stock_trading=True,
            options_trading=True,
            crypto_trading=True,
            fractional_shares=True,
            extended_hours=True,
            short_selling=True,
            paper_trading=True,
            real_time_quotes=True,
            token_refresh_days=0,
            requires_manual_reauth=False,
        )

    def _build_auth_url(self, state: str, redirect_uri: str) -> str:
        """Build OAuth authorization URL."""
        params = {
            "response_type": "code",
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "account:write trading data",
        }
        return f"{self.OAUTH_URL}?{urlencode(params)}"

    async def get_authorization_url(self, state: str, redirect_uri: str) -> tuple[str, dict]:
        """Get OAuth authorization URL."""
        return self._build_auth_url(state, redirect_uri), {}

    async def handle_oauth_callback(
        self,
        callback_data: dict,
        redirect_uri: str,
    ) -> TokenSet:
        """Handle OAuth callback and exchange code for tokens."""
        code = callback_data.get("code")
        if not code:
            raise ValueError("No authorization code in callback data")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "redirect_uri": redirect_uri,
                },
            )
            response.raise_for_status()
            data = response.json()

        # Calculate expiration timestamp if expires_in is provided
        expires_at = None
        if "expires_in" in data:
            expires_at = int(datetime.now(timezone.utc).timestamp()) + data["expires_in"]

        return AlpacaTokenSet(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=expires_at,
        )

    async def refresh_token(self, refresh_token: str) -> TokenSet:
        """Refresh access token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()

        # Calculate expiration timestamp if expires_in is provided
        expires_at = None
        if "expires_in" in data:
            expires_at = int(datetime.now(timezone.utc).timestamp()) + data["expires_in"]

        return AlpacaTokenSet(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", refresh_token),
            expires_at=expires_at,
        )

    def _get_headers(self, tokens: TokenSet) -> dict:
        """Get authorization headers for API requests."""
        return {
            "Authorization": f"Bearer {tokens.access_token}",
            "Accept": "application/json",
        }

    async def get_accounts(self, tokens: TokenSet) -> list[Account]:
        """Get user accounts. Alpaca has one account per user."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/account",
                headers=self._get_headers(tokens),
            )
            response.raise_for_status()
            data = response.json()

        account_number = data.get("account_number", "")
        masked_account = f"****{account_number[-4:]}" if len(account_number) >= 4 else account_number

        return [
            Account(
                broker_id=BrokerId.ALPACA,
                account_id=data["id"],
                account_number=masked_account,
                account_type=data.get("account_type", "trading"),
                account_name=f"Alpaca {data.get('account_type', 'Trading').title()} Account",
                is_default=True,
            )
        ]

    async def get_account_balance(
        self,
        account_id: str,
        tokens: TokenSet,
    ) -> Balance:
        """Get account balance."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/account",
                headers=self._get_headers(tokens),
            )
            response.raise_for_status()
            data = response.json()

        return Balance(
            broker_id=BrokerId.ALPACA,
            account_id=account_id,
            cash_available=Decimal(data.get("cash", "0")),
            cash_balance=Decimal(data.get("cash", "0")),
            buying_power=Decimal(data.get("buying_power", "0")),
            day_trading_buying_power=Decimal(data.get("daytrading_buying_power", "0"))
            if data.get("daytrading_buying_power")
            else None,
            portfolio_value=Decimal(data.get("portfolio_value", "0")),
            margin_used=Decimal(data.get("initial_margin", "0"))
            if data.get("initial_margin")
            else None,
        )

    async def get_positions(
        self,
        account_id: str,
        tokens: TokenSet,
    ) -> list[Position]:
        """Get account positions."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/positions",
                headers=self._get_headers(tokens),
            )
            response.raise_for_status()
            data = response.json()

        positions = []
        for pos in data:
            # Determine asset type
            asset_class = pos.get("asset_class", "us_equity")
            if asset_class == "crypto":
                asset_type = AssetType.CRYPTO
            elif pos.get("symbol", "").endswith("ETF"):
                asset_type = AssetType.ETF
            else:
                asset_type = AssetType.STOCK

            quantity = Decimal(pos.get("qty", "0"))
            avg_cost = Decimal(pos.get("avg_entry_price", "0"))
            current_price = Decimal(pos.get("current_price", "0"))
            market_value = Decimal(pos.get("market_value", "0"))
            unrealized_pl = Decimal(pos.get("unrealized_pl", "0"))

            # Calculate unrealized P/L percent
            cost_basis = quantity * avg_cost
            if cost_basis > 0:
                unrealized_pl_percent = (unrealized_pl / cost_basis) * 100
            else:
                unrealized_pl_percent = Decimal("0")

            positions.append(
                Position(
                    broker_id=BrokerId.ALPACA,
                    account_id=account_id,
                    symbol=pos.get("symbol", ""),
                    quantity=quantity,
                    average_cost=avg_cost,
                    current_price=current_price,
                    market_value=market_value,
                    unrealized_pl=unrealized_pl,
                    unrealized_pl_percent=unrealized_pl_percent,
                    asset_type=asset_type,
                    last_updated=datetime.now(timezone.utc),
                )
            )

        return positions

    def _parse_order(self, data: dict, account_id: str) -> Order:
        """Parse Alpaca order response to normalized Order model."""
        # Parse timestamps
        submitted_at = datetime.fromisoformat(
            data["submitted_at"].replace("Z", "+00:00")
        ) if data.get("submitted_at") else datetime.now(timezone.utc)

        filled_at = None
        if data.get("filled_at"):
            filled_at = datetime.fromisoformat(
                data["filled_at"].replace("Z", "+00:00")
            )

        # Map status
        alpaca_status = data.get("status", "new").lower()
        status = self.ORDER_STATUS_MAP.get(alpaca_status, OrderStatus.PENDING)

        # Map side
        alpaca_side = data.get("side", "buy").lower()
        side = self.ORDER_SIDE_MAP.get(alpaca_side, OrderSide.BUY)

        # Map order type
        alpaca_type = data.get("type", "market").lower()
        order_type = self.ORDER_TYPE_MAP.get(alpaca_type, OrderType.MARKET)

        # Map time in force
        alpaca_tif = data.get("time_in_force", "day").lower()
        tif = self.TIF_MAP.get(alpaca_tif, TimeInForce.DAY)

        return Order(
            broker_id=BrokerId.ALPACA,
            account_id=account_id,
            order_id=data.get("id", ""),
            client_order_id=data.get("client_order_id"),
            symbol=data.get("symbol", ""),
            side=side,
            quantity=Decimal(data.get("qty", "0")),
            filled_quantity=Decimal(data.get("filled_qty", "0")),
            order_type=order_type,
            limit_price=Decimal(data["limit_price"]) if data.get("limit_price") else None,
            stop_price=Decimal(data["stop_price"]) if data.get("stop_price") else None,
            time_in_force=tif,
            status=status,
            submitted_at=submitted_at,
            filled_at=filled_at,
            average_fill_price=Decimal(data["filled_avg_price"])
            if data.get("filled_avg_price")
            else None,
        )

    async def get_orders(
        self,
        account_id: str,
        tokens: TokenSet,
        status: str | None = None,
    ) -> list[Order]:
        """Get account orders."""
        params = {}
        if status:
            # Map our status to Alpaca status
            if status == "open":
                params["status"] = "open"
            elif status == "closed":
                params["status"] = "closed"
            elif status == "all":
                params["status"] = "all"
            else:
                params["status"] = status

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/orders",
                headers=self._get_headers(tokens),
                params=params,
            )
            response.raise_for_status()
            data = response.json()

        return [self._parse_order(order, account_id) for order in data]

    async def get_quote(self, symbol: str, tokens: TokenSet) -> Quote:
        """Get quote for a single symbol."""
        quotes = await self.get_quotes([symbol], tokens)
        if not quotes:
            raise ValueError(f"No quote found for symbol: {symbol}")
        return quotes[0]

    async def get_quotes(self, symbols: list[str], tokens: TokenSet) -> list[Quote]:
        """Get quotes for multiple symbols."""
        async with httpx.AsyncClient() as client:
            # Get latest trades
            trades_response = await client.get(
                f"{self.DATA_URL}/v2/stocks/trades/latest",
                headers=self._get_headers(tokens),
                params={"symbols": ",".join(symbols)},
            )
            trades_response.raise_for_status()
            trades_data = trades_response.json().get("trades", {})

            # Get latest quotes (bid/ask)
            quotes_response = await client.get(
                f"{self.DATA_URL}/v2/stocks/quotes/latest",
                headers=self._get_headers(tokens),
                params={"symbols": ",".join(symbols)},
            )
            quotes_response.raise_for_status()
            quotes_data = quotes_response.json().get("quotes", {})

            # Get bars for OHLCV data
            bars_response = await client.get(
                f"{self.DATA_URL}/v2/stocks/bars/latest",
                headers=self._get_headers(tokens),
                params={"symbols": ",".join(symbols)},
            )
            bars_response.raise_for_status()
            bars_data = bars_response.json().get("bars", {})

        quotes = []
        for symbol in symbols:
            trade = trades_data.get(symbol, {})
            quote = quotes_data.get(symbol, {})
            bar = bars_data.get(symbol, {})

            last_price = Decimal(str(trade.get("p", 0)))
            previous_close = Decimal(str(bar.get("c", last_price)))
            change = last_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else Decimal("0")

            # Parse timestamp
            timestamp_str = trade.get("t") or quote.get("t")
            if timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            else:
                timestamp = datetime.now(timezone.utc)

            quotes.append(
                Quote(
                    symbol=symbol,
                    bid=Decimal(str(quote.get("bp", 0))),
                    ask=Decimal(str(quote.get("ap", 0))),
                    last=last_price,
                    volume=int(bar.get("v", 0)),
                    change=change,
                    change_percent=change_percent,
                    high=Decimal(str(bar.get("h", 0))),
                    low=Decimal(str(bar.get("l", 0))),
                    open=Decimal(str(bar.get("o", 0))),
                    previous_close=previous_close,
                    timestamp=timestamp,
                    source=BrokerId.ALPACA,
                )
            )

        return quotes

    async def place_order(
        self,
        account_id: str,
        order: OrderRequest,
        tokens: TokenSet,
    ) -> OrderResult:
        """Place an order."""
        # Build order payload
        payload = {
            "symbol": order.symbol,
            "qty": str(order.quantity),
            "side": self.ORDER_SIDE_REVERSE.get(order.side, "buy"),
            "type": self.ORDER_TYPE_REVERSE.get(order.order_type, "market"),
            "time_in_force": self.TIF_REVERSE.get(order.time_in_force, "day"),
        }

        # Add price fields based on order type
        if order.limit_price is not None:
            payload["limit_price"] = str(order.limit_price)
        if order.stop_price is not None:
            payload["stop_price"] = str(order.stop_price)

        # Extended hours trading
        if order.extended_hours:
            payload["extended_hours"] = True

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self._api_url}/v2/orders",
                    headers=self._get_headers(tokens),
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            parsed_order = self._parse_order(data, account_id)
            return OrderResult(
                success=True,
                order_id=data.get("id"),
                message="Order placed successfully",
                order=parsed_order,
            )
        except httpx.HTTPStatusError as e:
            error_message = str(e)
            try:
                error_data = e.response.json()
                error_message = error_data.get("message", str(e))
            except Exception:
                pass
            return OrderResult(
                success=False,
                order_id=None,
                message=f"Order failed: {error_message}",
                order=None,
            )

    async def cancel_order(
        self,
        account_id: str,
        order_id: str,
        tokens: TokenSet,
    ) -> OrderResult:
        """Cancel an order."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self._api_url}/v2/orders/{order_id}",
                    headers=self._get_headers(tokens),
                )
                # 204 No Content is success for cancel
                if response.status_code == 204:
                    return OrderResult(
                        success=True,
                        order_id=order_id,
                        message="Order canceled successfully",
                        order=None,
                    )
                response.raise_for_status()

            return OrderResult(
                success=True,
                order_id=order_id,
                message="Order canceled successfully",
                order=None,
            )
        except httpx.HTTPStatusError as e:
            error_message = str(e)
            try:
                error_data = e.response.json()
                error_message = error_data.get("message", str(e))
            except Exception:
                pass
            return OrderResult(
                success=False,
                order_id=order_id,
                message=f"Cancel failed: {error_message}",
                order=None,
            )
