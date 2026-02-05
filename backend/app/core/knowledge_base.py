"""Knowledge base content for AI context injection.

This module provides condensed strategy knowledge that gets injected into
AI system prompts to make responses strategy-aware without exceeding token limits.
"""

# Strategy summaries - condensed from G2E-knowledge.md
STRATEGY_SUMMARIES = {
    "value_investing": """## Value Investing Protocol
**Goal:** Buy undervalued companies with margin of safety.
**Key Metrics:** P/E < industry avg, PEG < 1.0, Debt/Equity < 0.5, ROE > 15%
**Decision Logic:**
1. Screen: P/E < 20, D/E < 1.0, P/B < 2.0, Market Cap > $1B
2. Quality Check: ROE > 15% (economic moat), Altman Z-Score > 1.8
3. Catalyst: Identify reason for revaluation (new CEO, buyback, spin-off)
4. Entry: Price < (Intrinsic Value × 0.70) AND catalyst exists
**Valuation:** DCF analysis with WACC discount rate. Require 25-30% margin of safety.""",

    "growth_investing": """## Growth Investing Protocol (GARP)
**Goal:** Capital appreciation through high-growth companies at reasonable prices.
**Key Metrics:** EPS growth > 15-20%, PEG < 1.0, Gross Margin > 40%, Forward P/E < Trailing P/E
**Decision Logic:**
1. Look for accelerating EPS growth (Q1: 10%, Q2: 15%, Q3: 20%)
2. Verify margin expansion (operational efficiency at scale)
3. Check Relative Strength vs S&P 500 (should outperform)
4. DuPont Analysis: Ensure ROE driven by margins, not leverage
**Warning:** Multiple compression risk if growth slows.""",

    "momentum_trading": """## Momentum Trading Protocol
**Goal:** Ride trends - buy rising assets, sell before peak.
**Key Indicators:** RSI > 50 (trend), MACD > Signal, ADX > 25 (trend exists), Price > 50 SMA > 200 SMA
**Decision Logic:**
1. Trend Filter: Price > 200 SMA (abort if not)
2. Sector Check: Stock's sector outperforming S&P 500
3. Setup: Consolidation near highs (flags, pennants)
4. Trigger: Breakout on volume > 150% of 20-day average
5. Confirm: MACD histogram expanding, RSI > 60 but < 80
**Cross-Sectional:** Rank by 12-month returns, select top decile in positive trends.""",

    "swing_trading": """## Swing Trading Protocol
**Goal:** Capture single price swings over days to weeks.
**Patterns:** Cup and Handle (continuation), Head & Shoulders (reversal), Double Bottom/Top
**Checklist:**
1. Trend Alignment: Trade in direction of weekly trend
2. Structure: Entry near key support (buy) or resistance (sell)
3. Risk/Reward: Minimum 2:1 R/R ratio required
4. Volume: Spike on reversal candle or breakout
**Entry:** Pattern completion + volume confirmation.""",

    "day_trading": """## Day Trading Protocol
**Goal:** Intraday profits, all positions closed by market close.
**PDT Rule:** 4+ day trades in 5 days = $25K minimum equity required.
**Key Strategies:**
- VWAP: Price > VWAP = long bias, < VWAP = short bias
- Opening Range Breakout (ORB): Trade 15-min OR breakout with volume
- MA Scalping: 5/8/13 SMA - buy pullbacks to 8 SMA in uptrend
**Time Windows:** Best: 10:00-11:30 AM, 2:00-3:30 PM ET. Avoid: 11:30 AM-2:00 PM
**Risk:** Max 0.5% account per trade, 2% daily loss limit stops trading.""",

    "drip_to_fire": """## DRIP to FIRE Protocol
**Goal:** Build dividend income to replace employment income.
**Allocation:** 40% Anchor (DRIP enabled, growth), 60% High-Yield (cash for bills)
**Phases:**
- Phase 1 ($0-$2K): Regular deposits, no margin
- Phase 2 (~$2K+): Float one bill with margin, reinvest freed capital
- Phase 3 (~$20K+): Float core bills, compound aggressively
**Safety Rules:**
- Margin utilization NEVER > 49%
- Dividend income must exceed margin interest by 1.5x
- Monthly put options for crash protection
**Target Yield:** 30-35% blended portfolio yield.""",

    "options_straddle": """## Volatility Straddle Protocol
**Goal:** Profit from volatility magnitude, not direction.
**Long Straddle:** Buy ATM call + put. Profit if stock moves > total premium paid.
- Entry: Low IV (IV Rank < 30%), volatility squeeze, 2-3 weeks before catalyst
- Exit: 10+ days before expiration (theta decay)
**Short Straddle:** Sell ATM call + put. Profit if stock stays near strike.
- Entry: High IV (IV Rank > 70%), expect IV crush
- Risk: Unlimited. Stop at 200% of credit received.
**Greeks:** Delta starts ~0, Theta enemy of longs, Vega is key driver.""",

    "covered_calls_wheel": """## Covered Calls & Wheel Protocol
**Goal:** Generate income from owned shares via option premiums.
**Covered Call:**
- Sell 0.30 Delta call (70% OTM probability) for balanced income/retention
- Avoid if RSI > 70 (momentum may continue)
- Never write calls expiring AFTER earnings
**The Wheel (Income Loop):**
1. Sell cash-secured put on stock you want to own
2. If assigned: Sell covered calls on shares
3. If called away: Return to selling puts
**Rolling:** Roll up and out for credit only. If net debit required, accept assignment.""",

    "legislative_alpha": """## Legislative Alpha Protocol
**Goal:** Mirror high-conviction congressional trades.
**Data Source:** STOCK Act disclosures (45-day reporting lag)
**Filters:**
- Transaction > $50K (preferably $100K+)
- Self or Spouse ownership (not dependent/blind trust)
- Committee relevance (Armed Services + defense stock = high signal)
- Disclosure < 7 days old, stock moved < 5% since transaction
**Integration:** Use as confirmation, not standalone signal. Combine with technicals.""",

    "pairs_trading": """## Statistical Arbitrage (Pairs Trading) Protocol
**Goal:** Market-neutral profits from cointegrated asset convergence.
**Setup:** Long Stock A + Short Stock B (equal dollar amounts)
**Key Concept:** Cointegration (ADF test p-value < 0.05), not just correlation
**Signals:**
- Z-Score > +2.0: Short A / Long B (spread too wide)
- Z-Score < -2.0: Long A / Short B (spread too narrow)
- Z-Score = 0: Close (mean reversion complete)
- Z-Score > ±4.0: Stop loss (structural break)
**Risk:** "Widowmaker" if spread never reverts (fraud, M&A, regulation change).""",

    "mean_reversion": """## Mean Reversion Protocol
**Goal:** Profit from price snap-backs after emotional overreaction.
**Indicators:**
- Bollinger Bands: Touch + RSI extreme + reversal candle
- IBS (Internal Bar Strength): < 0.2 buy, > 0.8 sell (ETFs)
**Critical Filter - ADX:**
- ADX < 20: ENABLED (ranging market)
- ADX > 25: DISABLED (trending market - don't fight trend)
**Scale-In:** 33% at signal, +33% if drops 5%, +34% if drops another 5%
**Stop:** 15% below average entry or 3 ATR.""",

    "market_making": """## Market Making Protocol (Avellaneda-Stoikov)
**Goal:** Profit from bid-ask spread by providing liquidity.
**Requirements:** < 10ms latency, Level 2 data, DMA access (not retail-suitable)
**Reservation Price:** r = mid_price - inventory × risk_aversion × volatility² × time
**Inventory Management:**
- Long inventory: Widen ask, tighten bid (encourage sells)
- Short inventory: Widen bid, tighten ask (encourage buys)
- End of day: Flatten all positions
**Risk:** Adverse selection from informed traders hitting stale quotes.""",

    "sentiment_trading": """## Sentiment Trading Protocol (NLP/FinBERT)
**Goal:** Extract signals from news, social media, earnings transcripts.
**FinBERT Thresholds:**
- Confidence > 0.80: Actionable signal
- Confidence 0.60-0.80: Weak, require confirmation
**Volume Confirmation Required:**
- Positive sentiment + High volume = Strong BUY
- Sentiment alone = Weak signal
**Integration:** Sentiment = "why" (catalyst), Technicals = "when" (timing)
**Contrarian:** Extreme retail sentiment (>90% bullish/bearish) = potential reversal.""",
}

