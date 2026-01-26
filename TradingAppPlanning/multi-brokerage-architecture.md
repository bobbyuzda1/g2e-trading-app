# Multi-Brokerage Architecture Design

## Overview

This document specifies the technical architecture for supporting multiple brokerage platforms in the G2E Trading App. The design uses a **full abstraction layer** that normalizes all brokerage APIs into a unified interface, allowing users to connect multiple brokerages simultaneously.

## Supported Brokerages

| Brokerage | Priority | Auth Method | API Type | Assets | Status |
|-----------|----------|-------------|----------|--------|--------|
| E*TRADE | P1 (Current) | OAuth 1.0a | REST | Stocks, Options | Production |
| Alpaca | P2 | OAuth 2.0 | REST + WebSocket | **Stocks, Options, Crypto** | Planned |
| Schwab | P3 | OAuth 2.0 | REST | Stocks, Options | Planned |
| Interactive Brokers | P4 | OAuth 1.0a/2.0 | REST + WebSocket | Stocks, Options, Futures, Forex | Planned |

### Cryptocurrency Support

**Alpaca serves as our crypto trading provider.** This eliminates the need for a separate crypto exchange integration (e.g., Coinbase) while providing:

| Feature | Details |
|---------|---------|
| Supported Assets | 20+ cryptos: BTC, ETH, LTC, DOGE, SOL, AVAX, etc. |
| Trading Pairs | 52+ pairs (USD, BTC, USDT base) |
| Fees | 0.15% maker / 0.25% taker |
| Security | Fireblocks MPC-CMP wallets, SOC 2 Type II |
| Regulation | SEC/FINRA regulated, MiCA compliant (EU) |
| Key Benefit | Same API as stocks - unified trading experience |

**Why Alpaca for Crypto (not Coinbase):**
- Single API for stocks + crypto = simpler architecture
- Unified portfolio view across all asset types
- Paper trading works for crypto too
- Users don't need separate crypto exchange account
- Fewer integrations to maintain

---

## 1. Abstraction Layer Architecture

### 1.1 Core Interface Definition

```typescript
// Unified Broker Interface - All adapters implement this
interface IBrokerageAdapter {
  // Identity
  readonly brokerId: BrokerId;
  readonly brokerName: string;
  readonly supportedFeatures: BrokerFeatures;

  // Authentication
  getAuthorizationUrl(state: string): string;
  handleOAuthCallback(code: string, state: string): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;
  revokeAccess(tokens: TokenSet): Promise<void>;

  // Account
  getAccounts(): Promise<Account[]>;
  getAccountBalance(accountId: string): Promise<Balance>;

  // Portfolio
  getPositions(accountId: string): Promise<Position[]>;
  getOrders(accountId: string, status?: OrderStatus): Promise<Order[]>;
  getOrderHistory(accountId: string, startDate: Date, endDate: Date): Promise<Order[]>;

  // Market Data
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getOptionChain(symbol: string, expiration?: Date): Promise<OptionChain>;

  // Trading
  placeOrder(accountId: string, order: OrderRequest): Promise<OrderResult>;
  cancelOrder(accountId: string, orderId: string): Promise<CancelResult>;
  modifyOrder(accountId: string, orderId: string, changes: OrderModification): Promise<OrderResult>;

  // Real-time (optional)
  subscribeQuotes?(symbols: string[], callback: QuoteCallback): Subscription;
  subscribeOrders?(accountId: string, callback: OrderCallback): Subscription;
}
```

### 1.2 Normalized Data Models

```typescript
// Broker-agnostic data models

type BrokerId = 'etrade' | 'alpaca' | 'schwab' | 'ibkr';

interface Account {
  brokerId: BrokerId;
  accountId: string;           // Broker's internal ID
  accountNumber: string;       // Display number (masked)
  accountType: AccountType;    // 'cash' | 'margin' | 'ira' | 'roth_ira'
  accountName: string;
  isDefault: boolean;
}

interface Position {
  brokerId: BrokerId;
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  assetType: AssetType;        // 'stock' | 'etf' | 'option' | 'crypto'
  lastUpdated: Date;
}

interface Order {
  brokerId: BrokerId;
  accountId: string;
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell' | 'buy_to_cover' | 'sell_short';
  quantity: number;
  filledQuantity: number;
  orderType: OrderType;        // 'market' | 'limit' | 'stop' | 'stop_limit'
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;    // 'day' | 'gtc' | 'ioc' | 'fok'
  status: OrderStatus;
  submittedAt: Date;
  filledAt?: Date;
  averageFillPrice?: number;
}

interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: Date;
  source: BrokerId;            // Which broker provided the quote
}

interface Balance {
  brokerId: BrokerId;
  accountId: string;
  cashAvailable: number;
  cashBalance: number;
  buyingPower: number;
  dayTradingBuyingPower?: number;
  portfolioValue: number;
  marginUsed?: number;
  maintenanceMargin?: number;
}

interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell' | 'buy_to_cover' | 'sell_short';
  quantity: number;
  orderType: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  extendedHours?: boolean;
}
```

