# Google-to-E*TRADE (G2E) Project Plan

## Overview

AI-powered E*TRADE trading application integrating Google Gemini for analysis, strategy discovery, and trade recommendations with human-approval workflows.

---

## API Credentials

### Google Gemini API

```
API Key: REDACTED_GEMINI_KEY
Usage: key=API_KEY parameter in requests
Models: gemini-2.5-pro (25%), gemini-2.5-flash-lite (75%)
```

### E*TRADE Sandbox API

```
Consumer Key: REDACTED_ETRADE_KEY
Consumer Secret: REDACTED_ETRADE_SECRET
Environment: Sandbox (testing)
Auth Protocol: OAuth 1.0a
```

### Production Setup (Future)
- Apply for production API access at https://developer.etrade.com/
- Production keys will be different from sandbox
- Requires additional E*TRADE approval

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python) |
| AI | Google Gemini (Pro + Flash-Lite) |
| Database | PostgreSQL |
| Cache | Redis |
| Frontend | React + Tailwind CSS + Tremor |
| Charts | TradingView Lightweight Charts |
| Email | SendGrid |
| Auth | JWT (WordPress) + OAuth 1.0a (E*TRADE) |

---

## Estimated Monthly Costs

| Service | Cost |
|---------|------|
| Gemini API | ~$3.65/month |
| Hosting (Railway/Render) | ~$10-20/month |
| PostgreSQL (managed) | ~$5-15/month |
| Redis (managed) | ~$5-10/month |
| **Total** | **~$25-50/month** |

---

## Core Features

1. **Strategy Discovery** - AI analyzes E*TRADE history to generate personalized strategies
2. **Portfolio Analysis** - Strategy-aware AI analysis of holdings
3. **Trade Recommendations** - Smart, justified buy/sell recommendations
4. **Email Confirmations** - Human-in-the-loop approval via SendGrid
5. **WordPress Integration** - JWT auth with existing Cloud City Roasters site
6. **AI Chat Interface** - Conversational AI assistant for research and analysis
7. **Trading Plans** - Term-based objectives with active plan prioritization

---

## AI Context Hierarchy

The AI considers context in this priority order for all interactions:

```
┌─────────────────────────────────────────────────────┐
│ 1. ACTIVE PLAN (Highest Priority)                   │
│    Term-based objective (e.g., "Grow to $50K by Q2")│
│    Only 1 can be active at a time                   │
├─────────────────────────────────────────────────────┤
│ 2. TRADING STRATEGY                                 │
│    Long-term investment philosophy and rules        │
│    (Value, Growth, DRIP to FIRE, etc.)              │
├─────────────────────────────────────────────────────┤
│ 3. USER PROFILE CONTEXT                             │
│    Communication preferences, risk tolerance,       │
│    experience level, response style                 │
├─────────────────────────────────────────────────────┤
│ 4. CONVERSATION CONTEXT                             │
│    Current chat thread and history                  │
└─────────────────────────────────────────────────────┘
```

---

## Feature: Trading Plans

### Overview
Plans are term-based objectives that provide specific, time-bound context for AI interactions. While Trading Strategy defines the "how" of investing, Plans define the "what" and "when" for specific periods.

### Plan Structure
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Q1 2025 Growth Sprint",
  "description": "Aggressive growth focus to reach $50K portfolio",
  "term_type": "quarterly",  // weekly, monthly, quarterly, yearly, custom
  "start_date": "2025-01-01",
  "end_date": "2025-03-31",
  "objectives": [
    "Grow portfolio from $35K to $50K",
    "Add 3 new growth positions",
    "Maintain max 5% position sizing"
  ],
  "constraints": [
    "No options trading",
    "Max 2 trades per week"
  ],
  "success_metrics": {
    "target_portfolio_value": 50000,
    "target_return_percent": 42.8,
    "max_drawdown_percent": 15
  },
  "is_active": true,
  "status": "in_progress",  // draft, in_progress, completed, abandoned
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Plan Term Types
| Term | Typical Use Case |
|------|------------------|
| Weekly | Short-term swing trade focus, earnings plays |
| Monthly | Sector rotation, rebalancing goals |
| Quarterly | Growth targets, major portfolio shifts |
| Yearly | Long-term FIRE milestones, annual returns |
| Custom | Specific events (e.g., "Before vacation", "Tax year end") |

