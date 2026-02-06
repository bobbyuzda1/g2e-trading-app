"""Brokerage connection models."""
from enum import Enum
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class BrokerId(str, Enum):
    """Supported brokerage identifiers."""
    ETRADE = "etrade"
    ALPACA = "alpaca"
    SCHWAB = "schwab"
    IBKR = "ibkr"


class ConnectionStatus(str, Enum):
    """Brokerage connection status."""
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"


class BrokerageConnection(Base, UUIDMixin, TimestampMixin):
    """User's connection to a brokerage."""

    __tablename__ = "brokerage_connections"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    broker_id: Mapped[BrokerId] = mapped_column(
        SQLEnum(BrokerId, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    status: Mapped[ConnectionStatus] = mapped_column(
        SQLEnum(ConnectionStatus, values_callable=lambda x: [e.value for e in x]),
        default=ConnectionStatus.PENDING,
        nullable=False,
    )

    # Token storage (reference to secrets manager in production)
    token_secret_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Connection metadata
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # User preferences
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    user = relationship("User", back_populates="brokerage_connections")
    accounts = relationship("BrokerageAccount", back_populates="connection")


class BrokerageAccount(Base, UUIDMixin, TimestampMixin):
    """Individual account within a brokerage connection."""

    __tablename__ = "brokerage_accounts"

    connection_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brokerage_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    broker_id: Mapped[BrokerId] = mapped_column(SQLEnum(BrokerId, values_callable=lambda x: [e.value for e in x]), nullable=False)

    # Account info
    broker_account_id: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number_masked: Mapped[str | None] = mapped_column(String(20), nullable=True)
    account_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Preferences
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    include_in_aggregate: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    connection = relationship("BrokerageConnection", back_populates="accounts")
