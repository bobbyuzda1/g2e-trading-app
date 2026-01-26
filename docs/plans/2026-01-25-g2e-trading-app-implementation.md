# G2E Trading App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered trading assistant that connects to multiple brokerages (E*TRADE, Alpaca, Schwab) via a unified abstraction layer, provides portfolio analysis, trade recommendations, and an AI chat interface powered by Google Gemini.

**Architecture:** FastAPI backend with PostgreSQL + Redis, React frontend with Tailwind/Tremor, multi-brokerage abstraction layer, Google Gemini for AI analysis. OAuth 1.0a for E*TRADE, OAuth 2.0 for Alpaca/Schwab.

**Tech Stack:**
- Backend: Python 3.11+, FastAPI, SQLAlchemy, Alembic, Redis
- Frontend: React 18, TypeScript, Tailwind CSS, Tremor, TradingView Charts
- Database: PostgreSQL 15+
- AI: Google Gemini 2.5 Pro + Flash
- Auth: JWT + OAuth (per brokerage)

---

## Phase 1: Project Foundation (Tasks 1-8)

### Task 1: Initialize Backend Project Structure

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`
- Create: `backend/README.md`

**Step 1: Create backend directory structure**

```bash
mkdir -p backend/app/{api,core,models,schemas,services,brokers}
mkdir -p backend/app/api/v1/endpoints
mkdir -p backend/tests
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py
touch backend/app/api/v1/endpoints/__init__.py
touch backend/app/core/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/services/__init__.py
touch backend/app/brokers/__init__.py
```

**Step 2: Create pyproject.toml**

```toml
[project]
name = "g2e-trading-app"
version = "0.1.0"
description = "AI-powered trading assistant with multi-brokerage support"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlalchemy>=2.0.25",
    "alembic>=1.13.1",
    "asyncpg>=0.29.0",
    "redis>=5.0.1",
    "pydantic>=2.5.3",
    "pydantic-settings>=2.1.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "httpx>=0.26.0",
    "google-generativeai>=0.3.2",
    "python-dotenv>=1.0.0",
    "authlib>=1.3.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.4",
    "pytest-asyncio>=0.23.3",
    "pytest-cov>=4.1.0",
    "httpx>=0.26.0",
    "ruff>=0.1.11",
    "mypy>=1.8.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Step 3: Create config.py**

```python
"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "G2E Trading App"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/g2e"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model_pro: str = "gemini-2.5-pro"
    gemini_model_flash: str = "gemini-2.5-flash"

    # E*TRADE (OAuth 1.0a)
    etrade_consumer_key: str = ""
    etrade_consumer_secret: str = ""
    etrade_sandbox: bool = True

    # Alpaca (OAuth 2.0)
    alpaca_client_id: str = ""
    alpaca_client_secret: str = ""
    alpaca_paper: bool = True

    # Schwab (OAuth 2.0)
    schwab_client_id: str = ""
    schwab_client_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
```

**Step 4: Create main.py**

```python
"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="AI-powered trading assistant with multi-brokerage support",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": f"Welcome to {settings.app_name}", "docs": "/docs"}
```

**Step 5: Create .env.example**

```bash
# Application
DEBUG=true
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/g2e

# Redis
REDIS_URL=redis://localhost:6379/0

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# E*TRADE (get from developer.etrade.com)
ETRADE_CONSUMER_KEY=
ETRADE_CONSUMER_SECRET=
ETRADE_SANDBOX=true

# Alpaca (get from alpaca.markets)
ALPACA_CLIENT_ID=
ALPACA_CLIENT_SECRET=
ALPACA_PAPER=true

# Schwab (get from developer.schwab.com)
SCHWAB_CLIENT_ID=
SCHWAB_CLIENT_SECRET=
```

**Step 6: Verify setup**

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
# Visit http://localhost:8000/health
# Expected: {"status": "healthy", "app": "G2E Trading App"}
```

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: initialize FastAPI backend project structure"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 2: Database Models - Core Tables

**Files:**
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/brokerage.py`
- Create: `backend/app/core/database.py`