### Plan vs Strategy
| Aspect | Trading Strategy | Plan |
|--------|-----------------|------|
| Timeframe | Indefinite | Specific dates |
| Scope | Philosophy/approach | Concrete objectives |
| Quantity | 1 per user | Multiple (1 active) |
| Changes | Rarely modified | Created frequently |
| Example | "Value investing with 25% profit targets" | "Add $5K by March, focus on tech sector" |

### Best Practices Implemented
- **Single Active Plan**: Only 1 plan active to prevent conflicting priorities
- **Plan Templates**: Pre-built templates for common objectives
- **Progress Tracking**: Visual progress bars and milestone tracking
- **AI Plan Suggestions**: AI can suggest plans based on portfolio analysis
- **Plan History**: Archive of past plans for performance review
- **Plan Conflicts**: AI warns if plan objectives conflict with strategy

---

## Feature: AI Chat Interface

### Overview
Conversational AI interface for research, analysis, and trading assistance. Each conversation maintains context while considering user's profile, strategy, and active plan.

### Context Injection
Every AI request includes:
```python
system_prompt = f"""
## USER PROFILE CONTEXT
{user.profile_context}

## TRADING STRATEGY
{user.trading_strategy}

## ACTIVE PLAN (if set)
{user.active_plan or "No active plan"}

## CONVERSATION CONTEXT
This is an ongoing conversation. Previous context is available.

Respond as a knowledgeable trading assistant aligned with the user's
strategy and current plan objectives.
"""
```

### Chat Interface Features

**Left Sidebar:**
- Conversation list with auto-generated titles
- Search/filter conversations
- Pin important conversations
- Folder organization (optional)
- "New Chat" button prominently placed

**Conversation Management:**
- Auto-title from first user message (AI summarizes)
- User can rename conversations
- Delete with confirmation
- Export conversation as PDF/Markdown

**Chat Area:**
- Message bubbles with timestamps
- Code/data formatting support
- Inline charts for portfolio data
- "Thinking" indicator during AI processing
- Regenerate response option
- Copy message button

**Context Indicators:**
- Badge showing active plan name
- Strategy summary visible
- Portfolio snapshot accessible

### Database Schema Addition
```sql
-- User profile context
ALTER TABLE users ADD COLUMN profile_context TEXT;
ALTER TABLE users ADD COLUMN communication_preferences JSONB;

-- Trading Plans
CREATE TABLE trading_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    term_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    objectives JSONB NOT NULL,
    constraints JSONB,
    success_metrics JSONB,
    is_active BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    CONSTRAINT one_active_plan UNIQUE (user_id, is_active)
        WHERE is_active = TRUE
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    auto_generated_title BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,
    folder VARCHAR(100),
    context_snapshot JSONB,  -- Captures strategy/plan at conversation start
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB,  -- tokens used, model, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_plans_user_active ON trading_plans(user_id, is_active);
```

### API Endpoints

**Plans:**
```
POST   /api/plans              - Create new plan
GET    /api/plans              - List user's plans
GET    /api/plans/:id          - Get plan details
PUT    /api/plans/:id          - Update plan
DELETE /api/plans/:id          - Delete plan
POST   /api/plans/:id/activate - Set plan as active
POST   /api/plans/:id/complete - Mark plan as completed
GET    /api/plans/templates    - Get plan templates
```

**Conversations:**
```
POST   /api/chat/conversations           - Create conversation
GET    /api/chat/conversations           - List conversations
GET    /api/chat/conversations/:id       - Get conversation with messages
PUT    /api/chat/conversations/:id       - Update (rename, pin, folder)
DELETE /api/chat/conversations/:id       - Delete conversation
POST   /api/chat/conversations/:id/messages - Send message, get AI response
```

---

## Fine-Tuning Resources

- **Knowledge Base**: `G2E-knowledge.md`
- **Training Data**: `G2E-training-data.jsonl`
- **Platform**: Google Vertex AI (Supervised Fine-Tuning)

---