### 1.3 Feature Detection

Different brokers support different capabilities:

```typescript
interface BrokerFeatures {
  // Trading
  stockTrading: boolean;
  optionsTrading: boolean;
  cryptoTrading: boolean;
  fractionalShares: boolean;
  extendedHours: boolean;
  shortSelling: boolean;

  // Order Types
  marketOrders: boolean;
  limitOrders: boolean;
  stopOrders: boolean;
  stopLimitOrders: boolean;
  trailingStopOrders: boolean;
  bracketOrders: boolean;
  ocoOrders: boolean;          // One-cancels-other

  // Data
  realTimeQuotes: boolean;
  delayedQuotes: boolean;
  level2Data: boolean;
  optionChains: boolean;

  // Account
  paperTrading: boolean;
  multipleAccounts: boolean;

  // Refresh Requirements
  tokenRefreshDays: number;    // 0 = automatic, 7 = Schwab, etc.
  requiresManualReauth: boolean;
}

// Feature matrix by broker
const BROKER_FEATURES: Record<BrokerId, BrokerFeatures> = {
  etrade: {
    stockTrading: true,
    optionsTrading: true,
    cryptoTrading: false,
    fractionalShares: false,
    extendedHours: true,
    shortSelling: true,
    marketOrders: true,
    limitOrders: true,
    stopOrders: true,
    stopLimitOrders: true,
    trailingStopOrders: true,
    bracketOrders: false,
    ocoOrders: false,
    realTimeQuotes: true,
    delayedQuotes: true,
    level2Data: false,
    optionChains: true,
    paperTrading: false,
    multipleAccounts: true,
    tokenRefreshDays: 0,       // Automatic with refresh token
    requiresManualReauth: false,
  },
  alpaca: {
    stockTrading: true,
    optionsTrading: true,
    cryptoTrading: true,
    fractionalShares: true,
    extendedHours: true,
    shortSelling: true,
    marketOrders: true,
    limitOrders: true,
    stopOrders: true,
    stopLimitOrders: true,
    trailingStopOrders: true,
    bracketOrders: true,
    ocoOrders: true,
    realTimeQuotes: true,
    delayedQuotes: true,
    level2Data: false,
    optionChains: true,
    paperTrading: true,        // Key differentiator!
    multipleAccounts: false,
    tokenRefreshDays: 0,
    requiresManualReauth: false,
  },
  schwab: {
    stockTrading: true,
    optionsTrading: true,
    cryptoTrading: false,
    fractionalShares: true,
    extendedHours: true,
    shortSelling: true,
    marketOrders: true,
    limitOrders: true,
    stopOrders: true,
    stopLimitOrders: true,
    trailingStopOrders: true,
    bracketOrders: false,
    ocoOrders: false,
    realTimeQuotes: true,
    delayedQuotes: true,
    level2Data: false,
    optionChains: true,
    paperTrading: false,
    multipleAccounts: true,
    tokenRefreshDays: 7,       // Manual refresh required
    requiresManualReauth: true,
  },
  ibkr: {
    stockTrading: true,
    optionsTrading: true,
    cryptoTrading: true,
    fractionalShares: false,
    extendedHours: true,
    shortSelling: true,
    marketOrders: true,
    limitOrders: true,
    stopOrders: true,
    stopLimitOrders: true,
    trailingStopOrders: true,
    bracketOrders: true,
    ocoOrders: true,
    realTimeQuotes: true,
    delayedQuotes: true,
    level2Data: true,
    optionChains: true,
    paperTrading: true,
    multipleAccounts: true,
    tokenRefreshDays: 0,
    requiresManualReauth: false,
  },
};
```

