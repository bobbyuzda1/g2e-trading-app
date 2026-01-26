"""Base broker adapter interface."""
from abc import ABC, abstractmethod
from typing import Protocol

from app.models.brokerage import BrokerId
from app.brokers.models import (
    Account,
    Balance,
    Position,
    Quote,
    Order,
    OrderRequest,
    OrderResult,
)


class BrokerFeatures:
    """Feature flags for broker capabilities."""

    def __init__(
        self,
        stock_trading: bool = True,
        options_trading: bool = False,
        crypto_trading: bool = False,
        fractional_shares: bool = False,
        extended_hours: bool = False,
        short_selling: bool = False,
        paper_trading: bool = False,
        real_time_quotes: bool = True,
        token_refresh_days: int = 0,
        requires_manual_reauth: bool = False,
    ):
        self.stock_trading = stock_trading
        self.options_trading = options_trading
        self.crypto_trading = crypto_trading
        self.fractional_shares = fractional_shares
        self.extended_hours = extended_hours
        self.short_selling = short_selling
        self.paper_trading = paper_trading
        self.real_time_quotes = real_time_quotes
        self.token_refresh_days = token_refresh_days
        self.requires_manual_reauth = requires_manual_reauth


class TokenSet(Protocol):
    """Protocol for OAuth tokens."""

    access_token: str
    refresh_token: str | None
    expires_at: int | None


class IBrokerAdapter(ABC):
    """Abstract base class for brokerage adapters."""

    @property
    @abstractmethod
    def broker_id(self) -> BrokerId:
        """Get broker identifier."""
        ...

    @property
    @abstractmethod
    def broker_name(self) -> str:
        """Get broker display name."""
        ...

    @property
    @abstractmethod
    def features(self) -> BrokerFeatures:
        """Get broker feature flags."""
        ...

    # Authentication
    @abstractmethod
    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Get OAuth authorization URL."""
        ...

    @abstractmethod
    async def handle_oauth_callback(
        self,
        callback_data: dict,
        redirect_uri: str,
    ) -> TokenSet:
        """Handle OAuth callback and exchange for tokens."""
        ...

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> TokenSet:
        """Refresh access token."""
        ...

    # Account
    @abstractmethod
    async def get_accounts(self, tokens: TokenSet) -> list[Account]:
        """Get user accounts."""
        ...

    @abstractmethod
    async def get_account_balance(
        self,
        account_id: str,
        tokens: TokenSet,
    ) -> Balance:
        """Get account balance."""
        ...

    # Portfolio
    @abstractmethod
    async def get_positions(
        self,
        account_id: str,
        tokens: TokenSet,
    ) -> list[Position]:
        """Get account positions."""
        ...

    @abstractmethod
    async def get_orders(
        self,
        account_id: str,
        tokens: TokenSet,
        status: str | None = None,
    ) -> list[Order]:
        """Get account orders."""
        ...

    # Market Data
    @abstractmethod
    async def get_quote(self, symbol: str, tokens: TokenSet) -> Quote:
        """Get quote for symbol."""
        ...

    @abstractmethod
    async def get_quotes(self, symbols: list[str], tokens: TokenSet) -> list[Quote]:
        """Get quotes for multiple symbols."""
        ...

    # Trading
    @abstractmethod
    async def place_order(
        self,
        account_id: str,
        order: OrderRequest,
        tokens: TokenSet,
    ) -> OrderResult:
        """Place an order."""
        ...

    @abstractmethod
    async def cancel_order(
        self,
        account_id: str,
        order_id: str,
        tokens: TokenSet,
    ) -> OrderResult:
        """Cancel an order."""
        ...