## Development Phases

### Phase 1: Foundation
- [ ] Set up FastAPI project structure
- [ ] Implement E*TRADE OAuth 1.0a client
- [ ] Create Gemini service (Pro + Flash-Lite)
- [ ] Set up PostgreSQL database with schema
- [ ] Add user profile context and communication preferences

### Phase 2: Core Services
- [ ] Strategy Discovery service
- [ ] Portfolio analysis endpoints
- [ ] Trade recommendation engine
- [ ] Email confirmation workflow
- [ ] Trading Plans CRUD service
- [ ] Plan activation/completion logic

### Phase 3: AI Chat System
- [ ] Conversations and Messages service
- [ ] Context injection pipeline (Profile → Strategy → Plan)
- [ ] Auto-title generation from first message
- [ ] Streaming response support
- [ ] Conversation search and filtering

### Phase 4: Frontend
- [ ] React dashboard components
- [ ] Strategy wizard UI
- [ ] Trade queue interface
- [ ] **AI Chat interface with sidebar**
- [ ] **Plans management UI**
- [ ] Mobile-responsive design

### Phase 5: Integration
- [ ] WordPress JWT authentication
- [ ] Deploy to production hosting
- [ ] Fine-tune Gemini on Vertex AI
- [ ] End-to-end testing
- [ ] Plan templates library

---

## Chat UX Best Practices

### Conversation Auto-Titling
```python
async def generate_conversation_title(first_message: str) -> str:
    """Generate concise title from first user message."""
    prompt = f"""
    Summarize this user message into a 3-6 word conversation title.
    Focus on the main topic or question.
    Do not use quotes or punctuation at the end.

    Message: {first_message}

    Title:
    """
    # Use Flash-Lite for speed and cost efficiency
    response = await gemini_flash.generate(prompt)
    return response.text.strip()[:50]  # Max 50 chars
```

### Context Window Management
- Keep last 20 messages in active context
- Summarize older messages for long conversations
- Include strategy/plan in every request (not just first)
- Token budget: ~3000 for context, ~1000 for response

### Suggested Prompts
Display contextual suggestions based on:
- Active plan objectives ("How am I tracking toward my Q1 goal?")
- Recent portfolio changes ("Analyze my NVDA position")
- Market conditions ("Should I adjust my strategy given the Fed news?")
- Time of day ("What's the pre-market setup for today?")

### Error Handling
- Graceful degradation if AI times out
- Retry logic with exponential backoff
- Show partial response if streaming fails
- "AI is thinking longer than usual" message after 10s

### Mobile Considerations
- Collapsible sidebar (hamburger menu)
- Full-screen chat on mobile
- Swipe to reveal conversation actions
- Voice input option (future)

---

## Security Notes

- Never commit production API keys to git
- Use environment variables for all secrets
- Rotate keys if exposed
- Sandbox keys above are for development only

---

## Performance Requirements

### Response Time Targets

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Page load (initial) | < 2s | 3s | First contentful paint |
| Page load (subsequent) | < 1s | 2s | With caching |
| Portfolio refresh | < 1s | 2s | Live data fetch |
| AI response (simple) | < 3s | 5s | Flash-Lite model |
| AI response (complex) | < 5s | 10s | Pro model |
| Search/filter | < 200ms | 500ms | Client-side filtering |
| Trade preview | < 2s | 3s | E*TRADE API call |
| Conversation load | < 500ms | 1s | From database |

### Performance Budgets

| Resource Type | Budget | Notes |
|---------------|--------|-------|
| JavaScript (initial) | < 200KB | Gzipped, code-split |
| CSS | < 50KB | Gzipped, critical CSS inlined |
| Images | < 500KB | Per page, lazy loaded |
| Fonts | < 100KB | WOFF2, subset if possible |
| API payload | < 100KB | Per request, paginate large data |
| Total page weight | < 1MB | First load |

### Core Web Vitals Targets

| Metric | Target | Threshold |
|--------|--------|-----------|
| LCP (Largest Contentful Paint) | < 2.5s | Good |
| FID (First Input Delay) | < 100ms | Good |
| CLS (Cumulative Layout Shift) | < 0.1 | Good |
| TTFB (Time to First Byte) | < 600ms | - |

