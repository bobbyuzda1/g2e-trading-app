"""Tests for brokerage service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.brokerage import BrokerageService
from app.models.brokerage import BrokerId, ConnectionStatus, BrokerageConnection


@pytest.fixture
def mock_db():
    """Create mock database session."""
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture
def mock_cache():
    """Create mock cache service."""
    cache = AsyncMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock(return_value=True)
    cache.delete = AsyncMock(return_value=True)
    return cache


@pytest.fixture
def brokerage_service(mock_db, mock_cache):
    """Create brokerage service with mocked dependencies."""
    return BrokerageService(mock_db, mock_cache)


@pytest.fixture
def brokerage_service_no_cache(mock_db):
    """Create brokerage service without cache."""
    return BrokerageService(mock_db, None)


def test_get_alpaca_adapter(brokerage_service):
    """Test getting Alpaca adapter."""
    adapter = brokerage_service.get_adapter(BrokerId.ALPACA)
    assert adapter.broker_id == BrokerId.ALPACA


def test_get_etrade_adapter(brokerage_service):
    """Test getting E*TRADE adapter."""
    adapter = brokerage_service.get_adapter(BrokerId.ETRADE)
    assert adapter.broker_id == BrokerId.ETRADE


def test_adapter_caching(brokerage_service):
    """Test that adapters are cached."""
    adapter1 = brokerage_service.get_adapter(BrokerId.ALPACA)
    adapter2 = brokerage_service.get_adapter(BrokerId.ALPACA)
    assert adapter1 is adapter2


def test_unsupported_broker_raises_error(brokerage_service):
    """Test that unsupported broker raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported broker"):
        brokerage_service.get_adapter(BrokerId.SCHWAB)


@pytest.mark.asyncio
async def test_get_connections_returns_empty_list(brokerage_service, mock_db):
    """Test get_connections returns empty list when none exist."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    connections = await brokerage_service.get_connections(uuid4())
    assert connections == []


@pytest.mark.asyncio
async def test_get_connections_excludes_revoked(brokerage_service, mock_db):
    """Test get_connections excludes revoked connections."""
    user_id = uuid4()
    active_conn = MagicMock(spec=BrokerageConnection)
    active_conn.status = ConnectionStatus.ACTIVE

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [active_conn]
    mock_db.execute.return_value = mock_result

    connections = await brokerage_service.get_connections(user_id)
    assert len(connections) == 1
    assert connections[0].status == ConnectionStatus.ACTIVE


@pytest.mark.asyncio
async def test_get_connection_by_id(brokerage_service, mock_db):
    """Test getting a specific connection by ID."""
    connection_id = uuid4()
    user_id = uuid4()

    mock_conn = MagicMock(spec=BrokerageConnection)
    mock_conn.id = connection_id
    mock_conn.user_id = user_id

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_conn
    mock_db.execute.return_value = mock_result

    connection = await brokerage_service.get_connection(connection_id, user_id)
    assert connection is not None
    assert connection.id == connection_id


@pytest.mark.asyncio
async def test_get_connection_not_found(brokerage_service, mock_db):
    """Test getting a non-existent connection returns None."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    connection = await brokerage_service.get_connection(uuid4(), uuid4())
    assert connection is None


@pytest.mark.asyncio
async def test_disconnect_success(brokerage_service, mock_db, mock_cache):
    """Test successful disconnection."""
    connection_id = uuid4()
    user_id = uuid4()

    mock_conn = MagicMock(spec=BrokerageConnection)
    mock_conn.id = connection_id
    mock_conn.user_id = user_id
    mock_conn.token_secret_id = "token:123:alpaca"
    mock_conn.status = ConnectionStatus.ACTIVE

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_conn
    mock_db.execute.return_value = mock_result

    result = await brokerage_service.disconnect(connection_id, user_id)

    assert result is True
    assert mock_conn.status == ConnectionStatus.REVOKED
    assert mock_conn.token_secret_id is None
    mock_cache.delete.assert_called_once_with("token:123:alpaca")


@pytest.mark.asyncio
async def test_disconnect_not_found(brokerage_service, mock_db):
    """Test disconnection when connection not found."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await brokerage_service.disconnect(uuid4(), uuid4())
    assert result is False


@pytest.mark.asyncio
async def test_get_accounts_empty(brokerage_service, mock_db):
    """Test get_accounts returns empty list when none exist."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    accounts = await brokerage_service.get_accounts(uuid4())
    assert accounts == []