---

## 2. Database Schema

### 2.1 Brokerage Connections Table

```sql
CREATE TABLE brokerage_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_id VARCHAR(20) NOT NULL,  -- 'etrade', 'alpaca', 'schwab', 'ibkr'

  -- Connection Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'active', 'expired', 'revoked', 'error'
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,  -- For Schwab 7-day refresh

  -- Encrypted Tokens (stored in secrets manager, reference here)
  token_secret_id VARCHAR(255),  -- Reference to HashiCorp Vault or AWS Secrets Manager

  -- User Preferences
  is_primary BOOLEAN DEFAULT FALSE,  -- Primary broker for trading
  nickname VARCHAR(100),  -- User-friendly name: "My Schwab IRA"

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_broker UNIQUE (user_id, broker_id)
);

CREATE INDEX idx_brokerage_connections_user ON brokerage_connections(user_id);
CREATE INDEX idx_brokerage_connections_status ON brokerage_connections(status);
CREATE INDEX idx_brokerage_connections_expires ON brokerage_connections(expires_at);
```

### 2.2 Brokerage Accounts Table

```sql
CREATE TABLE brokerage_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES brokerage_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_id VARCHAR(20) NOT NULL,

  -- Account Info
  broker_account_id VARCHAR(100) NOT NULL,  -- Broker's internal ID
  account_number_masked VARCHAR(20),  -- "****1234"
  account_type VARCHAR(30),  -- 'cash', 'margin', 'ira', 'roth_ira', 'paper'
  account_name VARCHAR(100),

  -- Preferences
  is_default BOOLEAN DEFAULT FALSE,  -- Default for this broker
  include_in_aggregate BOOLEAN DEFAULT TRUE,  -- Include in unified portfolio view

  -- Cached Balance (updated on sync)
  cached_cash_balance DECIMAL(15, 2),
  cached_portfolio_value DECIMAL(15, 2),
  cached_buying_power DECIMAL(15, 2),
  balance_updated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_broker_account UNIQUE (connection_id, broker_account_id)
);

CREATE INDEX idx_brokerage_accounts_user ON brokerage_accounts(user_id);
CREATE INDEX idx_brokerage_accounts_connection ON brokerage_accounts(connection_id);
```

### 2.3 Cached Positions Table (for fast unified portfolio view)

```sql
CREATE TABLE cached_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES brokerage_accounts(id) ON DELETE CASCADE,
  broker_id VARCHAR(20) NOT NULL,

  -- Position Data
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(15, 6) NOT NULL,  -- Supports fractional shares
  average_cost DECIMAL(15, 4),
  current_price DECIMAL(15, 4),
  market_value DECIMAL(15, 2),
  unrealized_pl DECIMAL(15, 2),
  unrealized_pl_percent DECIMAL(8, 4),
  asset_type VARCHAR(20),  -- 'stock', 'etf', 'option', 'crypto'

  -- Option-specific (nullable)
  option_type VARCHAR(10),  -- 'call', 'put'
  strike_price DECIMAL(15, 2),
  expiration_date DATE,
  underlying_symbol VARCHAR(20),

  -- Sync Info
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL,

  CONSTRAINT unique_position UNIQUE (account_id, symbol)
);

CREATE INDEX idx_cached_positions_user ON cached_positions(user_id);
CREATE INDEX idx_cached_positions_symbol ON cached_positions(symbol);
CREATE INDEX idx_cached_positions_account ON cached_positions(account_id);
```

---

## 3. Service Layer Architecture

### 3.1 Broker Service (Unified Entry Point)