### API Performance

| Endpoint | Target P50 | Target P99 | Rate Limit |
|----------|------------|------------|------------|
| GET /portfolio | 500ms | 2s | 60/min |
| GET /quotes | 200ms | 1s | 120/min |
| POST /chat/messages | 3s | 10s | 30/min |
| POST /recommendations | 5s | 15s | 10/min |
| GET /conversations | 200ms | 500ms | 60/min |

### Database Query Performance

| Query Type | Target | Index Required |
|------------|--------|----------------|
| User lookup | < 5ms | PRIMARY KEY |
| Portfolio fetch | < 20ms | user_id |
| Conversation list | < 30ms | user_id, updated_at |
| Message history | < 50ms | conversation_id, created_at |
| Audit log insert | < 10ms | None (append-only) |
| Strategy fetch | < 10ms | user_id |

---

## Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Service Worker Cache (static assets)            │    │
│  │  React Query Cache (API responses)               │    │
│  │  LocalStorage (user preferences, dismissed hints)│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       CDN (CloudFlare)                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Static assets (JS, CSS, images)                 │    │
│  │  TTL: 1 year (versioned filenames)              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    REDIS CACHE                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Portfolio data, quotes, sessions, rate limits   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    POSTGRESQL                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Source of truth for all persistent data         │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Redis Cache Configuration

| Data Type | Key Pattern | TTL | Invalidation |
|-----------|-------------|-----|--------------|
| Portfolio | `portfolio:{user_id}:{account_id}` | 60s | On trade, manual refresh |
| Quotes | `quotes:{symbols_hash}` | 15s | Time-based only |
| User session | `session:{session_id}` | 4h | On logout, token refresh |
| User strategy | `strategy:{user_id}` | 24h | On strategy update |
| Conversation context | `conv_ctx:{conversation_id}` | 4h | On conversation end |
| Rate limit counters | `ratelimit:{user_id}:{endpoint}` | 60s | Time-based only |
| Circuit breaker state | `circuit:{service_name}` | 5m | On state change |
| E*TRADE token | `etrade_token:{user_id}` | 2h | On refresh, revocation |

### Cache Implementation

```python
# app/services/cache_service.py
import json
from typing import Optional, Any, Callable
from datetime import timedelta
import hashlib

class CacheService:
    """
    Redis cache service with typed operations.
    """

    # TTL configuration (seconds)
    TTL_CONFIG = {
        'portfolio': 60,
        'quotes': 15,
        'session': 14400,      # 4 hours
        'strategy': 86400,     # 24 hours
        'conversation': 14400,  # 4 hours
        'rate_limit': 60,
        'circuit': 300,        # 5 minutes
        'token': 7200,         # 2 hours
    }

    def __init__(self, redis_client):
        self.redis = redis_client

    async def get(self, key: str) -> Optional[dict]:
        """Get cached value, returns None if not found or expired."""
        data = await self.redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl_type: str = None,
        ttl_seconds: int = None
    ):
        """
        Set cached value with TTL.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl_type: TTL type from TTL_CONFIG
            ttl_seconds: Override TTL in seconds
        """
        ttl = ttl_seconds or self.TTL_CONFIG.get(ttl_type, 60)
        await self.redis.setex(
            key,
            ttl,
            json.dumps(value, default=str)
        )

    async def delete(self, key: str):
        """Delete cached value."""
        await self.redis.delete(key)

    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern."""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

    async def get_or_set(
        self,
        key: str,
        factory: Callable,
        ttl_type: str = None,
        ttl_seconds: int = None
    ) -> Any:
        """
        Get from cache or compute and cache.

        Args:
            key: Cache key
            factory: Async function to compute value if not cached
            ttl_type: TTL type from TTL_CONFIG
            ttl_seconds: Override TTL in seconds

        Returns:
            Cached or computed value
        """
        cached = await self.get(key)
        if cached is not None:
            return cached

        value = await factory()
        await self.set(key, value, ttl_type, ttl_seconds)
        return value


# Cache key builders
def portfolio_key(user_id: str, account_id: str) -> str:
    return f"portfolio:{user_id}:{account_id}"

def quotes_key(symbols: list[str]) -> str:
    # Hash symbols list for consistent key
    symbols_sorted = sorted(symbols)
    symbols_hash = hashlib.md5(",".join(symbols_sorted).encode()).hexdigest()[:12]
    return f"quotes:{symbols_hash}"

def strategy_key(user_id: str) -> str:
    return f"strategy:{user_id}"

def conversation_context_key(conversation_id: str) -> str:
    return f"conv_ctx:{conversation_id}"
```

