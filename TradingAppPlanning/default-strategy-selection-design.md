# Default Trading Strategy Selection - Design Document

**Date:** 2026-01-24
**Status:** Draft

---

## Overview

Users setting up their trading strategy can select from predefined "default" trading strategies that align with the AI's fine-tuning. When selected, a detailed template populates a text box that users can customize. The system stores both the selected default (for AI context) and the customized text.

---

## Design Decisions

### 1. Default Strategy Options (13 Total)

**Traditional/Fundamental Strategies:**
| # | Strategy | Description |
|---|----------|-------------|
| 1 | Quantitative Value Investing | DCF/relative valuation, P/E < 20, margin of safety |
| 2 | Growth Investing (GARP) | EPS growth > 15-20%, PEG ratio focus |
| 3 | Momentum Trading | Technical indicators, trend following, breakouts |
| 4 | Swing Trading | Pattern recognition, multi-day holds, 2:1+ risk/reward |

**Algorithmic/Quantitative Strategies:**
| # | Strategy | Description |
|---|----------|-------------|
| 5 | Algorithmic Day Trading | Intraday momentum, gap analysis, microstructure scalping |
| 6 | DRIP for FIRE | Dividend reinvestment, Aristocrats/Kings focus, compound growth |
| 7 | Volatility Straddles | Long/short straddles, IV arbitrage, earnings plays |
| 8 | Covered Calls / The Wheel | Income generation, buy-write, rolling logic |
| 9 | Legislative Alpha | Congressional trading tracking, STOCK Act disclosures |
| 10 | Statistical Arbitrage (Pairs Trading) | Cointegration, Z-score signals, market neutral |
| 11 | Mean Reversion | Bollinger Bands, RSI extremes, regime filtering |
| 12 | Market Making | Avellaneda-Stoikov model, bid-ask spread capture |
| 13 | Sentiment-Driven Trading | FinBERT NLP, news/social media analysis |

### 2. Template Detail Level

**Decision:** Detailed templates with specific parameters

Each default strategy populates a comprehensive text block including:
- Investment philosophy
- Risk tolerance guidelines
- Time horizon
- Position sizing rules
- Entry criteria (specific indicators/thresholds)
- Exit criteria (profit targets, stop losses)
- Sector preferences
- Special considerations

**Example (Momentum Trading):**
```
I follow a Momentum Trading strategy that captures sustained price trends
using technical confirmation.

INVESTMENT PHILOSOPHY:
Trend following - "the trend is your friend." I buy stocks showing strong
upward momentum with technical confirmation, riding trends until they break.

RISK TOLERANCE:
Moderate-aggressive. Accept higher volatility in exchange for larger gains.
Max portfolio drawdown: 20%. Individual position stop-loss: 8-10%.

TIME HORIZON:
Short to medium-term holds (days to weeks). Exit when momentum fades.

POSITION SIZING:
- Max 5% portfolio per position
- Scale in with 2-3 entries as trend confirms
- Reduce size in high-volatility conditions

ENTRY CRITERIA:
- Price above 50-day AND 200-day moving averages
- RSI(14) between 50-70 (strong but not overbought)
- MACD histogram expanding (accelerating momentum)
- Volume > 150% of 20-day average on breakout
- ADX > 25 confirming trend strength

EXIT CRITERIA:
- Trailing stop: 8% from recent high
- RSI drops below 40
- MACD bearish crossover
- Price closes below 50-day MA
- Profit target: 20-30% or when momentum indicators diverge

SECTOR PREFERENCES:
Focus on high-beta sectors: Technology, Consumer Discretionary,
Communication Services. Avoid defensive sectors during momentum plays.
```

### 3. AI Context Architecture

**Decision:** Layered context - AI receives both default ID and custom text

```
┌─────────────────────────────────────────────────────┐
│ AI CONTEXT FOR STRATEGY                              │
├─────────────────────────────────────────────────────┤
│ 1. default_strategy_id: "momentum_trading"          │
│    → Maps to fine-tuned knowledge for deep          │
│      understanding of strategy mechanics            │
│                                                     │
│ 2. custom_strategy_text: "[User's edited version]"  │
│    → User-specific parameters and overrides         │
│                                                     │
│ AI uses fine-tuning for strategy mechanics +        │
│ custom text for user-specific preferences           │
└─────────────────────────────────────────────────────┘
```

**Context Injection:**
```python
system_prompt = f"""
## TRADING STRATEGY CONTEXT

Base Strategy: {user.default_strategy_id or "Custom"}
{f"(Fine-tuned knowledge available for {DEFAULT_STRATEGIES[user.default_strategy_id]['name']})" if user.default_strategy_id else ""}

User's Strategy Description:
{user.custom_strategy_text}

Apply fine-tuned strategy knowledge when applicable, but always respect
the user's custom parameters and overrides stated above.
"""
```

### 4. Strategy Setup Flow

**Decision:** Three equal paths on setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGY SETUP                                │
│                                                                  │
│   How would you like to set up your trading strategy?           │
│                                                                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│   │  📋 SELECT A    │  │  🔍 DISCOVER    │  │  ✏️ WRITE MY   │ │
│   │    DEFAULT      │  │    FROM MY      │  │     OWN         │ │
│   │                 │  │    HISTORY      │  │                 │ │
│   │ Choose from 13  │  │ AI analyzes     │  │ Start with a    │ │
│   │ proven strategy │  │ your E*TRADE    │  │ blank slate     │ │
│   │ templates and   │  │ trading history │  │ and describe    │ │
│   │ customize       │  │ to suggest a    │  │ your strategy   │ │
│   │                 │  │ strategy        │  │ in your words   │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Path 1: Select a Default**
1. User sees list of 13 strategies with brief descriptions
2. User selects one
3. Detailed template populates text box
4. User customizes as needed
5. Both `default_strategy_id` and `custom_strategy_text` saved