```typescript
class BrokerService {
  private adapters: Map<BrokerId, IBrokerageAdapter>;
  private connectionRepo: BrokerageConnectionRepository;
  private positionCache: PositionCacheService;

  // Get all connected brokers for a user
  async getUserConnections(userId: string): Promise<BrokerageConnection[]>;

  // Get unified portfolio across all brokers
  async getUnifiedPortfolio(userId: string): Promise<UnifiedPortfolio> {
    const connections = await this.connectionRepo.getActiveConnections(userId);
    const portfolios = await Promise.all(
      connections.map(conn => this.getPortfolioForConnection(conn))
    );
    return this.aggregatePortfolios(portfolios);
  }

  // Aggregate positions across brokers
  private aggregatePortfolios(portfolios: BrokerPortfolio[]): UnifiedPortfolio {
    const positionMap = new Map<string, AggregatedPosition>();

    for (const portfolio of portfolios) {
      for (const position of portfolio.positions) {
        const existing = positionMap.get(position.symbol);
        if (existing) {
          // Merge positions from different brokers
          existing.totalQuantity += position.quantity;
          existing.totalMarketValue += position.marketValue;
          existing.brokerBreakdown.push({
            brokerId: portfolio.brokerId,
            accountId: position.accountId,
            quantity: position.quantity,
            marketValue: position.marketValue,
          });
        } else {
          positionMap.set(position.symbol, {
            symbol: position.symbol,
            totalQuantity: position.quantity,
            totalMarketValue: position.marketValue,
            averageCost: position.averageCost,
            brokerBreakdown: [{
              brokerId: portfolio.brokerId,
              accountId: position.accountId,
              quantity: position.quantity,
              marketValue: position.marketValue,
            }],
          });
        }
      }
    }

    return {
      totalValue: portfolios.reduce((sum, p) => sum + p.totalValue, 0),
      totalCash: portfolios.reduce((sum, p) => sum + p.cashBalance, 0),
      positions: Array.from(positionMap.values()),
      brokerSummaries: portfolios.map(p => ({
        brokerId: p.brokerId,
        totalValue: p.totalValue,
        cashBalance: p.cashBalance,
        positionCount: p.positions.length,
      })),
    };
  }

  // Place order with broker selection
  async placeOrder(
    userId: string,
    brokerId: BrokerId,
    accountId: string,
    order: OrderRequest
  ): Promise<OrderResult> {
    const connection = await this.connectionRepo.getConnection(userId, brokerId);
    if (!connection || connection.status !== 'active') {
      throw new BrokerNotConnectedError(brokerId);
    }

    const adapter = this.adapters.get(brokerId);
    const tokens = await this.getTokens(connection);

    // Validate order against broker features
    this.validateOrderForBroker(order, brokerId);

    return adapter.placeOrder(accountId, order, tokens);
  }
}
```

### 3.2 Unified Portfolio Response

```typescript
interface UnifiedPortfolio {
  // Totals across all brokers
  totalValue: number;
  totalCash: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;

  // Aggregated positions (merged across brokers)
  positions: AggregatedPosition[];

  // Per-broker summaries
  brokerSummaries: BrokerSummary[];

  // Data freshness
  lastSyncedAt: Date;
  staleConnections: BrokerId[];  // Brokers that need reauth
}

interface AggregatedPosition {
  symbol: string;
  totalQuantity: number;
  totalMarketValue: number;
  weightedAverageCost: number;
  totalUnrealizedPL: number;

  // Breakdown by broker/account
  brokerBreakdown: {
    brokerId: BrokerId;
    accountId: string;
    accountName: string;
    quantity: number;
    marketValue: number;
    averageCost: number;
  }[];
}

interface BrokerSummary {
  brokerId: BrokerId;
  brokerName: string;
  status: ConnectionStatus;
  totalValue: number;
  cashBalance: number;
  positionCount: number;
  accounts: AccountSummary[];
  expiresAt?: Date;  // For Schwab 7-day refresh
  needsReauth: boolean;
}
```

---

## 4. Authentication Flows

### 4.1 OAuth Flow Manager