### Cache Invalidation

```python
# app/services/cache_invalidation.py

class CacheInvalidator:
    """
    Handles cache invalidation on data changes.
    """

    def __init__(self, cache: CacheService):
        self.cache = cache

    async def on_trade_executed(self, user_id: str, account_id: str):
        """Invalidate caches when a trade is executed."""
        await self.cache.delete(portfolio_key(user_id, account_id))

    async def on_strategy_updated(self, user_id: str):
        """Invalidate strategy cache when user updates their strategy."""
        await self.cache.delete(strategy_key(user_id))
        # Also invalidate any cached AI analysis that used old strategy
        await self.cache.delete_pattern(f"analysis:{user_id}:*")

    async def on_user_logout(self, user_id: str, session_id: str):
        """Clear user session data on logout."""
        await self.cache.delete(f"session:{session_id}")

    async def on_etrade_reauth(self, user_id: str):
        """Clear E*TRADE related caches on re-authentication."""
        await self.cache.delete(f"etrade_token:{user_id}")
        await self.cache.delete_pattern(f"portfolio:{user_id}:*")
```

### Client-Side Caching (React Query)

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - how long data is considered fresh
      staleTime: 30 * 1000, // 30 seconds

      // Cache time - how long inactive data stays in cache
      cacheTime: 5 * 60 * 1000, // 5 minutes

      // Retry configuration
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch behavior
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Query-specific configurations
export const queryConfigs = {
  portfolio: {
    staleTime: 30 * 1000,      // 30 seconds
    cacheTime: 2 * 60 * 1000,  // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute when visible
  },
  quotes: {
    staleTime: 10 * 1000,      // 10 seconds
    cacheTime: 30 * 1000,      // 30 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  },
  conversations: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  strategy: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};
```

### Cache Warming

Pre-populate cache for frequently accessed data.

```python
# app/workers/cache_warmer.py

async def warm_user_cache(user_id: str):
    """
    Pre-warm cache when user logs in.
    Called after successful authentication.
    """
    # Fetch and cache portfolio
    portfolio = await etrade_service.get_portfolio(user_id)
    await cache.set(
        portfolio_key(user_id, portfolio['account_id']),
        portfolio,
        ttl_type='portfolio'
    )

    # Fetch and cache strategy
    strategy = await db.get_user_strategy(user_id)
    if strategy:
        await cache.set(strategy_key(user_id), strategy, ttl_type='strategy')

    # Pre-fetch recent conversations
    conversations = await db.get_recent_conversations(user_id, limit=10)
    for conv in conversations:
        await cache.set(
            conversation_context_key(conv['id']),
            conv,
            ttl_type='conversation'
        )
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API response time P99 | > 5s | > 10s | Scale up, investigate |
| Error rate | > 1% | > 5% | Page on-call |
| Cache hit rate | < 80% | < 60% | Review cache strategy |
| E*TRADE API latency | > 2s | > 5s | Check E*TRADE status |
| Gemini API latency | > 8s | > 15s | Switch to fallback |
| Database connections | > 80% pool | > 95% pool | Scale database |
| Memory usage | > 80% | > 95% | Investigate leaks |
| Redis memory | > 70% | > 90% | Increase or evict |

### Health Check Endpoints

```python
# app/routes/health.py

@router.get("/health")
async def health_check():
    """Basic health check for load balancer."""
    return {"status": "healthy"}

@router.get("/health/detailed")
async def detailed_health():
    """Detailed health check with dependencies."""
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "etrade": await check_etrade_api(),
        "gemini": await check_gemini_api(),
    }

    all_healthy = all(c["healthy"] for c in checks.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
```