**Path 2: Discover from History** (Existing feature)
1. AI analyzes 3 months of E*TRADE transactions
2. Patterns detected, multiple interpretations offered
3. User selects/refines
4. `default_strategy_id` = null, `custom_strategy_text` = generated text

**Path 3: Write My Own**
1. Blank text box with optional field hints
2. User writes freely
3. `default_strategy_id` = null, `custom_strategy_text` = user's text

### 5. UI Component Design

**Decision:** Single combined text block (not separate fields)

```
┌─────────────────────────────────────────────────────────────────┐
│ Your Trading Strategy                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Default Strategy: [Dropdown: None / 13 options      ▼]         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ I follow a Momentum Trading strategy that captures        │  │
│  │ sustained price trends using technical confirmation.      │  │
│  │                                                           │  │
│  │ INVESTMENT PHILOSOPHY:                                    │  │
│  │ Trend following - "the trend is your friend." I buy      │  │
│  │ stocks showing strong upward momentum...                  │  │
│  │                                                           │  │
│  │ [User can edit freely here]                              │  │
│  │                                                           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  💡 Tip: Edit any part of this text to customize your strategy  │
│                                                                  │
│                              [Save Strategy]                     │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Selecting a default from dropdown populates text box (with confirmation if text exists)
- Text box is always editable
- Changing dropdown after editing prompts: "Replace current text?"
- "None" in dropdown clears `default_strategy_id` but keeps text

---

## Database Schema Changes

```sql
-- Modify existing user_strategies table
ALTER TABLE user_strategies
ADD COLUMN default_strategy_id VARCHAR(50),
ADD COLUMN custom_strategy_text TEXT;

-- Add default strategies reference table
CREATE TABLE default_strategies (
    id VARCHAR(50) PRIMARY KEY,  -- e.g., 'momentum_trading'
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,  -- 'traditional', 'algorithmic'
    brief_description TEXT NOT NULL,
    full_template TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed the 13 default strategies
INSERT INTO default_strategies (id, name, category, brief_description, display_order) VALUES
('quantitative_value', 'Quantitative Value Investing', 'traditional', 'DCF/relative valuation, margin of safety focus', 1),
('growth_garp', 'Growth Investing (GARP)', 'traditional', 'Growth at reasonable price, PEG ratio focus', 2),
('momentum_trading', 'Momentum Trading', 'traditional', 'Technical trend following with indicator confirmation', 3),
('swing_trading', 'Swing Trading', 'traditional', 'Multi-day pattern trades with defined risk/reward', 4),
('day_trading', 'Algorithmic Day Trading', 'algorithmic', 'Intraday momentum, gaps, microstructure', 5),
('drip_fire', 'DRIP for FIRE', 'algorithmic', 'Dividend reinvestment for financial independence', 6),
('volatility_straddles', 'Volatility Straddles', 'algorithmic', 'Options straddles for volatility arbitrage', 7),
('covered_calls', 'Covered Calls / The Wheel', 'algorithmic', 'Income generation through covered options', 8),
('legislative_alpha', 'Legislative Alpha', 'algorithmic', 'Congressional trading signal tracking', 9),
('pairs_trading', 'Statistical Arbitrage (Pairs)', 'algorithmic', 'Cointegration-based market neutral trades', 10),
('mean_reversion', 'Mean Reversion', 'algorithmic', 'Oversold/overbought counter-trend trading', 11),
('market_making', 'Market Making', 'algorithmic', 'Bid-ask spread capture with inventory management', 12),
('sentiment_trading', 'Sentiment-Driven Trading', 'algorithmic', 'NLP-based news and social sentiment signals', 13);
```

---

## API Endpoints

```
GET  /api/strategies/defaults           - List all 13 default strategies
GET  /api/strategies/defaults/:id       - Get full template for a strategy
GET  /api/strategies/user               - Get user's current strategy
PUT  /api/strategies/user               - Update user's strategy
POST /api/strategies/user/from-default  - Create from default template
```

---

## Integration with AI Context Hierarchy

The default strategy selection integrates with the existing hierarchy:

```
1. ACTIVE PLAN (Highest Priority)
   └─ Term-based objectives

2. TRADING STRATEGY ← Default Strategy Selection fits here
   ├─ default_strategy_id → Fine-tuned knowledge
   └─ custom_strategy_text → User preferences

3. USER PROFILE CONTEXT
   └─ Communication preferences

4. CONVERSATION CONTEXT
   └─ Current chat thread
```

---

## Fine-Tuning Alignment

The 13 default strategies must be thoroughly covered in:
- `G2E-knowledge.md` - Detailed strategy mechanics
- `G2E-training-data.jsonl` - Example conversations for each strategy

When a user selects a default strategy, the AI can leverage its fine-tuned knowledge of that strategy's mechanics while respecting the user's customizations.

---

## Next Steps

1. Create detailed templates for all 13 strategies
2. Update fine-tuning files with strategy content
3. Implement database schema changes
4. Build React components for strategy setup wizard
5. Integrate with existing Strategy Discovery flow
