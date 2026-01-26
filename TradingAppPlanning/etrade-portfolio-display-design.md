# E*TRADE Portfolio Display - Design Document

**Date:** 2026-01-24
**Status:** Draft

---

## Overview

Display portfolio information from E*TRADE within our app so users can review their trading account without switching to E*TRADE. This document catalogs all available data points from E*TRADE APIs.

---

## E*TRADE API Endpoints

| Endpoint | Method | Path | Purpose |
|----------|--------|------|---------|
| List Accounts | GET | `/v1/accounts/list` | Get all user accounts |
| Account Balance | GET | `/v1/accounts/{accountIdKey}/balance` | Cash, margin, buying power |
| Portfolio | GET | `/v1/accounts/{accountIdKey}/portfolio` | Positions and holdings |
| Transactions | GET | `/v1/accounts/{accountIdKey}/transactions` | Trade history |
| Market Quotes | GET | `/v1/market/quote/{symbols}` | Real-time/delayed quotes |

---

## 1. Account Information

### Account Fields
| Field | Type | Description |
|-------|------|-------------|
| accountId | string | Numeric account ID |
| accountIdKey | string | Unique account key (use for API calls) |
| accountName | string | User's nickname for account |
| accountDesc | string | Account description |
| accountType | string | INDIVIDUAL, JOINT, TRUST, IRA, ROTH_IRA, etc. |
| accountMode | string | CASH, MARGIN |
| accountStatus | string | ACTIVE, CLOSED |
| institutionType | string | BROKERAGE |
| optionLevel | string | NO_OPTIONS, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4 |
| dayTraderStatus | string | Pattern day trader classification |

### Account Types Supported
- INDIVIDUAL, JOINT, TRUST, CLUB
- TRADITIONAL_IRA, ROTH_IRA, ROLLOVER_IRA, SEP_IRA, SIMPLE_IRA
- 401K, KEOGH, PROFIT_SHARING
- CUSTODIAL, ESTATE, CORPORATE
- And many more...

---

## 2. Account Balances

### Cash & Investment Balances
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| cashBalance | number | Current cash balance | HIGH |
| cashAvailableForInvestment | number | Cash available to invest | HIGH |
| cashAvailableForWithdrawal | number | Cash available to withdraw | MEDIUM |
| settledCashForInvestment | number | Cleared funds available | MEDIUM |
| unSettledCashForInvestment | number | Pending settlement funds | MEDIUM |
| moneyMktBalance | number | Money market sweep balance | LOW |

### Buying Power
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| cashBuyingPower | number | Buying power (cash account) | HIGH |
| marginBuyingPower | number | Buying power (margin account) | HIGH |
| dtCashBuyingPower | number | Day trade buying power (cash) | HIGH (if PDT) |
| dtMarginBuyingPower | number | Day trade buying power (margin) | HIGH (if PDT) |

### Margin Information
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| marginBalance | number | Current margin balance | HIGH (margin accts) |
| regtEquity | number | Regulation T equity | MEDIUM |
| regtEquityPercent | number | Reg T equity percentage | MEDIUM |
| shortAdjustBalance | number | Short position adjustment | LOW |

### Margin Calls (Important Alerts)
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| minEquityCall | number | Minimum equity call | ALERT |
| fedCall | number | Federal margin call | ALERT |
| cashCall | number | Cash call amount | ALERT |
| houseCall | number | House call amount | ALERT |

### Real-Time Portfolio Values
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| totalAccountValue | number | Total portfolio value | HIGH |
| netMv | number | Net market value | HIGH |
| netMvLong | number | Long positions value | MEDIUM |
| netMvShort | number | Short positions value | MEDIUM |
| totalLongValue | number | Total long holdings | MEDIUM |

### Portfolio Margin (Advanced)
| Field | Type | Description |
|-------|------|-------------|
| liquidatingEquity | number | Liquidation value |
| houseExcessEquity | number | Excess over requirements |
| totalHouseRequirement | number | Total margin requirement |
| totalMarginRqmts | number | Aggregate margin demands |
| availExcessEquity | number | Available excess equity |

---

## 3. Portfolio Positions

### Position Core Fields
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| symbol | string | Ticker symbol | HIGH |
| symbolDescription | string | Company/security name | HIGH |
| quantity | number | Shares/contracts held | HIGH |
| positionType | string | LONG or SHORT | HIGH |
| marketValue | number | Current market value | HIGH |
| price | number | Current market price | HIGH |
| change | number | $ change today | HIGH |
| changePct | number | % change today | HIGH |

### Cost Basis & Gains
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| totalCost | number | Total cost basis | HIGH |
| costPerShare | number | Average cost per share | HIGH |
| pricePaid | number | Original price paid | MEDIUM |
| totalGain | number | Total $ gain/loss | HIGH |
| totalGainPct | number | Total % gain/loss | HIGH |
| daysGain | number | Today's $ gain/loss | HIGH |
| daysGainPct | number | Today's % gain/loss | HIGH |

