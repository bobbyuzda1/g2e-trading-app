"""Brokerage connection service."""
from datetime import datetime, timezone
from uuid import UUID
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brokerage import BrokerageConnection, BrokerageAccount, BrokerId, ConnectionStatus
from app.brokers import IBrokerAdapter, AlpacaAdapter, ETradeAdapter
from app.brokers.alpaca import AlpacaTokenSet
from app.brokers.etrade import ETradeTokenSet
from app.core.cache import CacheService
from app.config import get_settings

settings = get_settings()


class BrokerageService:
    """Service for managing brokerage connections."""

    def __init__(self, db: AsyncSession, cache: CacheService | None = None):
        self.db = db
        self.cache = cache
        self._adapters: dict[BrokerId, IBrokerAdapter] = {}
        # In-memory store for OAuth state (in production, use Redis/DB)
        self._oauth_states: dict[str, dict] = {}

    def get_adapter(self, broker_id: BrokerId) -> IBrokerAdapter:
        """Get or create broker adapter."""
        if broker_id not in self._adapters:
            if broker_id == BrokerId.ALPACA:
                self._adapters[broker_id] = AlpacaAdapter(
                    client_id=settings.alpaca_client_id,
                    client_secret=settings.alpaca_client_secret,
                    paper=settings.alpaca_paper,
                )
            elif broker_id == BrokerId.ETRADE:
                self._adapters[broker_id] = ETradeAdapter(
                    consumer_key=settings.etrade_consumer_key,
                    consumer_secret=settings.etrade_consumer_secret,
                    sandbox=settings.etrade_sandbox,
                )
            else:
                raise ValueError(f"Unsupported broker: {broker_id}")
        return self._adapters[broker_id]

    async def initiate_connection(
        self,
        user_id: UUID,
        broker_id: BrokerId,
        redirect_uri: str,
    ) -> tuple[str, str]:
        """Initiate OAuth connection flow. Returns (auth_url, state)."""
        adapter = self.get_adapter(broker_id)
        state = secrets.token_urlsafe(32)

        # Store state for verification (in cache if available, otherwise in-memory)
        state_data = {
            "user_id": str(user_id),
            "broker_id": broker_id.value,
            "redirect_uri": redirect_uri,
        }

        cache_ok = False
        if self.cache:
            cache_ok = await self.cache.set(
                f"oauth_state:{state}",
                state_data,
                ttl=600,  # 10 minutes
            )
        if not cache_ok:
            self._oauth_states[state] = state_data

        # Create pending connection record
        connection = BrokerageConnection(
            user_id=user_id,
            broker_id=broker_id,
            status=ConnectionStatus.PENDING,
        )
        self.db.add(connection)
        await self.db.commit()

        auth_url = await adapter.get_authorization_url(state, redirect_uri)
        return auth_url, state

    async def complete_connection(
        self,
        user_id: UUID,
        broker_id: BrokerId,
        callback_data: dict,
        redirect_uri: str,
    ) -> BrokerageConnection:
        """Complete OAuth flow and save connection."""
        # Find pending connection
        stmt = select(BrokerageConnection).where(
            BrokerageConnection.user_id == user_id,
            BrokerageConnection.broker_id == broker_id,
            BrokerageConnection.status == ConnectionStatus.PENDING,
        )
        result = await self.db.execute(stmt)
        connection = result.scalar_one_or_none()

        if not connection:
            raise ValueError("No pending connection found")

        # Verify state
        state = callback_data.get("state")
        state_data = None
        if self.cache:
            state_data = await self.cache.get(f"oauth_state:{state}")
        if not state_data:
            state_data = self._oauth_states.get(state)

        if not state_data:
            raise ValueError("Invalid or expired state parameter")

        if state_data.get("user_id") != str(user_id):
            raise ValueError("State does not match user")

        adapter = self.get_adapter(broker_id)
        tokens = await adapter.handle_oauth_callback(callback_data, redirect_uri)

        # Update connection
        connection.status = ConnectionStatus.ACTIVE
        connection.connected_at = datetime.now(timezone.utc)

        # Store tokens in cache for now (production should use secrets manager)
        # The token_secret_id field would reference the secrets manager in production
        token_key = CacheService.token_key(str(user_id), broker_id.value)
        if self.cache:
            if broker_id == BrokerId.ALPACA:
                token_data = {
                    "access_token": tokens.access_token,
                    "refresh_token": getattr(tokens, "refresh_token", None),
                }
            elif broker_id == BrokerId.ETRADE:
                token_data = {
                    "access_token": tokens.access_token,
                    "access_token_secret": getattr(tokens, "access_token_secret", ""),
                }
            else:
                token_data = {"access_token": tokens.access_token}

            await self.cache.set(token_key, token_data, ttl=CacheService.TTL_TOKEN)
            connection.token_secret_id = token_key

        # Set expiration if provided
        if hasattr(tokens, "expires_at") and tokens.expires_at:
            connection.expires_at = datetime.fromtimestamp(tokens.expires_at, tz=timezone.utc)

        # Fetch and store accounts
        accounts = await adapter.get_accounts(tokens)
        for acct in accounts:
            db_account = BrokerageAccount(
                connection_id=connection.id,
                user_id=user_id,
                broker_id=broker_id,
                broker_account_id=acct.account_id,
                account_number_masked=acct.account_number,
                account_type=acct.account_type,
                account_name=acct.account_name,
                is_default=acct.is_default,
            )
            self.db.add(db_account)

        # Clean up state
        if self.cache:
            await self.cache.delete(f"oauth_state:{state}")
        elif state in self._oauth_states:
            del self._oauth_states[state]

        await self.db.commit()
        await self.db.refresh(connection)
        return connection

    async def get_connections(self, user_id: UUID) -> list[BrokerageConnection]:
        """Get all connections for a user."""
        stmt = select(BrokerageConnection).where(
            BrokerageConnection.user_id == user_id,
            BrokerageConnection.status != ConnectionStatus.REVOKED,
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_connection(self, connection_id: UUID, user_id: UUID) -> BrokerageConnection | None:
        """Get a specific connection."""
        stmt = select(BrokerageConnection).where(
            BrokerageConnection.id == connection_id,
            BrokerageConnection.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def disconnect(self, connection_id: UUID, user_id: UUID) -> bool:
        """Disconnect a brokerage connection."""
        connection = await self.get_connection(connection_id, user_id)
        if not connection:
            return False

        # Delete cached tokens
        if self.cache and connection.token_secret_id:
            await self.cache.delete(connection.token_secret_id)

        connection.status = ConnectionStatus.REVOKED
        connection.token_secret_id = None
        await self.db.commit()
        return True

    async def get_accounts(self, user_id: UUID, broker_id: BrokerId | None = None) -> list[BrokerageAccount]:
        """Get all accounts for a user, optionally filtered by broker."""
        stmt = select(BrokerageAccount).join(BrokerageConnection).where(
            BrokerageConnection.user_id == user_id,
            BrokerageConnection.status == ConnectionStatus.ACTIVE,
        )
        if broker_id:
            stmt = stmt.where(BrokerageAccount.broker_id == broker_id)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_token_set(self, connection: BrokerageConnection):
        """Reconstruct token set from connection."""
        if not connection.token_secret_id or not self.cache:
            raise ValueError("No tokens available for connection")

        token_data = await self.cache.get(connection.token_secret_id)
        if not token_data:
            raise ValueError("Tokens expired or not found")

        if connection.broker_id == BrokerId.ALPACA:
            return AlpacaTokenSet(
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token"),
            )
        elif connection.broker_id == BrokerId.ETRADE:
            return ETradeTokenSet(
                access_token=token_data.get("access_token", ""),
                access_token_secret=token_data.get("access_token_secret", ""),
            )
        raise ValueError(f"Unsupported broker: {connection.broker_id}")

    async def refresh_connection_tokens(self, connection: BrokerageConnection) -> bool:
        """Refresh tokens for a connection if supported."""
        try:
            current_tokens = await self.get_token_set(connection)
            adapter = self.get_adapter(connection.broker_id)

            # For Alpaca, use refresh_token
            if connection.broker_id == BrokerId.ALPACA and current_tokens.refresh_token:
                new_tokens = await adapter.refresh_token(current_tokens.refresh_token)
            # For E*TRADE, use the renew endpoint
            elif connection.broker_id == BrokerId.ETRADE:
                refresh_str = f"{current_tokens.access_token}|{current_tokens.access_token_secret}"
                new_tokens = await adapter.refresh_token(refresh_str)
            else:
                return False

            # Update cached tokens
            if self.cache and connection.token_secret_id:
                if connection.broker_id == BrokerId.ALPACA:
                    token_data = {
                        "access_token": new_tokens.access_token,
                        "refresh_token": getattr(new_tokens, "refresh_token", None),
                    }
                else:
                    token_data = {
                        "access_token": new_tokens.access_token,
                        "access_token_secret": getattr(new_tokens, "access_token_secret", ""),
                    }
                await self.cache.set(
                    connection.token_secret_id,
                    token_data,
                    ttl=CacheService.TTL_TOKEN,
                )

            # Update expiration
            if hasattr(new_tokens, "expires_at") and new_tokens.expires_at:
                connection.expires_at = datetime.fromtimestamp(
                    new_tokens.expires_at, tz=timezone.utc
                )
                await self.db.commit()

            return True
        except Exception:
            return False