# Risk management framework
RISK_MANAGEMENT = """## Risk Management Framework

### Position Sizing Methods
1. **Fixed Fractional:** Risk 1-2% of equity per trade
   Position Size = (Account × Risk%) / (Entry - Stop)

2. **Volatility-Adjusted (ATR):** Normalize risk across volatility profiles
   Dollar Risk = Account × Risk%
   Position Size = Dollar Risk / (ATR × Multiplier)

3. **Kelly Criterion:** f* = (bp - q) / b (use Half/Quarter Kelly for safety)

### Portfolio Correlation
- Correlation > 0.7: Treat as same trade, limit combined size
- Correlation < 0: Hedge effect, reduces volatility
- Reject trades with > 0.8 correlation to existing positions

### Drawdown Controls
- Daily Loss > 3%: Liquidate leveraged positions, disable buying 24h
- Drawdown > 10% from peak: Halve all position sizes

### Value-at-Risk (VaR)
Calculate daily. If VaR > 2% of equity, trim positions starting with most volatile."""

# Market regime analysis
MARKET_REGIME = """## Market Regime Analysis (Top-Down)

### Step 1: Macro Regime (The "Tide")
| Condition | Regime | Strategy Adjustment |
|-----------|--------|---------------------|
| SPY > 200 SMA, VIX < 20 | Bull | Long strategies, leverage OK |
| SPY < 200 SMA, VIX > 25 | Bear | Disable long growth, enable shorts/defensive |

### Step 2: Sector Rotation (The "Wave")
Identify top 3 performing sectors. Restrict buys to these sectors.
"A rising tide lifts all boats, but a falling tide sinks them."

### Step 3: Event Risk Check
Earnings/Fed in < 3 days? SKIP or reduce size 50%

### ADX Regime Filter
- ADX < 20: Range-bound (mean reversion works)
- ADX 20-25: Transitional (reduce size)
- ADX > 25: Trending (momentum works, mean reversion fails)"""

