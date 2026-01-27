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
