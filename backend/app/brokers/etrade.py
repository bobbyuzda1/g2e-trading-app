"""E*TRADE brokerage adapter using OAuth 1.0a."""
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import urlencode, parse_qs
import httpx
from authlib.integrations.httpx_client import OAuth1Client

from app.config import get_settings
from app.models.brokerage import BrokerId
from app.brokers.base import IBrokerAdapter, BrokerFeatures, TokenSet
from app.brokers.models import (
    Account, Balance, Position, Quote, Order,
    OrderRequest, OrderResult, AssetType, OrderSide,
    OrderType, TimeInForce, OrderStatus,
)


class ETradeTokenSet:
    """E*TRADE OAuth 1.0a token set."""

    def __init__(
        self,
        access_token: str,
        access_token_secret: str,
        refresh_token: str | None = None,
        expires_at: int | None = None,
    ):
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        self.refresh_token = refresh_token
        self.expires_at = expires_at


class ETradeAdapter(IBrokerAdapter):
    """E*TRADE brokerage adapter using OAuth 1.0a."""

    # API endpoints
    SANDBOX_BASE = "https://apisb.etrade.com"
    PROD_BASE = "https://api.etrade.com"

    REQUEST_TOKEN_URL = "/oauth/request_token"
    AUTHORIZE_URL = "https://us.etrade.com/e/t/etws/authorize"
    ACCESS_TOKEN_URL = "/oauth/access_token"
    RENEW_TOKEN_URL = "/oauth/renew_access_token"

    def __init__(
        self,
        consumer_key: str | None = None,
        consumer_secret: str | None = None,
        sandbox: bool = True,
    ):
        settings = get_settings()
        self._consumer_key = consumer_key or settings.etrade_consumer_key
        self._consumer_secret = consumer_secret or settings.etrade_consumer_secret
        self._sandbox = sandbox
        self._base_url = self.SANDBOX_BASE if sandbox else self.PROD_BASE

    @property
    def broker_id(self) -> BrokerId:
        return BrokerId.ETRADE

    @property
    def broker_name(self) -> str:
        return "E*TRADE" + (" (Sandbox)" if self._sandbox else "")

    @property
    def features(self) -> BrokerFeatures:
        return BrokerFeatures(
            stock_trading=True,
            options_trading=True,
            crypto_trading=False,  # E*TRADE doesn't support crypto
            fractional_shares=False,
            extended_hours=True,
            short_selling=True,
            paper_trading=self._sandbox,
            real_time_quotes=True,
            token_refresh_days=1,  # Tokens expire at midnight ET
            requires_manual_reauth=True,  # Requires re-auth after 120 days
        )

    async def get_request_token(self) -> tuple[str, str]:
        """Get OAuth 1.0a request token (step 1 of 3-legged OAuth)."""
        client = OAuth1Client(
            client_id=self._consumer_key,
            client_secret=self._consumer_secret,
        )

        url = f"{self._base_url}{self.REQUEST_TOKEN_URL}"
        token = await client.fetch_request_token(url)

        return token["oauth_token"], token["oauth_token_secret"]

    def _build_authorize_url(self, request_token: str) -> str:
        """Build authorization URL for user to approve (step 2)."""
        params = {
            "key": self._consumer_key,
            "token": request_token,
        }
        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Get OAuth authorization URL.

        For E*TRADE OAuth 1.0a:
        1. First get request token
        2. Return authorize URL with request token

        The state parameter stores the request_token_secret for later use.
        """
        request_token, request_token_secret = await self.get_request_token()
        # Store request_token_secret in state (will need it for access token)
        # In practice, this should be stored securely server-side
        auth_url = self._build_authorize_url(request_token)
        return f"{auth_url}&callback={redirect_uri}"

    async def handle_oauth_callback(
        self,
        callback_data: dict,
        redirect_uri: str,
    ) -> TokenSet:
        """Exchange verifier for access tokens (step 3).

        callback_data should contain:
        - oauth_token: The request token
        - oauth_verifier: The verifier code from user authorization
        - oauth_token_secret: The request token secret (stored from step 1)
        """
        oauth_token = callback_data.get("oauth_token")
        oauth_verifier = callback_data.get("oauth_verifier")
        oauth_token_secret = callback_data.get("oauth_token_secret")

        if not all([oauth_token, oauth_verifier, oauth_token_secret]):
            raise ValueError("Missing OAuth callback parameters")

        client = OAuth1Client(
            client_id=self._consumer_key,
            client_secret=self._consumer_secret,
            token=oauth_token,
            token_secret=oauth_token_secret,
        )

        url = f"{self._base_url}{self.ACCESS_TOKEN_URL}"
        token = await client.fetch_access_token(url, verifier=oauth_verifier)

        return ETradeTokenSet(
            access_token=token["oauth_token"],
            access_token_secret=token["oauth_token_secret"],
        )

    async def refresh_token(self, refresh_token: str) -> TokenSet:
        """Renew access token (E*TRADE specific - tokens expire at midnight ET).

        For E*TRADE, refresh_token contains: access_token|access_token_secret
        """
        parts = refresh_token.split("|")
        if len(parts) != 2:
            raise ValueError("Invalid refresh token format")

        access_token, access_token_secret = parts

        client = OAuth1Client(
            client_id=self._consumer_key,
            client_secret=self._consumer_secret,
            token=access_token,
            token_secret=access_token_secret,
        )

        url = f"{self._base_url}{self.RENEW_TOKEN_URL}"
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                url,
                auth=client.auth,
            )
            response.raise_for_status()

        # Renewed token returns same token with extended expiry
        return ETradeTokenSet(
            access_token=access_token,
            access_token_secret=access_token_secret,
            refresh_token=refresh_token,
        )

    def _get_oauth_client(self, tokens: TokenSet) -> OAuth1Client:
        """Create OAuth1 client with tokens."""
        if isinstance(tokens, ETradeTokenSet):
            return OAuth1Client(
                client_id=self._consumer_key,
                client_secret=self._consumer_secret,
                token=tokens.access_token,
                token_secret=tokens.access_token_secret,
            )
        raise ValueError("Invalid token type for E*TRADE")

    async def get_accounts(self, tokens: TokenSet) -> list[Account]:
        """Get user accounts."""
        client = self._get_oauth_client(tokens)
        url = f"{self._base_url}/v1/accounts/list.json"

        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(url, auth=client.auth)
            response.raise_for_status()
            data = response.json()

        accounts = []
        for acct in data.get("AccountListResponse", {}).get("Accounts", {}).get("Account", []):
            accounts.append(Account(
                broker_id=self.broker_id,
                account_id=acct["accountId"],
                account_number=acct.get("accountIdKey", "")[-4:].rjust(8, "*"),
                account_type=acct.get("accountType", "INDIVIDUAL"),
                account_name=acct.get("accountDesc", "E*TRADE Account"),
                is_default=acct.get("accountStatus", "") == "ACTIVE",
            ))

        return accounts

    async def get_account_balance(self, account_id: str, tokens: TokenSet) -> Balance:
        """Get account balance."""
        client = self._get_oauth_client(tokens)
        url = f"{self._base_url}/v1/accounts/{account_id}/balance.json"

        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                url,
                params={"instType": "BROKERAGE", "realTimeNAV": "true"},
                auth=client.auth,
            )
            response.raise_for_status()
            data = response.json()

        balance_data = data.get("BalanceResponse", {})
        computed = balance_data.get("Computed", {})

        return Balance(
            broker_id=self.broker_id,
            account_id=account_id,
            cash_available=Decimal(str(computed.get("cashAvailableForInvestment", 0))),
            cash_balance=Decimal(str(computed.get("cashBalance", 0))),
            buying_power=Decimal(str(computed.get("cashBuyingPower", 0))),
            day_trading_buying_power=Decimal(str(computed.get("dtCashBuyingPower", 0))),
            portfolio_value=Decimal(str(computed.get("RealTimeValues", {}).get("totalAccountValue", 0))),
            margin_used=Decimal(str(computed.get("marginBuyingPower", 0))),
        )

    async def get_positions(self, account_id: str, tokens: TokenSet) -> list[Position]:
        """Get account positions."""
        client = self._get_oauth_client(tokens)
        url = f"{self._base_url}/v1/accounts/{account_id}/portfolio.json"

        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(url, auth=client.auth)
            response.raise_for_status()
            data = response.json()

        positions = []
        portfolio = data.get("PortfolioResponse", {}).get("AccountPortfolio", [])

        for acct_portfolio in portfolio:
            for pos in acct_portfolio.get("Position", []):
                product = pos.get("Product", {})
                symbol = product.get("symbol", "")

                # Determine asset type
                security_type = product.get("securityType", "EQ")
                if security_type == "OPTN":
                    asset_type = AssetType.OPTION
                elif security_type == "MF":
                    asset_type = AssetType.MUTUAL_FUND
                elif symbol.endswith(("ETF", "SPY", "QQQ", "VTI", "IWM")):
                    asset_type = AssetType.ETF
                else:
                    asset_type = AssetType.STOCK

                quantity = Decimal(str(pos.get("quantity", 0)))
                cost_basis = Decimal(str(pos.get("costPerShare", 0)))
                current_price = Decimal(str(pos.get("Quick", {}).get("lastTrade", 0)))
                market_value = Decimal(str(pos.get("marketValue", 0)))

                unrealized_pl = market_value - (quantity * cost_basis)
                unrealized_pl_pct = (unrealized_pl / (quantity * cost_basis) * 100) if cost_basis > 0 else Decimal(0)

                positions.append(Position(
                    broker_id=self.broker_id,
                    account_id=account_id,
                    symbol=symbol,
                    quantity=quantity,
                    average_cost=cost_basis,
                    current_price=current_price,
                    market_value=market_value,
                    unrealized_pl=unrealized_pl,
                    unrealized_pl_percent=unrealized_pl_pct,
                    asset_type=asset_type,
                    last_updated=datetime.now(timezone.utc),
                ))

        return positions

    async def get_orders(
        self,
        account_id: str,
        tokens: TokenSet,
        status: str | None = None,
    ) -> list[Order]:
        """Get account orders."""
        client = self._get_oauth_client(tokens)
        url = f"{self._base_url}/v1/accounts/{account_id}/orders.json"

        params = {}
        if status:
            params["status"] = status.upper()

        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(url, params=params, auth=client.auth)
            response.raise_for_status()
            data = response.json()

        orders = []
        for order_data in data.get("OrdersResponse", {}).get("Order", []):
            orders.append(self._parse_order(order_data, account_id))

        return orders

    def _parse_order(self, data: dict, account_id: str) -> Order:
        """Parse E*TRADE order response."""
        order_detail = data.get("OrderDetail", [{}])[0]
        instrument = order_detail.get("Instrument", [{}])[0]
        product = instrument.get("Product", {})

        # Map E*TRADE status
        status_map = {
            "OPEN": OrderStatus.OPEN,
            "EXECUTED": OrderStatus.FILLED,
            "CANCELLED": OrderStatus.CANCELED,
            "CANCEL_REQUESTED": OrderStatus.PENDING,
            "EXPIRED": OrderStatus.EXPIRED,
            "REJECTED": OrderStatus.REJECTED,
            "PARTIAL": OrderStatus.PARTIALLY_FILLED,
            "PENDING": OrderStatus.PENDING,
        }

        # Map order side
        side_map = {
            "BUY": OrderSide.BUY,
            "SELL": OrderSide.SELL,
            "BUY_TO_COVER": OrderSide.BUY_TO_COVER,
            "SELL_SHORT": OrderSide.SELL_SHORT,
        }

        # Map order type
        type_map = {
            "MARKET": OrderType.MARKET,
            "LIMIT": OrderType.LIMIT,
            "STOP": OrderType.STOP,
            "STOP_LIMIT": OrderType.STOP_LIMIT,
            "TRAILING_STOP_CNST": OrderType.TRAILING_STOP,
            "TRAILING_STOP_PRCT": OrderType.TRAILING_STOP,
        }

        # Map time in force
        tif_map = {
            "GOOD_FOR_DAY": TimeInForce.DAY,
            "GOOD_UNTIL_CANCEL": TimeInForce.GTC,
            "IMMEDIATE_OR_CANCEL": TimeInForce.IOC,
            "FILL_OR_KILL": TimeInForce.FOK,
        }

        return Order(
            broker_id=self.broker_id,
            account_id=account_id,
            order_id=str(data.get("orderId", "")),
            client_order_id=data.get("clientOrderId"),
            symbol=product.get("symbol", ""),
            side=side_map.get(order_detail.get("orderAction", ""), OrderSide.BUY),
            quantity=Decimal(str(instrument.get("orderedQuantity", 0))),
            filled_quantity=Decimal(str(instrument.get("filledQuantity", 0))),
            order_type=type_map.get(order_detail.get("priceType", ""), OrderType.MARKET),
            limit_price=Decimal(str(order_detail.get("limitPrice", 0))) if order_detail.get("limitPrice") else None,
            stop_price=Decimal(str(order_detail.get("stopPrice", 0))) if order_detail.get("stopPrice") else None,
            time_in_force=tif_map.get(order_detail.get("orderTerm", ""), TimeInForce.DAY),
            status=status_map.get(data.get("orderStatus", ""), OrderStatus.PENDING),
            submitted_at=datetime.now(timezone.utc),  # Would parse from placedTime
            filled_at=None,
            average_fill_price=Decimal(str(instrument.get("averageExecutionPrice", 0))) if instrument.get("averageExecutionPrice") else None,
        )

    async def get_quote(self, symbol: str, tokens: TokenSet) -> Quote:
        """Get quote for symbol."""
        quotes = await self.get_quotes([symbol], tokens)
        if not quotes:
            raise ValueError(f"No quote found for {symbol}")
        return quotes[0]

    async def get_quotes(self, symbols: list[str], tokens: TokenSet) -> list[Quote]:
        """Get quotes for multiple symbols."""
        client = self._get_oauth_client(tokens)
        url = f"{self._base_url}/v1/market/quote/{','.join(symbols)}.json"

        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(url, auth=client.auth)
            response.raise_for_status()
            data = response.json()

        quotes = []
        for quote_data in data.get("QuoteResponse", {}).get("QuoteData", []):
            product = quote_data.get("Product", {})
            all_data = quote_data.get("All", {})

            quotes.append(Quote(
                symbol=product.get("symbol", ""),
                bid=Decimal(str(all_data.get("bid", 0))),
                ask=Decimal(str(all_data.get("ask", 0))),
                last=Decimal(str(all_data.get("lastTrade", 0))),
                volume=int(all_data.get("totalVolume", 0)),
                change=Decimal(str(all_data.get("changeClose", 0))),
                change_percent=Decimal(str(all_data.get("changeClosePercentage", 0))),
                high=Decimal(str(all_data.get("high", 0))),
                low=Decimal(str(all_data.get("low", 0))),
                open=Decimal(str(all_data.get("open", 0))),
                previous_close=Decimal(str(all_data.get("previousClose", 0))),
                timestamp=datetime.now(timezone.utc),
                source=self.broker_id,
            ))

        return quotes

    async def place_order(
        self,
        account_id: str,
        order: OrderRequest,
        tokens: TokenSet,
    ) -> OrderResult:
        """Place an order."""
        client = self._get_oauth_client(tokens)

        # Build order payload for E*TRADE
        order_type_map = {
            OrderType.MARKET: "MARKET",
            OrderType.LIMIT: "LIMIT",
            OrderType.STOP: "STOP",
            OrderType.STOP_LIMIT: "STOP_LIMIT",
            OrderType.TRAILING_STOP: "TRAILING_STOP_CNST",
        }

        action_map = {
            OrderSide.BUY: "BUY",
            OrderSide.SELL: "SELL",
            OrderSide.BUY_TO_COVER: "BUY_TO_COVER",
            OrderSide.SELL_SHORT: "SELL_SHORT",
        }

        tif_map = {
            TimeInForce.DAY: "GOOD_FOR_DAY",
            TimeInForce.GTC: "GOOD_UNTIL_CANCEL",
            TimeInForce.IOC: "IMMEDIATE_OR_CANCEL",
            TimeInForce.FOK: "FILL_OR_KILL",
        }

        order_payload = {
            "orderType": "EQ",
            "clientOrderId": f"g2e_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "Order": [{
                "allOrNone": "false",
                "priceType": order_type_map.get(order.order_type, "MARKET"),
                "orderTerm": tif_map.get(order.time_in_force, "GOOD_FOR_DAY"),
                "marketSession": "EXTENDED" if order.extended_hours else "REGULAR",
                "Instrument": [{
                    "Product": {
                        "securityType": "EQ",
                        "symbol": order.symbol,
                    },
                    "orderAction": action_map.get(order.side, "BUY"),
                    "quantityType": "QUANTITY",
                    "quantity": str(order.quantity),
                }],
            }],
        }

        if order.limit_price:
            order_payload["Order"][0]["limitPrice"] = str(order.limit_price)
        if order.stop_price:
            order_payload["Order"][0]["stopPrice"] = str(order.stop_price)

        # First preview the order
        preview_url = f"{self._base_url}/v1/accounts/{account_id}/orders/preview.json"

        async with httpx.AsyncClient() as http_client:
            preview_response = await http_client.post(
                preview_url,
                json={"PreviewOrderRequest": order_payload},
                auth=client.auth,
            )

            if preview_response.status_code >= 400:
                error_data = preview_response.json()
                return OrderResult(
                    success=False,
                    message=error_data.get("Error", {}).get("message", "Preview failed"),
                )

            preview_data = preview_response.json()
            preview_ids = preview_data.get("PreviewOrderResponse", {}).get("PreviewIds", [{}])
            preview_id = preview_ids[0].get("previewId") if preview_ids else None

            if not preview_id:
                return OrderResult(success=False, message="Failed to get preview ID")

            # Now place the order
            place_url = f"{self._base_url}/v1/accounts/{account_id}/orders/place.json"
            order_payload["PreviewIds"] = [{"previewId": preview_id}]

            place_response = await http_client.post(
                place_url,
                json={"PlaceOrderRequest": order_payload},
                auth=client.auth,
            )

            if place_response.status_code >= 400:
                error_data = place_response.json()
                return OrderResult(
                    success=False,
                    message=error_data.get("Error", {}).get("message", "Order placement failed"),
                )

            place_data = place_response.json()
            order_response = place_data.get("PlaceOrderResponse", {})
            order_ids = order_response.get("OrderIds", [{}])
            order_id = order_ids[0].get("orderId") if order_ids else None

        return OrderResult(
            success=True,
            order_id=str(order_id) if order_id else None,
            message="Order placed successfully",
        )

    async def cancel_order(
        self,
        account_id: str,
        order_id: str,
        tokens: TokenSet,
    ) -> OrderResult:
        """Cancel an order."""
        client = self._get_oauth_client(tokens)
        url = f"{self._base_url}/v1/accounts/{account_id}/orders/cancel.json"

        cancel_payload = {
            "CancelOrderRequest": {
                "orderId": order_id,
            }
        }

        async with httpx.AsyncClient() as http_client:
            response = await http_client.put(url, json=cancel_payload, auth=client.auth)

            if response.status_code >= 400:
                error_data = response.json()
                return OrderResult(
                    success=False,
                    message=error_data.get("Error", {}).get("message", "Cancel failed"),
                )

        return OrderResult(success=True, message="Order canceled")
