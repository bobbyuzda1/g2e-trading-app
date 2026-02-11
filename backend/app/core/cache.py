"""Redis cache service with graceful fallback when Redis is unavailable."""
import json
import logging
from typing import Any
import redis.asyncio as redis

from app.config import get_settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis cache wrapper that silently degrades when Redis is unavailable."""

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
        self._available = False

    async def connect(self) -> None:
        """Connect to Redis. Logs warning and continues if unavailable."""
        if self._client is None:
            try:
                self._client = redis.from_url(self._url, decode_responses=True)
                await self._client.ping()
                self._available = True
            except (redis.ConnectionError, ConnectionRefusedError, OSError) as e:
                logger.warning(f"Redis unavailable ({e}), cache disabled")
                self._client = None
                self._available = False

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._client:
            await self._client.close()
            self._client = None
            self._available = False

    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        if not self._available:
            return None

        value = await self._client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        """Set value in cache with optional TTL."""
        if not self._available:
            return False

        serialized = json.dumps(value) if not isinstance(value, str) else value
        return await self._client.set(key, serialized, ex=ttl)

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self._available:
            return False

        return await self._client.delete(key) > 0

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        if not self._available:
            return False

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