```typescript
class OAuthFlowManager {
  // Start OAuth flow
  async initiateConnection(userId: string, brokerId: BrokerId): Promise<AuthUrl> {
    const adapter = this.getAdapter(brokerId);
    const state = this.generateSecureState(userId, brokerId);

    // Store state for callback validation
    await this.stateStore.save(state, { userId, brokerId, expiresIn: 600 });

    return {
      url: adapter.getAuthorizationUrl(state),
      state,
      expiresIn: 600,
    };
  }

  // Handle OAuth callback
  async handleCallback(code: string, state: string): Promise<ConnectionResult> {
    const stateData = await this.stateStore.get(state);
    if (!stateData) throw new InvalidStateError();

    const { userId, brokerId } = stateData;
    const adapter = this.getAdapter(brokerId);

    // Exchange code for tokens
    const tokens = await adapter.handleOAuthCallback(code, state);

    // Store tokens securely
    const secretId = await this.secretsManager.storeTokens(userId, brokerId, tokens);

    // Create connection record
    const connection = await this.connectionRepo.create({
      userId,
      brokerId,
      status: 'active',
      tokenSecretId: secretId,
      connectedAt: new Date(),
      expiresAt: this.calculateExpiry(brokerId, tokens),
    });

    // Fetch and cache accounts
    const accounts = await adapter.getAccounts(tokens);
    await this.accountRepo.syncAccounts(connection.id, accounts);

    return { connection, accounts };
  }

  // Token refresh (called by scheduler)
  async refreshConnection(connectionId: string): Promise<void> {
    const connection = await this.connectionRepo.get(connectionId);
    const adapter = this.getAdapter(connection.brokerId);
    const tokens = await this.secretsManager.getTokens(connection.tokenSecretId);

    try {
      const newTokens = await adapter.refreshToken(tokens.refreshToken);
      await this.secretsManager.updateTokens(connection.tokenSecretId, newTokens);
      await this.connectionRepo.update(connectionId, {
        status: 'active',
        expiresAt: this.calculateExpiry(connection.brokerId, newTokens),
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await this.connectionRepo.update(connectionId, { status: 'expired' });
        await this.notifyUserReauthRequired(connection.userId, connection.brokerId);
      }
      throw error;
    }
  }
}
```

### 4.2 Broker-Specific Auth Details

| Broker | OAuth Version | Token Lifetime | Refresh Method | Special Requirements |
|--------|---------------|----------------|----------------|---------------------|
| E*TRADE | OAuth 1.0a | ~2 hours access, long-lived refresh | Automatic | Consumer key/secret |
| Alpaca | OAuth 2.0 | Configurable | Automatic | App approval for live trading |
| Schwab | OAuth 2.0 | 30 min access, 7-day refresh | Manual reauth every 7 days | ThinkorSwim enabled |
| IBKR | OAuth 1.0a/2.0 | Session-based | Keep-alive required | Pro account, gateway running |

---

## 5. User Experience Flow

### 5.1 Onboarding: Connect First Brokerage

```
┌─────────────────────────────────────────────────────────────┐
│                   Connect Your Brokerage                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Choose your brokerage to get started:                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   E*TRADE    │  │    Alpaca    │  │    Schwab    │      │
│  │   [Logo]     │  │   [Logo]     │  │   [Logo]     │      │
│  │              │  │ Paper Trading│  │  (formerly   │      │
│  │   Connect    │  │   Available! │  │ TD Ameritrade│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐                                          │
│  │ Interactive  │  Need help choosing?                      │
│  │   Brokers    │  [Compare Brokerages →]                  │
│  │   [Logo]     │                                          │
│  │  Advanced    │                                          │
│  └──────────────┘                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  🔒 Your credentials are never stored. We use secure OAuth  │
│     to connect directly to your brokerage.                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Settings: Manage Connected Brokerages

```
┌─────────────────────────────────────────────────────────────┐
│                   Connected Brokerages                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 E*TRADE                              [Primary ▼] │   │
│  │    Individual Account ****4521                      │   │
│  │    Last synced: 2 minutes ago                       │   │
│  │    [Refresh] [Disconnect]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 Alpaca                                           │   │
│  │    Paper Trading Account                            │   │
│  │    Last synced: 5 minutes ago                       │   │
│  │    [Refresh] [Disconnect]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 Schwab                          ⚠️ Reauth in 2d  │   │
│  │    My Schwab IRA ****8832                           │   │
│  │    Trading Account ****1156                         │   │
│  │    [Refresh Now] [Disconnect]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  + Connect Another Brokerage                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Portfolio View: Unified + Per-Broker