### Position Metadata
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| pctOfPortfolio | number | % of total portfolio | MEDIUM |
| dateAcquired | int64 | Purchase date | MEDIUM |
| positionIndicator | string | Position type indicator | LOW |
| commissions | number | Total commissions paid | LOW |
| otherFees | number | Other fees paid | LOW |

### Security Type Information
| Field | Type | Description |
|-------|------|-------------|
| securityType | string | EQ, OPTN, MF, BOND, INDX, MMF |
| securitySubType | string | Security subtype |
| callPut | string | CALL or PUT (options) |
| strikePrice | number | Option strike price |
| expiryYear/Month/Day | int | Option expiration date |

---

## 4. Portfolio Views (E*TRADE API Views)

### QUICK View (Default)
| Field | Description |
|-------|-------------|
| lastTrade | Most recent trade price |
| lastTradeTime | Time of last trade |
| change | Price change |
| changePct | Percentage change |
| volume | Trading volume |
| quoteStatus | REALTIME, DELAYED, CLOSING |

### PERFORMANCE View
| Field | Description |
|-------|-------------|
| change | Price change |
| changePct | Percentage change |
| lastTrade | Most recent price |
| daysGain | Today's gain |
| totalGain | Total gain |
| totalGainPct | Total gain percentage |
| marketValue | Current market value |

### FUNDAMENTAL View
| Field | Description |
|-------|-------------|
| lastTrade | Current price |
| peRatio | Price-to-earnings ratio |
| eps | Earnings per share |
| dividend | Dividend amount |
| divYield | Dividend yield |
| marketCap | Market capitalization |
| week52Range | 52-week price range |

### COMPLETE View (All Data)
Includes everything above plus:
| Field | Description |
|-------|-------------|
| perform1Month/3Month/6Month/12Month | Performance periods |
| beta | Stock beta |
| sv10DaysAvg through sv6MonAvg | Stochastic volatility averages |
| week52High, week52Low | 52-week high/low |
| daysRange | Today's trading range |
| marginable | Can be bought on margin |
| bid, ask, bidAskSpread | Bid/ask data |
| bidSize, askSize | Market depth |
| open | Opening price |

### OPTIONS View (for options positions)
| Field | Description |
|-------|-------------|
| delta, gamma, vega, rho, theta | Option Greeks |
| ivPct | Implied volatility |
| premium | Option premium |
| daysToExpiration | Days until expiry |
| intrinsicValue | Intrinsic value |
| openInterest | Open interest |

---

## 5. Position Lots (Tax Lots)

| Field | Type | Description |
|-------|------|-------------|
| positionLotId | int64 | Lot identifier |
| acquiredDate | int64 | Date lot was acquired |
| originalQty | number | Original quantity |
| remainingQty | number | Remaining quantity |
| availableQty | number | Available to sell |
| price | double | Purchase price |
| totalCost | double | Total cost of lot |
| marketValue | double | Current market value |
| totalGain | double | Gain/loss on lot |
| daysGain | double | Today's gain on lot |
| termCode | int32 | Short-term/long-term |

---

## 6. Transaction History

### Transaction Fields
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| transactionId | int64 | Transaction ID | LOW |
| transactionDate | int64 | Date of transaction | HIGH |
| postDate | int64 | Settlement date | MEDIUM |
| description | string | Transaction description | HIGH |
| amount | number | Total transaction amount | HIGH |
| transactionType | string | Transaction type (see below) | HIGH |
| symbol | string | Security symbol | HIGH |
| quantity | double | Shares/contracts | HIGH |
| price | double | Price per share | HIGH |
| fee | double | Transaction fee | MEDIUM |

### Transaction Types
- **Trades:** BOUGHT, SOLD, BOUGHT_TO_OPEN, SOLD_TO_CLOSE, BOUGHT_TO_CLOSE, SOLD_TO_OPEN
- **Income:** DIVIDEND, INTEREST, CAPITAL_GAIN
- **Transfers:** TRANSFER_IN, TRANSFER_OUT, DEPOSIT, WITHDRAWAL
- **Corporate Actions:** SPLIT, MERGER, SPIN_OFF
- **Fees:** FEE, COMMISSION

---

## 7. Real-Time Quotes

### Quote Fields for Display
| Field | Type | Description | Display Priority |
|-------|------|-------------|-----------------|
| lastTrade | number | Current price | HIGH |
| changeClose | number | $ change from close | HIGH |
| changeClosePercentage | number | % change from close | HIGH |
| bid | number | Current bid | HIGH |
| ask | number | Current ask | HIGH |
| bidSize | int64 | Bid size | MEDIUM |
| askSize | int64 | Ask size | MEDIUM |
| totalVolume | int64 | Today's volume | MEDIUM |
| high | number | Day high | MEDIUM |
| low | number | Day low | MEDIUM |
| open | number | Opening price | MEDIUM |
| previousClose | number | Yesterday's close | MEDIUM |

### Fundamental Data
| Field | Type | Description |
|-------|------|-------------|
| companyName | string | Company name |
| eps | number | Earnings per share |
| pe | number | P/E ratio |
| dividend | number | Dividend amount |
| yield | number | Dividend yield |
| marketCap | number | Market cap |
| beta | number | Stock beta |
| high52 | number | 52-week high |
| low52 | number | 52-week low |
| sharesOutstanding | number | Shares outstanding |
| nextEarningDate | string | Next earnings date |
| estEarnings | number | Estimated earnings |