# AI context hierarchy
CONTEXT_HIERARCHY = """## AI Context Hierarchy

Priority order for all interactions:
1. **ACTIVE PLAN** (Highest): Time-bound objectives (e.g., "Grow to $50K by Q2")
2. **TRADING STRATEGY**: Long-term philosophy and rules
3. **USER PROFILE**: Communication preferences, risk tolerance, experience
4. **CONVERSATION**: Current chat context

If Plan and Strategy conflict, FLAG and ask for clarification.
Plans have: term_type, objectives, constraints, success_metrics
Only ONE plan can be active at a time."""

# Required disclosures
DISCLOSURES = """## Required Disclosures
All AI responses involving recommendations must include:
1. "AI-generated analysis for informational purposes only"
2. "This is not personalized investment advice"
3. "Past performance does not guarantee future results"
4. "Consult a financial advisor for personalized guidance"
5. Data timestamp when relevant"""


def get_strategy_knowledge(strategy_name: str | None = None) -> str:
    """Get knowledge base content for a specific strategy or all strategies.

    Args:
        strategy_name: Optional strategy name. If None, returns condensed overview.

    Returns:
        Strategy knowledge content for AI context injection.
    """
    if strategy_name and strategy_name.lower().replace(" ", "_") in STRATEGY_SUMMARIES:
        key = strategy_name.lower().replace(" ", "_")
        return STRATEGY_SUMMARIES[key]

    # Return condensed overview for general queries
    return """## Available Trading Strategies
- Value Investing: Buy undervalued companies with margin of safety
- Growth Investing (GARP): High-growth companies at reasonable prices
- Momentum Trading: Ride trends, buy rising assets
- Swing Trading: Capture price swings over days to weeks
- Day Trading: Intraday profits with strict risk management
- DRIP to FIRE: Build dividend income to replace employment
- Options Straddles: Profit from volatility magnitude
- Covered Calls/Wheel: Generate income from owned shares
- Legislative Alpha: Mirror congressional trades
- Pairs Trading: Market-neutral statistical arbitrage
- Mean Reversion: Profit from price snap-backs
- Sentiment Trading: NLP-based news and social analysis

For detailed protocols, specify a strategy name."""