```
┌─────────────────────────────────────────────────────────────┐
│  Portfolio Overview                    View: [All ▼]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total Portfolio Value        $247,832.45  (+$3,421 +1.4%)  │
│  ├─ E*TRADE                   $182,456.12                   │
│  ├─ Schwab                    $52,891.33                    │
│  └─ Alpaca (Paper)            $12,485.00                    │
│                                                             │
│  Cash Available               $18,234.00                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Holdings (Aggregated)                                      │
├───────────┬────────┬──────────┬────────────┬───────────────┤
│ Symbol    │ Shares │ Value    │ P/L        │ Brokers       │
├───────────┼────────┼──────────┼────────────┼───────────────┤
│ AAPL      │ 150    │ $28,425  │ +$3,240    │ E*T, SCH      │
│ NVDA      │ 50     │ $42,150  │ +$12,400   │ E*TRADE       │
│ MSFT      │ 75     │ $31,875  │ +$4,125    │ Schwab        │
│ VTI       │ 200    │ $48,600  │ +$6,200    │ E*T, SCH      │
│ TSLA      │ 25     │ $6,225   │ -$450      │ Alpaca        │
└───────────┴────────┴──────────┴────────────┴───────────────┘
│                                                             │
│  [Expand AAPL ▼]                                           │
│  ├─ E*TRADE (****4521):    100 shares @ $175.00            │
│  └─ Schwab (****8832):      50 shares @ $182.30            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Trade Execution: Select Broker

```
┌─────────────────────────────────────────────────────────────┐
│  Trade AAPL                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Price: $189.50 (+1.2%)                            │
│                                                             │
│  Action:  [Buy ●]  [Sell ○]                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Execute via:                                        │   │
│  │                                                     │   │
│  │ ● E*TRADE - Individual ****4521      [Primary]     │   │
│  │   Cash Available: $12,450                          │   │
│  │   Current AAPL: 100 shares                         │   │
│  │                                                     │   │
│  │ ○ Schwab - Trading ****1156                        │   │
│  │   Cash Available: $5,200                           │   │
│  │   Current AAPL: 50 shares                          │   │
│  │                                                     │   │
│  │ ○ Alpaca - Paper Account             [Paper]       │   │
│  │   Cash Available: $8,500                           │   │
│  │   Current AAPL: 0 shares                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quantity:     [____25____] shares                         │
│  Order Type:   [Limit ▼]                                   │
│  Limit Price:  $[__189.00__]                               │
│  Time in Force: [Day ▼]                                    │
│                                                             │
│  Order Preview:                                             │
│  Buy 25 AAPL @ $189.00 limit via E*TRADE                   │
│  Estimated Cost: $4,725.00                                 │
│                                                             │
│            [Cancel]    [Preview Order →]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Scheduling and Background Jobs

### 6.1 Token Refresh Scheduler

```typescript
// Run every hour
async function checkTokenExpirations() {
  // Find connections expiring in next 24 hours
  const expiringConnections = await connectionRepo.findExpiringSoon(24);

  for (const connection of expiringConnections) {
    const broker = BROKER_FEATURES[connection.brokerId];

    if (broker.requiresManualReauth) {
      // Schwab: notify user they need to reauth
      await notificationService.send(connection.userId, {
        type: 'REAUTH_REQUIRED',
        brokerId: connection.brokerId,
        expiresAt: connection.expiresAt,
      });
    } else {
      // E*TRADE, Alpaca, IBKR: auto-refresh
      try {
        await oauthFlowManager.refreshConnection(connection.id);
      } catch (error) {
        logger.error('Token refresh failed', { connectionId: connection.id, error });
      }
    }
  }
}
```

### 6.2 Portfolio Sync Scheduler

```typescript
// Run every 5 minutes during market hours
async function syncPortfolios() {
  const activeConnections = await connectionRepo.findActive();

  const results = await Promise.allSettled(
    activeConnections.map(conn => syncConnectionPortfolio(conn))
  );

  // Log failures, update stale connections
  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      await connectionRepo.markSyncFailed(activeConnections[index].id);
    }
  }
}

async function syncConnectionPortfolio(connection: BrokerageConnection) {
  const adapter = getAdapter(connection.brokerId);
  const tokens = await secretsManager.getTokens(connection.tokenSecretId);

  const accounts = await adapter.getAccounts(tokens);
  for (const account of accounts) {
    const positions = await adapter.getPositions(account.accountId, tokens);
    const balance = await adapter.getAccountBalance(account.accountId, tokens);

    await positionCacheRepo.syncPositions(account.id, positions);
    await accountRepo.updateCachedBalance(account.id, balance);
  }

  await connectionRepo.updateLastSync(connection.id);
}
```

---

## 7. Error Handling

### 7.1 Broker-Specific Error Mapping