### Extended Hours Quotes
| Field | Type | Description |
|-------|------|-------------|
| lastPrice | number | After-hours price |
| change | number | Change from regular close |
| percentChange | number | % change from close |
| bid/ask | number | After-hours bid/ask |
| volume | int64 | After-hours volume |
| timeOfLastTrade | int64 | Time of last AH trade |

### Option Greeks (for options)
| Field | Description |
|-------|-------------|
| delta | Price sensitivity |
| gamma | Delta rate of change |
| theta | Time decay |
| vega | Volatility sensitivity |
| rho | Interest rate sensitivity |
| iv | Implied volatility |

---

## 8. Mutual Fund Data

| Field | Description |
|-------|-------------|
| netAssetValue | NAV per share |
| publicOfferPrice | Public offering price |
| netExpenseRatio | Expense ratio |
| fundFamily | Fund family name |
| morningStarCategory | Morningstar category |
| averageAnnualReturn1Yr/3Yr/5Yr/10Yr | Historical returns |
| monthlyTrailingReturn* | Monthly trailing returns |
| initialInvestment | Minimum investment |
| subsequentInvestment | Minimum additional |

---

## UI Design Recommendations

### Dashboard Overview
```
┌─────────────────────────────────────────────────────────────────┐
│ ACCOUNT SUMMARY                                    [Refresh]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Total Value        Cash Available       Buying Power           │
│  $125,432.18        $12,543.00           $50,172.00             │
│  ▲ $1,234.56 (+1.2%)                                           │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Today's │  │ Total   │  │ Margin  │  │ Open    │           │
│  │ Gain    │  │ Gain    │  │ Used    │  │ Orders  │           │
│  │ +$432   │  │ +$8.2K  │  │ $0      │  │ 2       │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Positions Table
```
┌─────────────────────────────────────────────────────────────────┐
│ POSITIONS (12)                           [Filter] [Sort] [View] │
├─────────────────────────────────────────────────────────────────┤
│ Symbol    Name           Shares    Price     Change    Gain     │
├─────────────────────────────────────────────────────────────────┤
│ AAPL      Apple Inc.     50        $178.23   +1.23%   +$892    │
│ MSFT      Microsoft      25        $412.50   +0.85%   +$1,234  │
│ NVDA      NVIDIA Corp    10        $875.00   -2.10%   +$3,450  │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Position Detail View
```
┌─────────────────────────────────────────────────────────────────┐
│ AAPL - Apple Inc.                                    [Trade]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Price        Today's Change       Your Position        │
│  $178.23              +$2.15 (+1.22%)      50 shares            │
│                                                                 │
│  ──────────────────────────────────────────────────────────    │
│                                                                 │
│  Market Value    Cost Basis    Total Gain    % of Portfolio     │
│  $8,911.50       $8,019.00     +$892.50      7.1%              │
│                                (+11.13%)                        │
│                                                                 │
│  ──────────────────────────────────────────────────────────    │
│                                                                 │
│  FUNDAMENTALS                                                   │
│  P/E: 28.5  |  EPS: $6.25  |  Div Yield: 0.52%  |  Beta: 1.2  │
│  52-Week: $142.00 - $199.62  |  Market Cap: $2.8T              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Implementation Notes

### Pagination
- Default count: 50 items per request
- Use `marker` parameter for pagination
- Max positions per request: configurable via `count`

### View Parameter Options
```
?view=QUICK         # Basic price/volume (default)
?view=PERFORMANCE   # Gains and returns
?view=FUNDAMENTAL   # P/E, EPS, dividends
?view=OPTIONSWATCH  # Greeks and options data
?view=COMPLETE      # All available data
```

### Request Totals
```
?totalsRequired=true  # Include portfolio totals
?lotsRequired=true    # Include tax lot details
```

### Quote Status Values
- `REALTIME` - Live data
- `DELAYED` - 15-20 minute delay
- `CLOSING` - End of day
- `EH_REALTIME` - Extended hours real-time
- `EH_BEFORE_OPEN` - Pre-market
- `EH_CLOSED` - Extended hours closed

---

## Data Refresh Strategy

| Data Type | Refresh Frequency | Method |
|-----------|------------------|--------|
| Balances | On page load + manual | User-triggered |
| Positions | On page load + 1 min auto | Polling |
| Quotes | 15 sec (real-time users) | WebSocket or polling |
| Transactions | On demand | User-triggered |

---

## Sources

- [E*TRADE Portfolio API](https://apisb.etrade.com/docs/api/account/api-portfolio-v1.html)
- [E*TRADE Balance API](https://apisb.etrade.com/docs/api/account/api-balance-v1.html)
- [E*TRADE Transactions API](https://apisb.etrade.com/docs/api/account/api-transaction-v1.html)
- [E*TRADE Market Quote API](https://apisb.etrade.com/docs/api/market/api-quote-v1.html)
- [E*TRADE Developer Portal](https://developer.etrade.com/getting-started)