**Step 1: Create database connection**

```python
# backend/app/core/database.py
"""Database connection and session management."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency for getting database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

**Step 2: Create base model mixin**

```python
# backend/app/models/base.py
"""Base model with common fields."""
import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Mixin for soft delete functionality."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )


class UUIDMixin:
    """Mixin for UUID primary key."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
```

**Step 3: Create user model**

```python
# backend/app/models/user.py
"""User model."""
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """User account model."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    brokerage_connections = relationship("BrokerageConnection", back_populates="user")
    trading_strategies = relationship("TradingStrategy", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")
```

**Step 4: Create brokerage connection model**

```python
# backend/app/models/brokerage.py
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
        SQLEnum(BrokerId),
        nullable=False,
    )
    status: Mapped[ConnectionStatus] = mapped_column(
        SQLEnum(ConnectionStatus),
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
    broker_id: Mapped[BrokerId] = mapped_column(SQLEnum(BrokerId), nullable=False)

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
```

**Step 5: Update models __init__.py**

```python
# backend/app/models/__init__.py
"""Database models."""
from app.models.user import User
from app.models.brokerage import BrokerageConnection, BrokerageAccount, BrokerId, ConnectionStatus

__all__ = [
    "User",
    "BrokerageConnection",
    "BrokerageAccount",
    "BrokerId",
    "ConnectionStatus",
]
```

**Step 6: Commit**

```bash
git add backend/app/core/database.py backend/app/models/
git commit -m "feat: add database models for users and brokerage connections"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 3: Database Models - Trading & AI

**Files:**
- Create: `backend/app/models/strategy.py`
- Create: `backend/app/models/conversation.py`
- Create: `backend/app/models/audit.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Create trading strategy model**

```python
# backend/app/models/strategy.py
"""Trading strategy models."""
from enum import Enum
from sqlalchemy import String, Text, Boolean, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class StrategySource(str, Enum):
    """How the strategy was created."""
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"
    AI_REFINED = "ai_refined"


class TradingStrategy(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """User's trading strategy configuration."""

    __tablename__ = "trading_strategies"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[StrategySource] = mapped_column(
        SQLEnum(StrategySource),
        default=StrategySource.MANUAL,
        nullable=False,
    )

    # Strategy configuration (JSON)
    # Contains: risk_tolerance, time_horizon, preferred_sectors, etc.
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Focus configuration (from stock/industry focus feature)
    # Contains: focus_type, focus_targets, related_tickers, news_keywords
    focus_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="trading_strategies")


class TradingPlan(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Term-based trading plan with specific objectives."""

    __tablename__ = "trading_plans"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    strategy_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trading_strategies.id", ondelete="SET NULL"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    term_type: Mapped[str] = mapped_column(String(20), nullable=False)  # short/medium/long

    # Plan objectives (JSON)
    # Contains: target_return, max_drawdown, sector_allocation, etc.
    objectives: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Progress tracking (JSON)
    # Contains: milestones, current_progress, metrics
    progress: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Note: Only one active plan per user (enforced at application level)
```

**Step 2: Create conversation model**

```python
# backend/app/models/conversation.py
"""AI conversation models."""
from enum import Enum
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class MessageRole(str, Enum):
    """Message sender role."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """AI chat conversation."""

    __tablename__ = "conversations"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    # Context snapshot at conversation start
    # Contains: active_plan_id, strategy_id, portfolio_snapshot
    context_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


class Message(Base, UUIDMixin, TimestampMixin):
    """Individual message in a conversation."""

    __tablename__ = "messages"

    conversation_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[MessageRole] = mapped_column(SQLEnum(MessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Token counts for cost tracking
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Model used
    model: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Metadata (JSON)
    # Contains: tool_calls, citations, confidence_score
    metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
```

**Step 3: Create audit log model**

```python
# backend/app/models/audit.py
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
```

**Step 4: Update models __init__.py**

```python
# backend/app/models/__init__.py
"""Database models."""
from app.models.user import User
from app.models.brokerage import (
    BrokerageConnection,
    BrokerageAccount,
    BrokerId,
    ConnectionStatus,
)
from app.models.strategy import TradingStrategy, TradingPlan, StrategySource
from app.models.conversation import Conversation, Message, MessageRole
from app.models.audit import AuditLog, AuditAction

__all__ = [
    "User",
    "BrokerageConnection",
    "BrokerageAccount",
    "BrokerId",
    "ConnectionStatus",
    "TradingStrategy",
    "TradingPlan",
    "StrategySource",
    "Conversation",
    "Message",
    "MessageRole",
    "AuditLog",
    "AuditAction",
]
```

**Step 5: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add models for strategies, conversations, and audit logging"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 4: Alembic Migrations Setup

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/` (directory)

**Step 1: Initialize Alembic**

```bash
cd backend
alembic init alembic
```

**Step 2: Update alembic/env.py**

```python
# backend/alembic/env.py
"""Alembic migration environment."""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.config import get_settings
from app.core.database import Base
from app.models import *  # noqa: F401, F403 - Import all models

config = context.config
settings = get_settings()

# Set database URL from settings
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in async mode."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Step 3: Create initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial_schema"
```

**Step 4: Verify migration file was created**

Check `backend/alembic/versions/` for the new migration file.

**Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: setup Alembic migrations with async support"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 5: Redis Cache Service

**Files:**
- Create: `backend/app/core/cache.py`
- Create: `backend/tests/test_cache.py`

**Step 1: Write failing test**

```python
# backend/tests/test_cache.py
"""Tests for Redis cache service."""
import pytest
from unittest.mock import AsyncMock, patch

from app.core.cache import CacheService


@pytest.fixture
def cache_service():
    """Create cache service with mocked Redis."""
    with patch("app.core.cache.redis.from_url") as mock_redis:
        mock_client = AsyncMock()
        mock_redis.return_value = mock_client
        service = CacheService("redis://localhost:6379/0")
        service._client = mock_client
        yield service, mock_client


@pytest.mark.asyncio
async def test_cache_get_returns_none_for_missing_key(cache_service):
    """Cache get returns None when key doesn't exist."""
    service, mock_client = cache_service
    mock_client.get.return_value = None

    result = await service.get("missing_key")

    assert result is None
    mock_client.get.assert_called_once_with("missing_key")


@pytest.mark.asyncio
async def test_cache_set_stores_value_with_ttl(cache_service):
    """Cache set stores value with expiration."""
    service, mock_client = cache_service
    mock_client.set.return_value = True

    result = await service.set("test_key", {"data": "value"}, ttl=60)

    assert result is True
    mock_client.set.assert_called_once()


@pytest.mark.asyncio
async def test_cache_get_portfolio_key_format(cache_service):
    """Portfolio cache key follows expected format."""
    service, _ = cache_service

    key = service.portfolio_key("user123", "account456")

    assert key == "portfolio:user123:account456"
```

**Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_cache.py -v
# Expected: FAIL (module not found)
```

**Step 3: Implement cache service**

```python
# backend/app/core/cache.py
"""Redis cache service."""
import json
from typing import Any
import redis.asyncio as redis

from app.config import get_settings


class CacheService:
    """Redis cache wrapper with typed methods for common operations."""

    # TTL constants (seconds)
    TTL_PORTFOLIO = 60       # 1 minute
    TTL_QUOTE = 15           # 15 seconds
    TTL_STRATEGY = 86400     # 24 hours
    TTL_SESSION = 14400      # 4 hours
    TTL_TOKEN = 7200         # 2 hours

    def __init__(self, redis_url: str | None = None):
        """Initialize cache service."""
        settings = get_settings()
        self._url = redis_url or settings.redis_url
        self._client: redis.Redis | None = None

    async def connect(self) -> None:
        """Connect to Redis."""
        if self._client is None:
            self._client = redis.from_url(self._url, decode_responses=True)

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._client:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        if not self._client:
            await self.connect()

        value = await self._client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        """Set value in cache with optional TTL."""
        if not self._client:
            await self.connect()

        serialized = json.dumps(value) if not isinstance(value, str) else value
        return await self._client.set(key, serialized, ex=ttl)

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self._client:
            await self.connect()

        return await self._client.delete(key) > 0

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        if not self._client:
            await self.connect()

        return await self._client.exists(key) > 0

    # Key generators
    @staticmethod
    def portfolio_key(user_id: str, account_id: str) -> str:
        """Generate portfolio cache key."""
        return f"portfolio:{user_id}:{account_id}"

    @staticmethod
    def quote_key(symbol: str) -> str:
        """Generate quote cache key."""
        return f"quote:{symbol.upper()}"

    @staticmethod
    def token_key(user_id: str, broker_id: str) -> str:
        """Generate token cache key."""
        return f"token:{user_id}:{broker_id}"


# Global instance
_cache: CacheService | None = None


async def get_cache() -> CacheService:
    """Get or create cache service instance."""
    global _cache
    if _cache is None:
        _cache = CacheService()
        await _cache.connect()
    return _cache
```

**Step 4: Run tests to verify they pass**

```bash
cd backend
pytest tests/test_cache.py -v
# Expected: PASS
```

**Step 5: Commit**

```bash
git add backend/app/core/cache.py backend/tests/test_cache.py
git commit -m "feat: add Redis cache service with TTL support"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 6: Pydantic Schemas - Core

**Files:**
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/brokerage.py`
- Create: `backend/app/schemas/common.py`

**Step 1: Create common schemas**

```python
# backend/app/schemas/common.py
"""Common schema definitions."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields."""

    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseSchema):
    """Generic paginated response."""

    items: list
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseSchema):
    """Simple message response."""

    message: str
    success: bool = True
```

**Step 2: Create user schemas**

```python
# backend/app/schemas/user.py
"""User schemas."""
from uuid import UUID
from pydantic import EmailStr

from app.schemas.common import BaseSchema, TimestampSchema


class UserBase(BaseSchema):
    """Base user schema."""

    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None


class UserResponse(UserBase, TimestampSchema):
    """User response schema."""

    id: UUID
    is_active: bool


class TokenResponse(BaseSchema):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
```

**Step 3: Create brokerage schemas**

```python
# backend/app/schemas/brokerage.py
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


class BrokerageAccountResponse(BaseSchema, TimestampSchema):
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


class OAuthCallbackRequest(BaseSchema):
    """OAuth callback request."""

    code: str | None = None  # OAuth 2.0
    oauth_token: str | None = None  # OAuth 1.0a
    oauth_verifier: str | None = None  # OAuth 1.0a
    state: str
```

**Step 4: Update schemas __init__.py**

```python
# backend/app/schemas/__init__.py
"""Pydantic schemas."""
from app.schemas.common import BaseSchema, TimestampSchema, PaginatedResponse, MessageResponse
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserResponse, TokenResponse
from app.schemas.brokerage import (
    BrokerageConnectionBase,
    BrokerageConnectionCreate,
    BrokerageConnectionResponse,
    BrokerageAccountResponse,
    OAuthStartResponse,
    OAuthCallbackRequest,
)

__all__ = [
    "BaseSchema",
    "TimestampSchema",
    "PaginatedResponse",
    "MessageResponse",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "TokenResponse",
    "BrokerageConnectionBase",
    "BrokerageConnectionCreate",
    "BrokerageConnectionResponse",
    "BrokerageAccountResponse",
    "OAuthStartResponse",
    "OAuthCallbackRequest",
]
```

**Step 5: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: add Pydantic schemas for users and brokerages"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 7: Broker Abstraction Layer - Interface

**Files:**
- Create: `backend/app/brokers/base.py`
- Create: `backend/app/brokers/models.py`

**Step 1: Create broker-agnostic data models**

```python
# backend/app/brokers/models.py
"""Broker-agnostic data models for the abstraction layer."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel

from app.models.brokerage import BrokerId


class AssetType(str, Enum):
    """Asset type enumeration."""
    STOCK = "stock"
    ETF = "etf"
    OPTION = "option"
    CRYPTO = "crypto"
    MUTUAL_FUND = "mutual_fund"


class OrderSide(str, Enum):
    """Order side enumeration."""
    BUY = "buy"
    SELL = "sell"
    BUY_TO_COVER = "buy_to_cover"
    SELL_SHORT = "sell_short"


class OrderType(str, Enum):
    """Order type enumeration."""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"


class TimeInForce(str, Enum):
    """Time in force enumeration."""
    DAY = "day"
    GTC = "gtc"  # Good till canceled
    IOC = "ioc"  # Immediate or cancel
    FOK = "fok"  # Fill or kill


class OrderStatus(str, Enum):
    """Order status enumeration."""
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELED = "canceled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Account(BaseModel):
    """Normalized account model."""

    broker_id: BrokerId
    account_id: str
    account_number: str  # Masked
    account_type: str
    account_name: str
    is_default: bool = False


class Balance(BaseModel):
    """Normalized balance model."""

    broker_id: BrokerId
    account_id: str
    cash_available: Decimal
    cash_balance: Decimal
    buying_power: Decimal
    day_trading_buying_power: Decimal | None = None
    portfolio_value: Decimal
    margin_used: Decimal | None = None


class Position(BaseModel):
    """Normalized position model."""

    broker_id: BrokerId
    account_id: str
    symbol: str
    quantity: Decimal
    average_cost: Decimal
    current_price: Decimal
    market_value: Decimal
    unrealized_pl: Decimal
    unrealized_pl_percent: Decimal
    asset_type: AssetType
    last_updated: datetime


class Quote(BaseModel):
    """Normalized quote model."""

    symbol: str
    bid: Decimal
    ask: Decimal
    last: Decimal
    volume: int
    change: Decimal
    change_percent: Decimal
    high: Decimal
    low: Decimal
    open: Decimal
    previous_close: Decimal
    timestamp: datetime
    source: BrokerId


class OrderRequest(BaseModel):
    """Order request model."""

    symbol: str
    side: OrderSide
    quantity: Decimal
    order_type: OrderType
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    time_in_force: TimeInForce = TimeInForce.DAY
    extended_hours: bool = False


class Order(BaseModel):
    """Normalized order model."""

    broker_id: BrokerId
    account_id: str
    order_id: str
    client_order_id: str | None = None
    symbol: str
    side: OrderSide
    quantity: Decimal
    filled_quantity: Decimal
    order_type: OrderType
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    time_in_force: TimeInForce
    status: OrderStatus
    submitted_at: datetime
    filled_at: datetime | None = None
    average_fill_price: Decimal | None = None


class OrderResult(BaseModel):
    """Order placement result."""

    success: bool
    order_id: str | None = None
    message: str | None = None
    order: Order | None = None
```

**Step 2: Create base broker interface**

```python
# backend/app/brokers/base.py
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
```

**Step 3: Update brokers __init__.py**

```python
# backend/app/brokers/__init__.py
"""Brokerage adapters."""
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

__all__ = [
    "IBrokerAdapter",
    "BrokerFeatures",
    "TokenSet",
    "Account",
    "Balance",
    "Position",
    "Quote",
    "Order",
    "OrderRequest",
    "OrderResult",
    "AssetType",
    "OrderSide",
    "OrderType",
    "TimeInForce",
    "OrderStatus",
]
```

**Step 4: Commit**

```bash
git add backend/app/brokers/
git commit -m "feat: add broker abstraction layer interface and models"
git push origin claude/google-integration-setup-89O9Y
```

---

### Task 8: Alpaca Adapter (First Broker Implementation)

**Files:**
- Create: `backend/app/brokers/alpaca.py`
- Create: `backend/tests/test_brokers/test_alpaca.py`

**Step 1: Write failing test**

```python
# backend/tests/test_brokers/test_alpaca.py
"""Tests for Alpaca broker adapter."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from decimal import Decimal

from app.brokers.alpaca import AlpacaAdapter
from app.models.brokerage import BrokerId


@pytest.fixture
def alpaca_adapter():
    """Create Alpaca adapter for testing."""
    return AlpacaAdapter(
        client_id="test_client_id",
        client_secret="test_client_secret",
        paper=True,
    )


def test_alpaca_broker_id(alpaca_adapter):
    """Alpaca adapter has correct broker_id."""
    assert alpaca_adapter.broker_id == BrokerId.ALPACA


def test_alpaca_features_include_crypto(alpaca_adapter):
    """Alpaca features include crypto trading."""
    assert alpaca_adapter.features.crypto_trading is True
    assert alpaca_adapter.features.fractional_shares is True
    assert alpaca_adapter.features.paper_trading is True


def test_alpaca_authorization_url(alpaca_adapter):
    """Alpaca generates correct authorization URL."""
    url = alpaca_adapter._build_auth_url("test_state", "http://localhost/callback")

    assert "https://app.alpaca.markets/oauth/authorize" in url
    assert "client_id=test_client_id" in url
    assert "state=test_state" in url
```

**Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_brokers/test_alpaca.py -v
# Expected: FAIL (module not found)
```

**Step 3: Implement Alpaca adapter**

```python
# backend/app/brokers/alpaca.py
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

    def __init__(self, access_token: str, refresh_token: str | None = None, expires_at: int | None = None):
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

    def __init__(self, client_id: str, client_secret: str, paper: bool = True):
        """Initialize Alpaca adapter."""
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

    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        return self._build_auth_url(state, redirect_uri)

    async def handle_oauth_callback(
        self,
        callback_data: dict,
        redirect_uri: str,
    ) -> TokenSet:
        """Exchange authorization code for tokens."""
        code = callback_data.get("code")
        if not code:
            raise ValueError("Missing authorization code")

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

        return AlpacaTokenSet(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=data.get("expires_in"),
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

        return AlpacaTokenSet(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", refresh_token),
            expires_at=data.get("expires_in"),
        )

    def _get_headers(self, tokens: TokenSet) -> dict:
        """Get authorization headers."""
        return {"Authorization": f"Bearer {tokens.access_token}"}

    async def get_accounts(self, tokens: TokenSet) -> list[Account]:
        """Get user account (Alpaca has one account per user)."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/account",
                headers=self._get_headers(tokens),
            )
            response.raise_for_status()
            data = response.json()

        return [Account(
            broker_id=self.broker_id,
            account_id=data["id"],
            account_number=data["account_number"][-4:].rjust(len(data["account_number"]), "*"),
            account_type="paper" if self._paper else "live",
            account_name=f"Alpaca {'Paper' if self._paper else 'Live'} Account",
            is_default=True,
        )]

    async def get_account_balance(self, account_id: str, tokens: TokenSet) -> Balance:
        """Get account balance."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/account",
                headers=self._get_headers(tokens),
            )
            response.raise_for_status()
            data = response.json()

        return Balance(
            broker_id=self.broker_id,
            account_id=account_id,
            cash_available=Decimal(data["cash"]),
            cash_balance=Decimal(data["cash"]),
            buying_power=Decimal(data["buying_power"]),
            day_trading_buying_power=Decimal(data.get("daytrading_buying_power", 0)),
            portfolio_value=Decimal(data["portfolio_value"]),
            margin_used=Decimal(data.get("initial_margin", 0)),
        )

    async def get_positions(self, account_id: str, tokens: TokenSet) -> list[Position]:
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
            elif pos.get("symbol", "").endswith(("ETF", "SPY", "QQQ", "VTI")):
                asset_type = AssetType.ETF
            else:
                asset_type = AssetType.STOCK

            positions.append(Position(
                broker_id=self.broker_id,
                account_id=account_id,
                symbol=pos["symbol"],
                quantity=Decimal(pos["qty"]),
                average_cost=Decimal(pos["avg_entry_price"]),
                current_price=Decimal(pos["current_price"]),
                market_value=Decimal(pos["market_value"]),
                unrealized_pl=Decimal(pos["unrealized_pl"]),
                unrealized_pl_percent=Decimal(pos["unrealized_plpc"]) * 100,
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
        params = {}
        if status:
            params["status"] = status

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._api_url}/v2/orders",
                headers=self._get_headers(tokens),
                params=params,
            )
            response.raise_for_status()
            data = response.json()

        orders = []
        for ord in data:
            orders.append(self._parse_order(ord, account_id))

        return orders

    def _parse_order(self, data: dict, account_id: str) -> Order:
        """Parse Alpaca order response."""
        # Map Alpaca status to our status
        status_map = {
            "new": OrderStatus.PENDING,
            "accepted": OrderStatus.OPEN,
            "filled": OrderStatus.FILLED,
            "partially_filled": OrderStatus.PARTIALLY_FILLED,
            "canceled": OrderStatus.CANCELED,
            "rejected": OrderStatus.REJECTED,
            "expired": OrderStatus.EXPIRED,
        }

        return Order(
            broker_id=self.broker_id,
            account_id=account_id,
            order_id=data["id"],
            client_order_id=data.get("client_order_id"),
            symbol=data["symbol"],
            side=OrderSide(data["side"]),
            quantity=Decimal(data["qty"]),
            filled_quantity=Decimal(data.get("filled_qty", 0)),
            order_type=OrderType(data["type"]),
            limit_price=Decimal(data["limit_price"]) if data.get("limit_price") else None,
            stop_price=Decimal(data["stop_price"]) if data.get("stop_price") else None,
            time_in_force=TimeInForce(data["time_in_force"]),
            status=status_map.get(data["status"], OrderStatus.PENDING),
            submitted_at=datetime.fromisoformat(data["submitted_at"].replace("Z", "+00:00")),
            filled_at=datetime.fromisoformat(data["filled_at"].replace("Z", "+00:00")) if data.get("filled_at") else None,
            average_fill_price=Decimal(data["filled_avg_price"]) if data.get("filled_avg_price") else None,
        )

    async def get_quote(self, symbol: str, tokens: TokenSet) -> Quote:
        """Get quote for symbol."""
        quotes = await self.get_quotes([symbol], tokens)
        if not quotes:
            raise ValueError(f"No quote found for {symbol}")
        return quotes[0]

    async def get_quotes(self, symbols: list[str], tokens: TokenSet) -> list[Quote]:
        """Get quotes for multiple symbols."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.DATA_URL}/v2/stocks/quotes/latest",
                headers=self._get_headers(tokens),
                params={"symbols": ",".join(symbols)},
            )
            response.raise_for_status()
            data = response.json()

        quotes = []
        for symbol, quote_data in data.get("quotes", {}).items():
            # Get trade data for last price
            trade_response = await client.get(
                f"{self.DATA_URL}/v2/stocks/{symbol}/trades/latest",
                headers=self._get_headers(tokens),
            )
            trade_data = trade_response.json().get("trade", {})

            quotes.append(Quote(
                symbol=symbol,
                bid=Decimal(str(quote_data.get("bp", 0))),
                ask=Decimal(str(quote_data.get("ap", 0))),
                last=Decimal(str(trade_data.get("p", 0))),
                volume=trade_data.get("s", 0),
                change=Decimal("0"),  # Would need previous close
                change_percent=Decimal("0"),
                high=Decimal("0"),
                low=Decimal("0"),
                open=Decimal("0"),
                previous_close=Decimal("0"),
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
        order_data = {
            "symbol": order.symbol,
            "qty": str(order.quantity),
            "side": order.side.value,
            "type": order.order_type.value,
            "time_in_force": order.time_in_force.value,
        }

        if order.limit_price:
            order_data["limit_price"] = str(order.limit_price)
        if order.stop_price:
            order_data["stop_price"] = str(order.stop_price)
        if order.extended_hours:
            order_data["extended_hours"] = True

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._api_url}/v2/orders",
                headers=self._get_headers(tokens),
                json=order_data,
            )

            if response.status_code >= 400:
                error_data = response.json()
                return OrderResult(
                    success=False,
                    message=error_data.get("message", "Order failed"),
                )

            data = response.json()

        return OrderResult(
            success=True,
            order_id=data["id"],
            order=self._parse_order(data, account_id),
        )

    async def cancel_order(
        self,
        account_id: str,
        order_id: str,
        tokens: TokenSet,
    ) -> OrderResult:
        """Cancel an order."""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self._api_url}/v2/orders/{order_id}",
                headers=self._get_headers(tokens),
            )

            if response.status_code == 204:
                return OrderResult(success=True, message="Order canceled")

            error_data = response.json()
            return OrderResult(
                success=False,
                message=error_data.get("message", "Cancel failed"),
            )
```

**Step 4: Create tests directory structure**

```bash
mkdir -p backend/tests/test_brokers
touch backend/tests/__init__.py
touch backend/tests/test_brokers/__init__.py
```

**Step 5: Run tests**

```bash
cd backend
pytest tests/test_brokers/test_alpaca.py -v
# Expected: PASS
```

**Step 6: Commit**

```bash
git add backend/app/brokers/alpaca.py backend/tests/
git commit -m "feat: implement Alpaca broker adapter with OAuth and trading"
git push origin claude/google-integration-setup-89O9Y
```

---

## Phase 1 Checkpoint

After completing Tasks 1-8, you have:
- ✅ FastAPI project structure
- ✅ Database models (users, brokerages, strategies, conversations, audit, **feedback**)
- ✅ Alembic migrations
- ✅ Redis cache service
- ✅ Pydantic schemas
- ✅ Broker abstraction layer
- ✅ Alpaca adapter (first broker)

**Note:** Feedback models (RecommendationFeedback, UserPreferenceProfile, ExplicitUserRule) added for user preference learning system.

**Verify:**
```bash
cd backend
pytest -v
uvicorn app.main:app --reload
# Visit http://localhost:8000/docs
```

---

## Phase 2: API Endpoints & E*TRADE (Tasks 9-16)

### Task 9: Auth Endpoints (JWT)

*[Continue with auth endpoints, E*TRADE adapter, portfolio endpoints...]*

---

## Phase 3: Gemini AI Integration (Tasks 17-24)

### Task 17: Gemini Service

*[Continue with Gemini integration, chat endpoints, strategy analysis...]*

### Task 20: User Feedback Learning Service

**Files:**
- Create: `backend/app/services/feedback_service.py`
- Create: `backend/app/api/v1/endpoints/feedback.py`

**Functionality:**
- Capture user feedback on recommendations (accept/reject/modify/question)
- Extract preferences from user reasoning using AI
- Update UserPreferenceProfile with learned preferences
- Generate feedback context for AI prompt injection
- Manage explicit user rules (CRUD operations)
- Calculate feedback metrics (acceptance rate, modification rate)

**Key Methods:**
- `record_feedback(user_id, recommendation_id, feedback_type, reasoning)`
- `update_preference_profile(user_id)` - Synthesizes all feedback
- `get_ai_context(user_id)` - Returns formatted context for AI prompts
- `manage_rules(user_id, action, rule_text)` - Add/edit/delete explicit rules
- `export_profile(user_id)` - User data export for privacy compliance

---

## Phase 4: Frontend Foundation (Tasks 25-32)

### Task 25: React Project Setup

*[Continue with React setup, components, pages...]*

---

## Phase 5: Integration & Testing (Tasks 33-40)

### Task 33: End-to-End Tests

*[Continue with E2E tests, deployment, final integration...]*

---

## Verification Plan

After each phase:

1. **Unit Tests:** `pytest -v --cov=app`
2. **API Tests:** Test endpoints via Swagger UI at `/docs`
3. **Integration:** Connect real Alpaca paper account
4. **Manual:** Verify UI flows work end-to-end

## Notes

- Always use Windows git: `cmd.exe /c "cd C:\\projects\\TradingApp && git ..."`
- Push after every commit
- Run tests before committing
- Keep commits small and focused