```typescript
// Map broker-specific errors to unified error types
enum UnifiedErrorCode {
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_REVOKED = 'AUTH_REVOKED',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ORDER = 'INVALID_ORDER',
  MARKET_CLOSED = 'MARKET_CLOSED',
  SYMBOL_NOT_FOUND = 'SYMBOL_NOT_FOUND',
  ACCOUNT_RESTRICTED = 'ACCOUNT_RESTRICTED',
  BROKER_UNAVAILABLE = 'BROKER_UNAVAILABLE',
}

// Each adapter implements error translation
class ETradeAdapter implements IBrokerageAdapter {
  private translateError(etradeError: ETradeApiError): UnifiedError {
    switch (etradeError.code) {
      case 'oauth_problem=token_expired':
        return new UnifiedError(UnifiedErrorCode.AUTH_EXPIRED, 'E*TRADE session expired');
      case '1001':
        return new UnifiedError(UnifiedErrorCode.INSUFFICIENT_FUNDS, etradeError.message);
      // ... more mappings
    }
  }
}
```

### 7.2 Graceful Degradation

When one broker fails, other brokers should continue working:

```typescript
async function getUnifiedPortfolio(userId: string): Promise<UnifiedPortfolio> {
  const connections = await connectionRepo.getActiveConnections(userId);

  const results = await Promise.allSettled(
    connections.map(conn => getPortfolioForConnection(conn))
  );

  const successfulPortfolios = [];
  const failedBrokers = [];

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      successfulPortfolios.push(result.value);
    } else {
      failedBrokers.push({
        brokerId: connections[index].brokerId,
        error: result.reason,
      });
    }
  }

  return {
    ...aggregatePortfolios(successfulPortfolios),
    failedBrokers,  // UI shows warning for failed brokers
  };
}
```

---

## 8. Security Considerations

### 8.1 Token Storage

- **NEVER** store tokens in database directly
- Use HashiCorp Vault or AWS Secrets Manager
- Store only reference ID in `brokerage_connections.token_secret_id`
- Encrypt tokens at rest with AES-256-GCM
- Rotate encryption keys annually

### 8.2 API Key Management

- Each broker requires different credentials (consumer key, client ID, etc.)
- Store in environment variables or secrets manager
- Never commit to source control
- Use different credentials for dev/staging/production

### 8.3 Audit Logging

Log all brokerage operations for compliance:
- Connection established/revoked
- Token refreshed
- Orders placed/modified/cancelled
- Account data accessed

---

## 9. Implementation Roadmap

### Phase 1: Core Abstraction (Week 1-2)
- [ ] Define unified interfaces
- [ ] Implement base adapter class
- [ ] Create E*TRADE adapter (port existing code)
- [ ] Database schema migration
- [ ] Basic token management

### Phase 2: Alpaca Integration (Week 3-4)
- [ ] Implement Alpaca adapter
- [ ] Paper trading support
- [ ] OAuth 2.0 flow
- [ ] Integration tests with sandbox

### Phase 3: Multi-Broker UX (Week 5-6)
- [ ] Connection management UI
- [ ] Unified portfolio view
- [ ] Broker selector for trades
- [ ] Notifications for expiring tokens

### Phase 4: Schwab Integration (Week 7-8)
- [ ] Implement Schwab adapter
- [ ] Handle 7-day reauth requirement
- [ ] User notification flow for reauth
- [ ] Migration guide for TD Ameritrade users

### Phase 5: IBKR Integration (Week 9-10)
- [ ] Implement IBKR adapter
- [ ] Client Portal Web API integration
- [ ] Advanced order types
- [ ] Global market support

---

## 10. API Reference Links

| Broker | Developer Portal | Documentation |
|--------|-----------------|---------------|
| E*TRADE | [developer.etrade.com](https://developer.etrade.com) | [API Docs](https://apisb.etrade.com/docs/api/account/api-account-v1.html) |
| Alpaca | [alpaca.markets](https://alpaca.markets) | [docs.alpaca.markets](https://docs.alpaca.markets) |
| Schwab | [developer.schwab.com](https://developer.schwab.com) | [Trader API](https://developer.schwab.com/products/trader-api--individual) |
| IBKR | [interactivebrokers.com/api](https://www.interactivebrokers.com/en/trading/ib-api.php) | [Client Portal API](https://interactivebrokers.github.io/cpwebapi/) |
