"""Audit logging for compliance (SEC 17a-3/17a-4)."""
from enum import Enum
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class AuditAction(str, Enum):
    """Types of auditable actions."""
    # Auth
    LOGIN = "login"
    LOGOUT = "logout"

    # Brokerage
    BROKER_CONNECT = "broker_connect"
    BROKER_DISCONNECT = "broker_disconnect"
    TOKEN_REFRESH = "token_refresh"

    # Trading
    ORDER_PREVIEW = "order_preview"
    ORDER_SUBMIT = "order_submit"
    ORDER_CANCEL = "order_cancel"
    ORDER_MODIFY = "order_modify"

    # AI
    AI_RECOMMENDATION = "ai_recommendation"
    AI_ANALYSIS = "ai_analysis"
    STRATEGY_CHANGE = "strategy_change"
    PLAN_CHANGE = "plan_change"

    # Data access
    PORTFOLIO_VIEW = "portfolio_view"
    ACCOUNT_VIEW = "account_view"


class AuditLog(Base, UUIDMixin, TimestampMixin):
    """Immutable audit log for compliance.

    SEC Rule 17a-3/17a-4 requires 6-year retention.
    This table should be append-only with no updates or deletes.
    """

    __tablename__ = "audit_logs"

    user_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,  # Allow null for system actions
    )

    action: Mapped[AuditAction] = mapped_column(SQLEnum(AuditAction), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Request context
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Action details (JSON)
    # Contains: request_data, response_summary, error_info
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # For AI recommendations: required disclosure
    disclosure_shown: Mapped[str | None] = mapped_column(Text, nullable=True)
