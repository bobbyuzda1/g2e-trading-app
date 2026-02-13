"""Brokerage schemas."""
from datetime import datetime
from uuid import UUID

from app.models.brokerage import BrokerId, ConnectionStatus
from app.schemas.common import BaseSchema, TimestampSchema


class BrokerageConnectionBase(BaseSchema):
    """Base brokerage connection schema."""

    broker_id: BrokerId
    nickname: str | None = None


class BrokerageConnectionCreate(BrokerageConnectionBase):
    """Schema for initiating brokerage connection."""
    pass


class BrokerageConnectionResponse(BrokerageConnectionBase, TimestampSchema):
    """Brokerage connection response."""

    id: UUID
    user_id: UUID
    status: ConnectionStatus
    connected_at: datetime | None
    last_sync_at: datetime | None
    expires_at: datetime | None
    is_primary: bool


class BrokerageAccountResponse(TimestampSchema):
    """Brokerage account response."""

    id: UUID
    broker_id: BrokerId
    account_number_masked: str | None
    account_type: str | None
    account_name: str | None
    is_default: bool


class OAuthStartResponse(BaseSchema):
    """OAuth flow initiation response."""

    authorization_url: str
    state: str
    expires_in: int
    is_oob: bool = False  # True when user must manually copy verifier (e.g. E*TRADE sandbox)


class OAuthCallbackRequest(BaseSchema):
    """OAuth callback request."""

    code: str | None = None  # OAuth 2.0
    oauth_token: str | None = None  # OAuth 1.0a
    oauth_verifier: str | None = None  # OAuth 1.0a
    state: str


class BrokerCredentialSave(BaseSchema):
    """Request to save user's broker API credentials."""

    broker_id: BrokerId
    api_key: str
    api_secret: str
    is_sandbox: bool = True


class BrokerCredentialResponse(BaseSchema):
    """Response showing whether credentials exist (never exposes secrets)."""

    broker_id: BrokerId
    has_credentials: bool
    is_sandbox: bool
    api_key_hint: str  # e.g. "abc...xyz"