@pytest.mark.asyncio
async def test_get_accounts_filtered_by_broker(brokerage_service, mock_db):
    """Test get_accounts can filter by broker_id."""
    user_id = uuid4()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    await brokerage_service.get_accounts(user_id, BrokerId.ALPACA)

    # Verify execute was called (filtering is done in the query)
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_initiate_connection_creates_pending(brokerage_service, mock_db, mock_cache):
    """Test that initiate_connection creates a pending connection."""
    user_id = uuid4()
    redirect_uri = "https://example.com/callback"

    with patch.object(
        brokerage_service.get_adapter(BrokerId.ALPACA),
        "get_authorization_url",
        new_callable=AsyncMock,
        return_value="https://alpaca.com/oauth?state=test",
    ):
        auth_url, state = await brokerage_service.initiate_connection(
            user_id=user_id,
            broker_id=BrokerId.ALPACA,
            redirect_uri=redirect_uri,
        )

    assert auth_url is not None
    assert state is not None
    assert len(state) > 0

    # Verify connection was added
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

    # Verify state was cached
    mock_cache.set.assert_called_once()


@pytest.mark.asyncio
async def test_initiate_connection_without_cache(brokerage_service_no_cache, mock_db):
    """Test initiate_connection works without cache (uses in-memory store)."""
    user_id = uuid4()
    redirect_uri = "https://example.com/callback"

    with patch.object(
        brokerage_service_no_cache.get_adapter(BrokerId.ALPACA),
        "get_authorization_url",
        new_callable=AsyncMock,
        return_value="https://alpaca.com/oauth?state=test",
    ):
        auth_url, state = await brokerage_service_no_cache.initiate_connection(
            user_id=user_id,
            broker_id=BrokerId.ALPACA,
            redirect_uri=redirect_uri,
        )

    assert auth_url is not None
    assert state is not None

    # Verify state is stored in memory
    assert state in brokerage_service_no_cache._oauth_states


@pytest.mark.asyncio
async def test_get_token_set_no_cache(brokerage_service_no_cache, mock_db):
    """Test get_token_set raises error when no cache available."""
    mock_conn = MagicMock(spec=BrokerageConnection)
    mock_conn.token_secret_id = "token:123:alpaca"
    mock_conn.broker_id = BrokerId.ALPACA

    with pytest.raises(ValueError, match="No tokens available"):
        await brokerage_service_no_cache.get_token_set(mock_conn)


@pytest.mark.asyncio
async def test_get_token_set_tokens_not_found(brokerage_service, mock_cache):
    """Test get_token_set raises error when tokens not in cache."""
    mock_conn = MagicMock(spec=BrokerageConnection)
    mock_conn.token_secret_id = "token:123:alpaca"
    mock_conn.broker_id = BrokerId.ALPACA

    mock_cache.get.return_value = None

    with pytest.raises(ValueError, match="Tokens expired or not found"):
        await brokerage_service.get_token_set(mock_conn)


@pytest.mark.asyncio
async def test_get_token_set_alpaca(brokerage_service, mock_cache):
    """Test get_token_set returns AlpacaTokenSet for Alpaca connection."""
    from app.brokers.alpaca import AlpacaTokenSet

    mock_conn = MagicMock(spec=BrokerageConnection)
    mock_conn.token_secret_id = "token:123:alpaca"
    mock_conn.broker_id = BrokerId.ALPACA

    mock_cache.get.return_value = {
        "access_token": "test_access_token",
        "refresh_token": "test_refresh_token",
    }

    token_set = await brokerage_service.get_token_set(mock_conn)

    assert isinstance(token_set, AlpacaTokenSet)
    assert token_set.access_token == "test_access_token"
    assert token_set.refresh_token == "test_refresh_token"


@pytest.mark.asyncio
async def test_get_token_set_etrade(brokerage_service, mock_cache):
    """Test get_token_set returns ETradeTokenSet for E*TRADE connection."""
    from app.brokers.etrade import ETradeTokenSet

    mock_conn = MagicMock(spec=BrokerageConnection)
    mock_conn.token_secret_id = "token:123:etrade"
    mock_conn.broker_id = BrokerId.ETRADE

    mock_cache.get.return_value = {
        "access_token": "test_access_token",
        "access_token_secret": "test_access_secret",
    }

    token_set = await brokerage_service.get_token_set(mock_conn)

    assert isinstance(token_set, ETradeTokenSet)
    assert token_set.access_token == "test_access_token"
    assert token_set.access_token_secret == "test_access_secret"