def get_full_trading_context(
    strategy_name: str | None = None,
    include_risk_management: bool = True,
    include_regime_analysis: bool = True,
) -> str:
    """Build comprehensive trading context for AI injection.

    Args:
        strategy_name: User's active trading strategy
        include_risk_management: Include risk framework
        include_regime_analysis: Include market regime logic

    Returns:
        Full context string for AI system prompt
    """
    sections = []

    # Strategy knowledge
    if strategy_name:
        strategy_content = get_strategy_knowledge(strategy_name)
        if strategy_content:
            sections.append(strategy_content)

    # Risk management
    if include_risk_management:
        sections.append(RISK_MANAGEMENT)

    # Market regime
    if include_regime_analysis:
        sections.append(MARKET_REGIME)

    # Context hierarchy
    sections.append(CONTEXT_HIERARCHY)

    # Disclosures
    sections.append(DISCLOSURES)

    return "\n\n".join(sections)


# Map common strategy name variations to canonical names
STRATEGY_ALIASES = {
    "value": "value_investing",
    "value investing": "value_investing",
    "growth": "growth_investing",
    "growth investing": "growth_investing",
    "garp": "growth_investing",
    "momentum": "momentum_trading",
    "swing": "swing_trading",
    "swing trading": "swing_trading",
    "day": "day_trading",
    "day trading": "day_trading",
    "daytrading": "day_trading",
    "drip": "drip_to_fire",
    "drip to fire": "drip_to_fire",
    "fire": "drip_to_fire",
    "dividend": "drip_to_fire",
    "straddle": "options_straddle",
    "straddles": "options_straddle",
    "volatility": "options_straddle",
    "covered call": "covered_calls_wheel",
    "covered calls": "covered_calls_wheel",
    "wheel": "covered_calls_wheel",
    "the wheel": "covered_calls_wheel",
    "csp": "covered_calls_wheel",
    "legislative": "legislative_alpha",
    "congress": "legislative_alpha",
    "pelosi": "legislative_alpha",
    "pairs": "pairs_trading",
    "pairs trading": "pairs_trading",
    "stat arb": "pairs_trading",
    "mean reversion": "mean_reversion",
    "reversion": "mean_reversion",
    "market making": "market_making",
    "mm": "market_making",
    "sentiment": "sentiment_trading",
    "nlp": "sentiment_trading",
    "news": "sentiment_trading",
}


def normalize_strategy_name(name: str | None) -> str | None:
    """Normalize strategy name to canonical form.

    Args:
        name: User-provided strategy name

    Returns:
        Canonical strategy name or None if not found
    """
    if not name:
        return None

    normalized = name.lower().strip()

    # Check aliases first
    if normalized in STRATEGY_ALIASES:
        return STRATEGY_ALIASES[normalized]

    # Check direct match
    if normalized.replace(" ", "_") in STRATEGY_SUMMARIES:
        return normalized.replace(" ", "_")

    return None
