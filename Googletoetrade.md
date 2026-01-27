# Building an AI-Powered E*TRADE Trading Application with WordPress Integration

This comprehensive technical specification provides **actionable implementation details** for a microservice-based trading application integrating E*TRADE’s brokerage API with Google Gemini’s analytical capabilities. The system supports both autonomous AI trading and human-approval workflows, with email-based trade confirmations, mobile-first UI, and WordPress user integration.

-----

## Strategy Discovery: AI-Powered Trading Strategy Generation

**New users often struggle to articulate their trading strategy.** The Strategy Discovery feature solves this cold-start problem by analyzing the user’s actual trading history and generating a suggested strategy description.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STRATEGY DISCOVERY FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. [Pull E*TRADE Data]                                            │
│      • Current portfolio positions                                  │
│      • 3 months of transaction history (max 1,500 transactions)     │
│                                                                     │
│   2. [Gemini Pro Analysis]                                          │
│      • Pattern detection across all trades                          │
│      • Behavioral analysis (timing, sizing, sectors)                │
│      • Consistency scoring                                          │
│                                                                     │
│   3. [Generate Strategy Options]                                    │
│      • Primary strategy interpretation                              │
│      • Alternative interpretations (2-3 options)                    │
│      • Confidence scores per pattern detected                       │
│                                                                     │
│   4. [User Review & Refinement]                                     │
│      • User selects/modifies generated strategy                     │
│      • AI helps refine based on feedback                            │
│      • Final strategy saved for all future analysis                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Collection from E*TRADE

```python
# app/services/strategy_discovery_service.py
from datetime import datetime, timedelta
from typing import Dict, List, Any
import asyncio

class StrategyDiscoveryService:
    """
    Analyzes user's trading history to generate a suggested trading strategy.
    Pulls current portfolio + 3 months of trades (max 1,500 transactions).
    """
    
    MAX_TRANSACTIONS = 1500
    HISTORY_MONTHS = 3
    
    def __init__(self, etrade_service, gemini_service):
        self.etrade = etrade_service
        self.gemini = gemini_service
    
    async def collect_trading_data(self, user_id: str, account_id: str) -> Dict[str, Any]:
        """
        Collect portfolio and transaction data from E*TRADE.
        
        Returns:
            Dict containing current portfolio and transaction history
        """
        # Calculate date range (3 months back)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        # Fetch data concurrently for performance
        portfolio_task = self.etrade.get_portfolio(account_id)
        transactions_task = self.fetch_transactions_paginated(
            account_id=account_id,
            start_date=start_date,
            end_date=end_date
        )
        
        portfolio, transactions = await asyncio.gather(
            portfolio_task, 
            transactions_task
        )
        
        return {
            "portfolio": portfolio,
            "transactions": transactions,
            "data_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "transaction_count": len(transactions)
            }
        }
    
    async def fetch_transactions_paginated(
        self, 
        account_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Dict]:
        """
        Fetch transactions with pagination to handle large histories.
        E*TRADE returns max 50 transactions per request.
        """
        all_transactions = []
        marker = None  # E*TRADE uses marker for pagination
        
        while len(all_transactions) < self.MAX_TRANSACTIONS:
            response = await self.etrade.get_transactions(
                account_id=account_id,
                start_date=start_date,
                end_date=end_date,
                count=50,  # E*TRADE max per request
                marker=marker
            )
            
            transactions = response.get('transactions', [])
            if not transactions:
                break
                
            all_transactions.extend(transactions)
            marker = response.get('next_marker')
            
            if not marker:
                break
        
        # Enforce max limit to prevent API overload
        return all_transactions[:self.MAX_TRANSACTIONS]
```

### E*TRADE Transaction API Details

```python
# E*TRADE transaction endpoint structure
async def get_transactions(
    self,
    account_id: str,
    start_date: datetime,
    end_date: datetime,
    count: int = 50,
    marker: str = None
) -> Dict:
    """
    GET /v1/accounts/{accountIdKey}/transactions
    
    Query Parameters:
        startDate: Start date (MM/DD/YYYY format for E*TRADE)
        endDate: End date (MM/DD/YYYY format for E*TRADE)
        count: Max transactions to return (1-50)
        marker: Pagination marker from previous response
    
    Returns transaction types:
        - BOUGHT, SOLD (equity trades)
        - BOUGHT_TO_OPEN, SOLD_TO_CLOSE (options)
        - DIVIDEND, INTEREST
        - TRANSFER_IN, TRANSFER_OUT
        - etc.
    """
    url = f"{self.base_url}/v1/accounts/{account_id}/transactions"
    
    params = {
        'startDate': start_date.strftime('%m%d%Y'),
        'endDate': end_date.strftime('%m%d%Y'),
        'count': min(count, 50)
    }
    
    if marker:
        params['marker'] = marker
    
    response = await self._make_authenticated_request('GET', url, params=params)
    return response.json()
```

### Pattern Detection with Gemini Pro

The Strategy Discovery feature uses **Gemini Pro exclusively** (not Flash-Lite) because pattern detection across trading history requires advanced reasoning capabilities.

```python
# Patterns detected from trading history
PATTERN_DETECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "detected_patterns": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "pattern_type": {
                        "type": "string",
                        "enum": [
                            "sector_preference",
                            "position_sizing",
                            "holding_period",
                            "entry_timing",
                            "exit_behavior",
                            "dividend_focus",
                            "momentum_chasing",
                            "value_hunting",
                            "loss_aversion",
                            "profit_taking"
                        ]
                    },
                    "description": {"type": "string"},
                    "evidence": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific trades/data points supporting this pattern"
                    },
                    "confidence": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "How confident the AI is in this pattern"
                    },
                    "frequency": {"type": "string"}
                },
                "required": ["pattern_type", "description", "evidence", "confidence"]
            }
        },
        "behavioral_insights": {
            "type": "object",
            "properties": {
                "average_holding_period_days": {"type": "number"},
                "typical_position_size_percent": {"type": "number"},
                "win_rate": {"type": "number"},
                "average_gain_percent": {"type": "number"},
                "average_loss_percent": {"type": "number"},
                "most_traded_sectors": {"type": "array", "items": {"type": "string"}},
                "trading_frequency": {"type": "string"},
                "preferred_order_types": {"type": "array", "items": {"type": "string"}}
            }
        },
        "inconsistencies": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "examples": {"type": "array", "items": {"type": "string"}},
                    "suggestion": {"type": "string"}
                }
            },
            "description": "Contradictory behaviors that may need clarification"
        }
    },
    "required": ["detected_patterns", "behavioral_insights", "inconsistencies"]
}
```

### Strategy Generation from Patterns

```python
async def generate_strategy_suggestions(
    self,
    trading_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyze trading history and generate strategy suggestions.
    Uses Gemini Pro for advanced pattern recognition.
    """
    
    # First pass: Detect patterns in trading behavior
    pattern_prompt = f"""
    Analyze this trading history to detect behavioral patterns.
    
    ## CURRENT PORTFOLIO
    {self._format_portfolio(trading_data['portfolio'])}
    
    ## TRANSACTION HISTORY ({trading_data['data_period']['transaction_count']} transactions)
    Period: {trading_data['data_period']['start']} to {trading_data['data_period']['end']}
    
    {self._format_transactions(trading_data['transactions'])}
    
    ## ANALYSIS INSTRUCTIONS
    
    1. Identify recurring patterns in:
       - Sector/industry preferences (what do they tend to buy?)
       - Position sizing (how much do they typically invest per trade?)
       - Holding periods (day trading, swing trading, long-term?)
       - Entry behavior (do they buy dips, breakouts, or randomly?)
       - Exit behavior (profit targets, stop losses, or emotional selling?)
       - Risk tolerance (concentrated positions vs diversified?)
    
    2. Calculate behavioral metrics:
       - Win rate (% of trades that were profitable)
       - Average gain vs average loss
       - Typical holding period
       - Position sizing patterns
    
    3. Flag inconsistencies:
       - Contradictory behaviors (e.g., claims to be long-term but trades daily)
       - Potential mistakes to avoid repeating
       - Areas where behavior doesn't match common strategies
    
    4. Assign confidence scores (0-1) to each pattern based on:
       - How many trades support the pattern
       - How consistent the pattern is
       - How recent the pattern is (recent behavior weighted higher)
    
    Be specific with evidence. Cite actual trades from the history.
    """
    
    patterns_response = await self.gemini.pro_model.generate_content(
        pattern_prompt,
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            response_schema=PATTERN_DETECTION_SCHEMA
        )
    )
    
    detected_patterns = json.loads(patterns_response.text)
    
    # Second pass: Generate strategy interpretations
    strategy_suggestions = await self._generate_strategy_options(
        detected_patterns, 
        trading_data
    )
    
    return {
        "patterns": detected_patterns,
        "strategy_suggestions": strategy_suggestions,
        "data_summary": {
            "transactions_analyzed": trading_data['data_period']['transaction_count'],
            "period": trading_data['data_period'],
            "current_positions": len(trading_data['portfolio'].get('positions', []))
        }
    }
```

### Multiple Strategy Interpretations

The AI generates **multiple strategy interpretations** so users can choose the one that best matches their intent:

```python
STRATEGY_SUGGESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "primary_interpretation": {
            "type": "object",
            "properties": {
                "strategy_name": {"type": "string"},
                "investment_philosophy": {"type": "string"},
                "risk_tolerance": {"type": "string"},
                "time_horizon": {"type": "string"},
                "position_sizing_rules": {"type": "string"},
                "entry_criteria": {"type": "string"},
                "exit_criteria": {"type": "string"},
                "sector_preferences": {"type": "string"},
                "confidence_score": {"type": "number"},
                "explanation": {"type": "string"}
            },
            "required": ["strategy_name", "investment_philosophy", "entry_criteria", 
                        "exit_criteria", "confidence_score", "explanation"]
        },
        "alternative_interpretations": {
            "type": "array",
            "maxItems": 2,
            "items": {
                "type": "object",
                "properties": {
                    "strategy_name": {"type": "string"},
                    "investment_philosophy": {"type": "string"},
                    "key_differences": {"type": "string"},
                    "confidence_score": {"type": "number"},
                    "explanation": {"type": "string"}
                }
            }
        },
        "questions_for_user": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Clarifying questions to refine the strategy"
        },
        "areas_needing_definition": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Strategy components that couldn't be inferred from history"
        }
    },
    "required": ["primary_interpretation", "alternative_interpretations", "questions_for_user"]
}

async def _generate_strategy_options(
    self,
    detected_patterns: Dict,
    trading_data: Dict
) -> Dict:
    """Generate strategy interpretations based on detected patterns."""
    
    strategy_prompt = f"""
    Based on the detected trading patterns, generate strategy suggestions.
    
    ## DETECTED PATTERNS
    {json.dumps(detected_patterns, indent=2)}
    
    ## INSTRUCTIONS
    
    1. PRIMARY INTERPRETATION
       Create the most likely trading strategy that explains this user's behavior.
       Include all required strategy components:
       - Investment philosophy (value, growth, momentum, dividend, etc.)
       - Risk tolerance (conservative, moderate, aggressive)
       - Time horizon (day trading, swing, position, long-term)
       - Position sizing rules (specific percentages)
       - Entry criteria (what triggers a buy)
       - Exit criteria (profit targets, stop losses)
       - Sector preferences
    
    2. ALTERNATIVE INTERPRETATIONS (2 options)
       Provide alternative ways to interpret their behavior.
       Example: Trading history might show both value and momentum patterns -
       offer interpretations assuming each is the primary approach.
    
    3. CLARIFYING QUESTIONS
       Ask questions that would help distinguish between interpretations.
       Example: "Do you prefer to buy stocks after a pullback, or on breakouts?"
    
    4. GAPS IN DATA
       Identify strategy components you couldn't determine from the data.
       Example: If no stop-loss behavior observed, note this needs definition.
    
    Be specific. Use actual numbers from the patterns (e.g., "You typically 
    allocate 5-8% per position" not "You use moderate position sizing").
    """
    
    response = await self.gemini.pro_model.generate_content(
        strategy_prompt,
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            response_schema=STRATEGY_SUGGESTION_SCHEMA
        )
    )
    
    return json.loads(response.text)
```

### Strategy Discovery API Endpoints

```python
# app/routes/strategy_discovery.py
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/api/strategy-discovery", tags=["strategy-discovery"])

@router.post("/analyze")
async def analyze_trading_history(
    user = Depends(get_current_user),
    etrade_account_id: str = None
):
    """
    Analyze user's E*TRADE trading history and generate strategy suggestions.
    Pulls current portfolio + 3 months of trades (max 1,500 transactions).
    """
    discovery_service = StrategyDiscoveryService(etrade_service, gemini_service)
    
    # Collect trading data from E*TRADE
    trading_data = await discovery_service.collect_trading_data(
        user_id=user.id,
        account_id=etrade_account_id or user.default_etrade_account
    )
    
    # Check if we have enough data for meaningful analysis
    if trading_data['data_period']['transaction_count'] < 10:
        return {
            "status": "insufficient_data",
            "message": "We found fewer than 10 transactions in the past 3 months. "
                      "Strategy Discovery works best with more trading history. "
                      "You can manually define your strategy instead.",
            "transaction_count": trading_data['data_period']['transaction_count'],
            "manual_entry_url": "/settings/strategy"
        }
    
    # Generate strategy suggestions using Gemini Pro
    analysis = await discovery_service.generate_strategy_suggestions(trading_data)
    
    # Store analysis for user review
    analysis_id = await db.store_strategy_analysis(user.id, analysis)
    
    return {
        "status": "success",
        "analysis_id": analysis_id,
        "summary": {
            "transactions_analyzed": analysis['data_summary']['transactions_analyzed'],
            "patterns_detected": len(analysis['patterns']['detected_patterns']),
            "primary_strategy": analysis['strategy_suggestions']['primary_interpretation']['strategy_name'],
            "confidence": analysis['strategy_suggestions']['primary_interpretation']['confidence_score'],
            "alternatives_available": len(analysis['strategy_suggestions']['alternative_interpretations'])
        }
    }

@router.get("/analysis/{analysis_id}")
async def get_analysis_details(
    analysis_id: str,
    user = Depends(get_current_user)
):
    """Get full details of a strategy analysis."""
    analysis = await db.get_strategy_analysis(analysis_id, user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

@router.post("/analysis/{analysis_id}/select")
async def select_strategy(
    analysis_id: str,
    selection: StrategySelection,
    user = Depends(get_current_user)
):
    """
    Select a strategy interpretation and optionally modify it.
    
    Body:
        interpretation: "primary" | "alternative_1" | "alternative_2"
        modifications: Optional dict of fields to override
        answers_to_questions: Optional list of answers to clarifying questions
    """
    analysis = await db.get_strategy_analysis(analysis_id, user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Get selected interpretation
    if selection.interpretation == "primary":
        base_strategy = analysis['strategy_suggestions']['primary_interpretation']
    else:
        alt_index = int(selection.interpretation.split('_')[1]) - 1
        base_strategy = analysis['strategy_suggestions']['alternative_interpretations'][alt_index]
    
    # Apply user modifications
    final_strategy = {**base_strategy}
    if selection.modifications:
        final_strategy.update(selection.modifications)
    
    # If user answered clarifying questions, refine strategy with AI
    if selection.answers_to_questions:
        final_strategy = await refine_strategy_with_answers(
            base_strategy=final_strategy,
            questions=analysis['strategy_suggestions']['questions_for_user'],
            answers=selection.answers_to_questions
        )
    
    # Save as user's active trading strategy
    await db.save_user_strategy(user.id, final_strategy, source='ai_generated')
    
    return {
        "status": "success",
        "message": "Your trading strategy has been saved. All future AI analysis will use this strategy context.",
        "strategy": final_strategy
    }

@router.post("/refine")
async def refine_strategy_with_ai(
    refinement: StrategyRefinement,
    user = Depends(get_current_user)
):
    """
    Use AI to help refine or clarify parts of the strategy.
    
    Body:
        current_strategy: Current strategy dict
        user_feedback: What the user wants to change/clarify
    """
    prompt = f"""
    Help refine this trading strategy based on user feedback.
    
    ## CURRENT STRATEGY
    {json.dumps(refinement.current_strategy, indent=2)}
    
    ## USER FEEDBACK
    {refinement.user_feedback}
    
    Update the strategy to incorporate the user's feedback.
    Keep all other aspects unchanged unless they conflict with the feedback.
    Return the complete updated strategy.
    """
    
    response = await gemini_service.pro_model.generate_content(
        prompt,
        generation_config=GenerationConfig(response_mime_type="application/json")
    )
    
    return {"refined_strategy": json.loads(response.text)}
```

### Strategy Evolution Detection (Periodic Re-Analysis)

Run Strategy Discovery periodically to detect if the user’s trading behavior has evolved:

```python
# app/workers/strategy_evolution_checker.py

class StrategyEvolutionChecker:
    """
    Periodically analyzes recent trades to detect strategy drift/evolution.
    Alerts user when their behavior significantly differs from stated strategy.
    """
    
    async def check_strategy_evolution(self, user_id: str):
        """Compare recent trading behavior to stored strategy."""
        current_strategy = await db.get_user_strategy(user_id)
        if not current_strategy:
            return
        
        # Get last 30 days of trades
        recent_trades = await etrade_service.get_recent_transactions(
            user_id=user_id,
            days=30
        )
        
        if len(recent_trades) < 5:
            return  # Not enough data
        
        evolution_prompt = f"""
        Compare recent trading activity to the user's stated strategy.
        
        ## STATED STRATEGY
        {json.dumps(current_strategy, indent=2)}
        
        ## RECENT TRADES (Last 30 days)
        {self._format_transactions(recent_trades)}
        
        ## ANALYSIS
        1. Does recent behavior align with the stated strategy?
        2. Are there new patterns not covered by the strategy?
        3. Has the user's approach evolved?
        
        Return:
        - alignment_score (0-1): How well recent trades match strategy
        - drift_detected (bool): Whether significant strategy drift exists
        - evolution_summary: Description of any changes
        - suggested_updates: Recommended strategy modifications
        """
        
        response = await gemini_service.pro_model.generate_content(evolution_prompt)
        analysis = json.loads(response.text)
        
        if analysis['drift_detected'] or analysis['alignment_score'] < 0.7:
            await self._notify_user_of_evolution(user_id, analysis)

# Schedule monthly evolution checks
scheduler.add_job(
    check_all_users_strategy_evolution,
    CronTrigger(day=1, hour=9),  # First of each month
    id='strategy_evolution_check'
)
```

### Frontend: Strategy Discovery Wizard

```jsx
// components/StrategyDiscovery.jsx
import { useState } from 'react';
import { Card, Button, Badge, ProgressBar, Accordion, TextInput } from '@tremor/react';

export function StrategyDiscoveryWizard() {
  const [step, setStep] = useState('intro');
  const [analysis, setAnalysis] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  
  const startAnalysis = async () => {
    setStep('analyzing');
    const result = await fetch('/api/strategy-discovery/analyze', { method: 'POST' });
    const data = await result.json();
    setAnalysis(data);
    setStep('review');
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      {step === 'intro' && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Discover Your Trading Strategy</h2>
          <p className="text-gray-600 mb-4">
            Not sure how to describe your trading strategy? We'll analyze your 
            E*TRADE trading history and generate a personalized strategy based 
            on your actual trading patterns.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold">What we'll analyze:</h4>
            <ul className="list-disc ml-5 mt-2 text-sm">
              <li>Your current portfolio positions</li>
              <li>Last 3 months of transactions (up to 1,500 trades)</li>
              <li>Sector preferences and timing patterns</li>
              <li>Position sizing and risk behavior</li>
            </ul>
          </div>
          <Button onClick={startAnalysis} size="lg" className="w-full">
            Analyze My Trading History
          </Button>
        </Card>
      )}
      
      {step === 'analyzing' && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Analyzing Your Trades...</h2>
          <ProgressBar value={65} className="mb-4" />
          <p className="text-gray-600">
            Pulling data from E*TRADE and detecting patterns. This may take a minute.
          </p>
        </Card>
      )}
      
      {step === 'review' && analysis && (
        <div className="space-y-4">
          {/* Detected Patterns Card */}
          <Card>
            <h3 className="font-bold mb-3">Detected Patterns</h3>
            <p className="text-sm text-gray-500 mb-3">
              Based on {analysis.summary.transactions_analyzed} transactions
            </p>
            {analysis.patterns.detected_patterns.map((pattern, idx) => (
              <div key={idx} className="border-b py-3 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">
                    {pattern.pattern_type.replace(/_/g, ' ')}
                  </span>
                  <Badge color={pattern.confidence > 0.7 ? 'green' : 'yellow'}>
                    {(pattern.confidence * 100).toFixed(0)}% confident
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
              </div>
            ))}
          </Card>
          
          {/* Strategy Selection Card */}
          <Card>
            <h3 className="font-bold mb-3">Suggested Strategy</h3>
            
            {/* Primary Interpretation */}
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer mb-4 ${
                selectedStrategy === 'primary' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedStrategy('primary')}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">
                  {analysis.strategy_suggestions.primary_interpretation.strategy_name}
                </h4>
                <Badge color="green">Best Match</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {analysis.strategy_suggestions.primary_interpretation.explanation}
              </p>
            </div>
            
            {/* Alternative Interpretations */}
            <p className="text-sm text-gray-500 mb-2">Or choose an alternative:</p>
            {analysis.strategy_suggestions.alternative_interpretations.map((alt, idx) => (
              <div 
                key={idx}
                className={`p-4 border rounded-lg cursor-pointer mb-2 ${
                  selectedStrategy === `alternative_${idx+1}` 
                    ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedStrategy(`alternative_${idx+1}`)}
              >
                <h4 className="font-medium">{alt.strategy_name}</h4>
                <p className="text-sm text-gray-600">{alt.key_differences}</p>
              </div>
            ))}
          </Card>
          
          {/* Clarifying Questions */}
          {analysis.strategy_suggestions.questions_for_user.length > 0 && (
            <Card>
              <h3 className="font-bold mb-3">Help Us Understand Better</h3>
              {analysis.strategy_suggestions.questions_for_user.map((q, idx) => (
                <div key={idx} className="mb-4">
                  <label className="block text-sm font-medium mb-1">{q}</label>
                  <TextInput placeholder="Your answer..." />
                </div>
              ))}
            </Card>
          )}
          
          <Button 
            onClick={() => confirmStrategy(selectedStrategy)} 
            disabled={!selectedStrategy}
            size="lg" 
            className="w-full"
          >
            Use This Strategy
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Data Requirements Summary

|Data Source      |Endpoint                          |Limit              |Purpose                    |
|-----------------|----------------------------------|-------------------|---------------------------|
|Current Portfolio|GET /v1/accounts/{id}/portfolio   |All positions      |Understand current holdings|
|Transactions     |GET /v1/accounts/{id}/transactions|3 months, max 1,500|Analyze trading patterns   |

### Improvement Features Implemented

|Feature                       |Benefit                                                             |
|------------------------------|--------------------------------------------------------------------|
|**Multiple interpretations**  |User chooses strategy that matches their intent                     |
|**Confidence scoring**        |Transparency on how certain the AI is about each pattern            |
|**Inconsistency flagging**    |Helps users identify and resolve contradictory behaviors            |
|**Clarifying questions**      |AI asks targeted questions to fill gaps in understanding            |
|**Refinement workflow**       |Users can edit/adjust the generated strategy                        |
|**Evolution detection**       |Monthly checks alert users when behavior drifts from strategy       |
|**Insufficient data handling**|Graceful fallback when trading history is too short                 |
|**Pagination handling**       |Properly fetches large transaction histories without overloading API|

-----

## Trading Strategy Context: The Foundation of AI-Driven Decisions

**Every AI analysis and trade recommendation must be grounded in the user’s personal trading strategy.** This is not optional—it’s the core differentiator that makes the AI useful rather than generic.

### User-Defined Trading Strategy Plan

Each user must provide a comprehensive trading strategy description that the AI references for ALL portfolio analysis and trade recommendations. This can be entered manually OR generated via Strategy Discovery.

**Required strategy components:**

|Component                      |Description                                            |Example                                                                       |
|-------------------------------|-------------------------------------------------------|------------------------------------------------------------------------------|
|**Investment Philosophy**      |Core approach (value, growth, momentum, dividend, etc.)|“Value investing focused on undervalued companies with strong fundamentals”   |
|**Risk Tolerance**             |Acceptable drawdown, volatility preference             |“Moderate risk; max 15% portfolio drawdown acceptable”                        |
|**Time Horizon**               |Short-term trading vs long-term holding                |“Medium-term holds (3-12 months), with occasional swing trades”               |
|**Position Sizing Rules**      |Max allocation per position, sector limits             |“Max 8% per position, max 25% per sector”                                     |
|**Entry Criteria**             |Specific conditions for buying                         |“P/E below industry average, positive earnings growth 2+ consecutive quarters”|
|**Exit Criteria**              |When to sell (profit targets, stop losses)             |“Sell at 25% gain or if thesis breaks; stop-loss at 12% below entry”          |
|**Sector/Industry Preferences**|Focus areas or exclusions                              |“Focus on tech and healthcare; avoid fossil fuels”                            |
|**Dividend Requirements**      |Income goals if applicable                             |“Prefer dividend-paying stocks with 2%+ yield”                                |

### Strategy Context Implementation

```python
# User's trading strategy injected into every Gemini API call
TRADING_STRATEGY_PROMPT = """
## USER'S TRADING STRATEGY CONTEXT

You are analyzing a portfolio for a user with the following investment strategy. 
ALL recommendations MUST align with and reference this strategy.

{user_trading_strategy}

---

When generating trade recommendations:
1. Explicitly reference which strategy rule(s) support the recommendation
2. Explain how the trade advances the user's stated investment goals
3. Note any conflicts with strategy rules and why the trade is still recommended
4. Never recommend trades that violate core strategy constraints without flagging
"""
```

-----

## Trade Recommendation Quality: Smart, Strategy-Aligned Reasoning

**Trade recommendations must include intelligent, specific justifications—not generic statements like “you will earn a profit.”**

### Required Recommendation Structure

```json
{
  "ticker": "AAPL",
  "action": "BUY",
  "quantity": 15,
  "order_type": "LIMIT",
  "limit_price": 178.50,
  "confidence": 0.82,
  "strategy_alignment": {
    "primary_rule": "Entry Criteria - P/E below industry average",
    "supporting_rules": [
      "Sector Preference - Technology focus",
      "Position Sizing - Within 8% portfolio limit"
    ],
    "conflicts": []
  },
  "reasoning": {
    "fundamental_case": "Apple's current P/E of 26.3 is 18% below the technology sector average of 32.1. Free cash flow increased 12% YoY while maintaining 95% gross margins on services.",
    "technical_case": "Price has pulled back 8% from recent highs to test the 200-day moving average support at $176. RSI at 38 indicates oversold conditions.",
    "strategy_fit": "This aligns with your value-oriented approach of buying quality companies at reasonable prices. The pullback provides entry below your stated 'P/E below industry average' criterion.",
    "risk_assessment": "Downside risk to $165 (7.5% below entry) if broader market correction continues. Your 12% stop-loss rule would trigger at $157.08.",
    "expected_outcome": "Based on historical mean reversion and your 3-12 month holding period, target price of $210-220 represents 18-23% upside, exceeding your 25% profit-taking threshold within expected timeframe."
  },
  "alternatives_considered": [
    {
      "ticker": "MSFT",
      "why_not_recommended": "P/E of 34.2 exceeds sector average, doesn't meet your entry criteria despite strong fundamentals"
    }
  ]
}
```

### Reasoning Quality Requirements

|Aspect           |❌ Bad Example         |✅ Good Example                                                                                                                                              |
|-----------------|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Why Buy**      |“Stock will go up”    |“P/E of 14.2 is 30% below 5-year average; your strategy targets undervalued stocks. Last 3 quarters showed accelerating revenue growth (8%, 12%, 15%).”     |
|**Strategy Link**|“Good investment”     |“Meets your entry criterion of ‘positive earnings growth 2+ consecutive quarters’ with EPS growth of +18% and +22% in Q2/Q3.”                               |
|**Risk Context** |“Some risk involved”  |“Position size of $2,400 represents 6% of portfolio, within your 8% max rule. Correlation with existing tech holdings is 0.72—monitor sector concentration.”|
|**Exit Plan**    |“Sell when profitable”|“Your 25% profit target suggests exit at $185. Your 12% stop-loss would trigger at $132. Risk/reward ratio: 2.8:1.”                                         |

-----

## Google Gemini API Integration

### Model Selection Strategy: 75% Flash-Lite / 25% Pro

|Model                    |Usage|Use Cases                                                                   |Cost (per 1M tokens) |
|-------------------------|-----|----------------------------------------------------------------------------|---------------------|
|**Gemini 2.5 Pro**       |25%  |Trade recommendations, Strategy Discovery, complex analysis, risk assessment|$1.25 in / $10.00 out|
|**Gemini 2.5 Flash-Lite**|75%  |Portfolio summaries, status updates, notifications, simple extractions      |$0.10 in / $0.40 out |

### Structured Output Configuration

```python
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

pro_model = genai.GenerativeModel(
    model_name="gemini-2.5-pro",
    generation_config=GenerationConfig(
        temperature=0.3,
        top_p=0.8,
        max_output_tokens=4096
    )
)

flash_lite_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash-lite",
    generation_config=GenerationConfig(
        temperature=0.2,
        top_p=0.9,
        max_output_tokens=2048
    )
)

# Generate structured response
response = pro_model.generate_content(
    prompt,
    generation_config=GenerationConfig(
        response_mime_type="application/json",
        response_schema=TRADE_RECOMMENDATION_SCHEMA
    )
)
```

### Estimated Monthly Cost

|Activity             |Model     |Input Tokens|Output Tokens|
|---------------------|----------|------------|-------------|
|Trade Recommendations|Pro       |80,000      |120,000      |
|Strategy Discovery   |Pro       |100,000     |50,000       |
|Complex Analysis     |Pro       |180,000     |135,000      |
|Portfolio Summaries  |Flash-Lite|260,000     |130,000      |
|Simple Updates       |Flash-Lite|200,000     |100,000      |

**Total: ~$3.65/month**

-----

## E*TRADE API Integration

### Key Endpoints

|Endpoint     |Method|URL                                         |
|-------------|------|--------------------------------------------|
|List Accounts|GET   |`/v1/accounts/list`                         |
|Portfolio    |GET   |`/v1/accounts/{accountIdKey}/portfolio`     |
|Transactions |GET   |`/v1/accounts/{accountIdKey}/transactions`  |
|Preview Order|POST  |`/v1/accounts/{accountIdKey}/orders/preview`|
|Place Order  |POST  |`/v1/accounts/{accountIdKey}/orders/place`  |
|Market Quotes|GET   |`/v1/market/quote/{symbols}`                |

### Authentication: OAuth 1.0a

- Access tokens expire at **midnight Eastern Time daily**
- Tokens become inactive after **2 hours** of no activity
- Implement scheduled re-authentication at 12:01 AM ET

-----

## Database Schema

```sql
-- User trading strategies (manual or AI-generated)
CREATE TABLE user_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    source VARCHAR(20) DEFAULT 'manual',  -- 'manual', 'ai_generated', 'ai_refined'
    investment_philosophy TEXT NOT NULL,
    risk_tolerance TEXT NOT NULL,
    time_horizon TEXT,
    position_sizing_rules TEXT NOT NULL,
    entry_criteria TEXT NOT NULL,
    exit_criteria TEXT NOT NULL,
    sector_preferences TEXT,
    dividend_requirements TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Strategy discovery analyses
CREATE TABLE strategy_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    detected_patterns JSONB NOT NULL,
    behavioral_insights JSONB,
    inconsistencies JSONB,
    strategy_suggestions JSONB NOT NULL,
    data_summary JSONB NOT NULL,
    selected_interpretation VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trade recommendations
CREATE TABLE trade_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    ticker VARCHAR(10) NOT NULL,
    action VARCHAR(4),
    quantity INTEGER,
    confidence DECIMAL(3, 2),
    strategy_alignment JSONB NOT NULL,
    reasoning JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);
```

-----

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WordPress Frontend                          │
│  [Strategy Discovery] [Portfolio Dashboard] [Trade Queue]           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ JWT Token
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Microservice                             │
│  - Strategy Discovery: Analyze history → Generate strategy          │
│  - Portfolio Analysis: Strategy-aware AI analysis                   │
│  - Trade Recommendations: Smart, justified recommendations          │
└───────┬──────────────┬──────────────┬─────────────┬─────────────────┘
        │              │              │             │
        ▼              ▼              ▼             ▼
┌───────────┐  ┌───────────────┐  ┌─────────┐  ┌──────────────┐
│ E*TRADE   │  │ Google Gemini │  │ Redis   │  │ PostgreSQL   │
│ OAuth API │  │ Pro + Flash   │  │ Cache   │  │ Strategies   │
└───────────┘  └───────────────┘  └─────────┘  └──────────────┘
```

**Technology Stack:**

- Backend: FastAPI (Python)
- AI: Google Gemini (75% Flash-Lite, 25% Pro)
- Database: PostgreSQL
- Cache: Redis
- Frontend: React + Tailwind CSS + Tremor
- Charts: TradingView Lightweight Charts
- Email: SendGrid
- Auth: JWT (WordPress) + OAuth 1.0a (E*TRADE)

**Estimated Monthly Costs: ~$25-50/month** (hosting + API)

-----

## Error Handling Framework

### Error Categories

The application defines four primary error categories, each with specific handling strategies:

| Category | Description | Examples |
|----------|-------------|----------|
| **API Errors** | External service failures | E*TRADE timeout, Gemini rate limit, network errors |
| **Data Errors** | Invalid or missing data | Malformed responses, stale quotes, missing fields |
| **Business Logic Errors** | Rule violations | Insufficient funds, invalid order, strategy conflicts |
| **System Errors** | Infrastructure failures | Database down, Redis unavailable, memory exhaustion |

### Error Response Schema

```json
{
  "error": {
    "code": "ETRADE_API_TIMEOUT",
    "category": "api",
    "message": "E*TRADE API did not respond within 30 seconds",
    "user_message": "We're having trouble connecting to E*TRADE. Please try again in a moment.",
    "retry_after": 60,
    "retryable": true,
    "details": {
      "endpoint": "/v1/accounts/portfolio",
      "timeout_ms": 30000
    },
    "request_id": "req_abc123",
    "timestamp": "2025-01-24T10:30:00Z"
  }
}
```

### Retry Strategies

#### Exponential Backoff with Jitter

```python
# app/utils/retry.py
import asyncio
import random
from typing import TypeVar, Callable
from functools import wraps

T = TypeVar('T')

class RetryConfig:
    """Retry configuration for different error types."""

    CONFIGS = {
        'etrade_api': {
            'max_retries': 3,
            'base_delay': 1.0,
            'max_delay': 30.0,
            'exponential_base': 2,
            'jitter': 0.5,  # +/- 50% randomization
        },
        'gemini_api': {
            'max_retries': 3,
            'base_delay': 2.0,
            'max_delay': 60.0,
            'exponential_base': 2,
            'jitter': 0.3,
        },
        'database': {
            'max_retries': 5,
            'base_delay': 0.5,
            'max_delay': 10.0,
            'exponential_base': 2,
            'jitter': 0.2,
        },
        'redis': {
            'max_retries': 3,
            'base_delay': 0.1,
            'max_delay': 2.0,
            'exponential_base': 2,
            'jitter': 0.1,
        },
    }


def calculate_delay(attempt: int, config: dict) -> float:
    """
    Calculate delay with exponential backoff and jitter.

    Formula: min(max_delay, base_delay * (exponential_base ^ attempt)) * (1 +/- jitter)
    """
    delay = min(
        config['max_delay'],
        config['base_delay'] * (config['exponential_base'] ** attempt)
    )

    # Add jitter
    jitter_range = delay * config['jitter']
    delay = delay + random.uniform(-jitter_range, jitter_range)

    return max(0.1, delay)  # Minimum 100ms delay


async def retry_with_backoff(
    func: Callable,
    config_name: str,
    *args,
    **kwargs
) -> T:
    """
    Execute function with retry and exponential backoff.
    """
    config = RetryConfig.CONFIGS[config_name]
    last_exception = None

    for attempt in range(config['max_retries'] + 1):
        try:
            return await func(*args, **kwargs)
        except RetryableError as e:
            last_exception = e
            if attempt < config['max_retries']:
                delay = calculate_delay(attempt, config)
                await asyncio.sleep(delay)
        except NonRetryableError:
            raise

    raise last_exception
```

#### Error-Specific Retry Rules

| Error Type | Retryable | Max Retries | Strategy |
|------------|-----------|-------------|----------|
| HTTP 429 (Rate Limit) | Yes | 3 | Exponential + Retry-After header |
| HTTP 500-503 | Yes | 3 | Exponential backoff |
| HTTP 400 (Bad Request) | No | 0 | Fail immediately |
| HTTP 401/403 | No | 0 | Trigger re-auth |
| Connection Timeout | Yes | 3 | Exponential backoff |
| Connection Refused | Yes | 2 | Short delay |
| SSL/TLS Error | No | 0 | Fail immediately |
| Parse Error | No | 0 | Log and fail |

### Circuit Breaker Pattern

Prevent cascading failures by temporarily disabling calls to failing services.

```python
# app/utils/circuit_breaker.py
from enum import Enum
from datetime import datetime, timedelta
from typing import Callable, Optional
import asyncio

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    """
    Circuit breaker for external service calls.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Service failing, requests rejected immediately
    - HALF_OPEN: Testing recovery, limited requests allowed
    """

    # Configuration per service
    CONFIGS = {
        'etrade': {
            'failure_threshold': 5,      # Failures before opening
            'recovery_timeout': 60,      # Seconds before half-open
            'success_threshold': 3,      # Successes to close
            'half_open_max_calls': 3,    # Max calls in half-open
        },
        'gemini': {
            'failure_threshold': 3,
            'recovery_timeout': 30,
            'success_threshold': 2,
            'half_open_max_calls': 2,
        },
        'database': {
            'failure_threshold': 3,
            'recovery_timeout': 10,
            'success_threshold': 1,
            'half_open_max_calls': 1,
        },
    }

    def __init__(self, service_name: str):
        config = self.CONFIGS.get(service_name, self.CONFIGS['etrade'])
        self.failure_threshold = config['failure_threshold']
        self.recovery_timeout = config['recovery_timeout']
        self.success_threshold = config['success_threshold']
        self.half_open_max_calls = config['half_open_max_calls']

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.half_open_calls = 0

    async def call(self, func: Callable, *args, **kwargs):
        """Execute function through circuit breaker."""

        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise CircuitOpenError(
                    f"Circuit breaker is open. Retry after {self._time_until_retry()}s"
                )

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise CircuitOpenError("Half-open call limit reached")
            self.half_open_calls += 1

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.success_count = 0
        elif self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def _should_attempt_reset(self) -> bool:
        if not self.last_failure_time:
            return True
        return datetime.utcnow() - self.last_failure_time > timedelta(
            seconds=self.recovery_timeout
        )

    def _time_until_retry(self) -> int:
        if not self.last_failure_time:
            return 0
        elapsed = (datetime.utcnow() - self.last_failure_time).seconds
        return max(0, self.recovery_timeout - elapsed)


# Global circuit breakers
circuit_breakers = {
    'etrade': CircuitBreaker('etrade'),
    'gemini': CircuitBreaker('gemini'),
    'database': CircuitBreaker('database'),
}
```

### Graceful Degradation

When services fail, the application degrades gracefully rather than failing completely.

| Service Failure | Degraded Behavior |
|-----------------|-------------------|
| **E*TRADE API** | Show cached portfolio (with staleness warning), queue trade for later |
| **Gemini API** | Show basic data without AI analysis, offer retry option |
| **Redis Cache** | Bypass cache, query database directly (slower) |
| **Database** | Show error page, offer offline mode for viewing cached data |

```python
# app/services/degradation_service.py
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class DegradationService:
    """
    Manages graceful degradation when services fail.
    """

    # Maximum acceptable cache age for degraded mode
    MAX_CACHE_AGE = {
        'portfolio': timedelta(hours=4),
        'quotes': timedelta(minutes=30),
        'strategy': timedelta(days=1),
    }

    async def get_portfolio_with_fallback(
        self,
        user_id: str,
        etrade_service,
        cache_service
    ) -> Dict[str, Any]:
        """
        Get portfolio with graceful degradation.
        """
        try:
            # Try live data first
            portfolio = await circuit_breakers['etrade'].call(
                etrade_service.get_portfolio,
                user_id
            )
            await cache_service.set_portfolio(user_id, portfolio)
            return {
                'data': portfolio,
                'source': 'live',
                'as_of': datetime.utcnow().isoformat()
            }
        except (CircuitOpenError, ETradeAPIError) as e:
            # Fall back to cache
            cached = await cache_service.get_portfolio(user_id)
            if cached and self._is_cache_acceptable(cached, 'portfolio'):
                return {
                    'data': cached['data'],
                    'source': 'cached',
                    'as_of': cached['cached_at'],
                    'warning': 'Showing cached data. Live data temporarily unavailable.',
                    'stale': True
                }
            else:
                raise PortfolioUnavailableError(
                    "Portfolio data is unavailable. Please try again later."
                )

    async def get_ai_analysis_with_fallback(
        self,
        prompt: str,
        portfolio_data: Dict,
        gemini_service
    ) -> Dict[str, Any]:
        """
        Get AI analysis with graceful degradation.
        """
        try:
            analysis = await circuit_breakers['gemini'].call(
                gemini_service.analyze,
                prompt,
                portfolio_data
            )
            return {
                'analysis': analysis,
                'ai_available': True
            }
        except (CircuitOpenError, GeminiAPIError):
            # Return basic metrics without AI insight
            return {
                'analysis': None,
                'ai_available': False,
                'fallback_data': self._calculate_basic_metrics(portfolio_data),
                'message': 'AI analysis temporarily unavailable. Showing basic portfolio metrics.'
            }

    def _is_cache_acceptable(
        self,
        cached: Dict,
        cache_type: str
    ) -> bool:
        """Check if cached data is acceptable for degraded mode."""
        if not cached or 'cached_at' not in cached:
            return False

        cached_at = datetime.fromisoformat(cached['cached_at'])
        max_age = self.MAX_CACHE_AGE.get(cache_type, timedelta(hours=1))

        return datetime.utcnow() - cached_at < max_age

    def _calculate_basic_metrics(self, portfolio: Dict) -> Dict:
        """Calculate basic portfolio metrics without AI."""
        positions = portfolio.get('positions', [])
        return {
            'total_positions': len(positions),
            'total_value': sum(p.get('market_value', 0) for p in positions),
            'top_holdings': sorted(
                positions,
                key=lambda p: p.get('market_value', 0),
                reverse=True
            )[:5]
        }
```

### Fallback Response Templates

```python
# app/utils/fallback_responses.py

FALLBACK_RESPONSES = {
    'etrade_unavailable': {
        'title': 'E*TRADE Connection Issue',
        'message': 'We are unable to connect to E*TRADE at the moment. '
                   'Your cached portfolio data is shown below.',
        'actions': [
            {'label': 'Retry', 'action': 'retry'},
            {'label': 'View Cached Data', 'action': 'show_cached'},
        ],
        'severity': 'warning'
    },

    'gemini_unavailable': {
        'title': 'AI Analysis Unavailable',
        'message': 'Our AI analysis service is temporarily unavailable. '
                   'Basic portfolio data is still accessible.',
        'actions': [
            {'label': 'Retry Analysis', 'action': 'retry'},
            {'label': 'Continue Without AI', 'action': 'skip'},
        ],
        'severity': 'info'
    },

    'rate_limit_exceeded': {
        'title': 'Request Limit Reached',
        'message': 'You have made too many requests. Please wait before trying again.',
        'retry_after': 60,
        'actions': [],
        'severity': 'warning'
    },

    'session_expired': {
        'title': 'Session Expired',
        'message': 'Your E*TRADE session has expired. Please reconnect your account.',
        'actions': [
            {'label': 'Reconnect E*TRADE', 'action': 'oauth_reauth'},
        ],
        'severity': 'error'
    },

    'trade_rejected': {
        'title': 'Trade Could Not Be Submitted',
        'message': 'The trade was rejected. Please review the details below.',
        'actions': [
            {'label': 'Modify Trade', 'action': 'edit'},
            {'label': 'Cancel', 'action': 'cancel'},
        ],
        'severity': 'error'
    },
}
```

### Error Logging and Monitoring

```python
# app/utils/error_logging.py
import logging
import traceback
from typing import Dict, Any, Optional

class ErrorLogger:
    """
    Structured error logging for monitoring and alerting.
    """

    def log_error(
        self,
        error: Exception,
        context: Dict[str, Any],
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        severity: str = 'error'
    ):
        """
        Log error with full context for debugging.
        """
        error_data = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'traceback': traceback.format_exc(),
            'request_id': request_id,
            'user_id': user_id,
            'context': context,
            'severity': severity,
        }

        # Categorize error
        category = self._categorize_error(error)
        error_data['category'] = category

        # Log at appropriate level
        if severity == 'critical':
            logging.critical(error_data)
            self._trigger_alert(error_data)
        elif severity == 'error':
            logging.error(error_data)
        elif severity == 'warning':
            logging.warning(error_data)
        else:
            logging.info(error_data)

        return error_data

    def _categorize_error(self, error: Exception) -> str:
        """Categorize error for routing and alerting."""
        error_type = type(error).__name__

        if 'ETradeAPI' in error_type or 'OAuth' in error_type:
            return 'api'
        elif 'Gemini' in error_type or 'AI' in error_type:
            return 'api'
        elif 'Database' in error_type or 'SQL' in error_type:
            return 'system'
        elif 'Validation' in error_type or 'Parse' in error_type:
            return 'data'
        elif 'Permission' in error_type or 'Auth' in error_type:
            return 'authorization'
        else:
            return 'unknown'

    def _trigger_alert(self, error_data: Dict):
        """Trigger alert for critical errors."""
        # Integration with alerting service (PagerDuty, Opsgenie, etc.)
        pass
```

-----

## E*TRADE API Integration Specifications

### Rate Limiting

E*TRADE enforces rate limits to prevent API abuse. Exceeding limits results in HTTP 429 responses and potential temporary bans.

| Endpoint Category | Rate Limit | Window | Notes |
|-------------------|------------|--------|-------|
| Market Quotes | 4 requests/sec | Rolling | Per consumer key |
| Account Data | 2 requests/sec | Rolling | Portfolio, balances |
| Order Operations | 1 request/sec | Rolling | Preview, place, cancel |
| Transaction History | 1 request/sec | Rolling | Paginated calls count separately |

#### Rate Limiter Implementation

```python
# app/services/rate_limiter.py
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
from collections import deque

class RateLimiter:
    """
    Token bucket rate limiter for E*TRADE API calls.
    """

    LIMITS = {
        'quotes': {'rate': 4, 'per_seconds': 1},
        'accounts': {'rate': 2, 'per_seconds': 1},
        'orders': {'rate': 1, 'per_seconds': 1},
        'transactions': {'rate': 1, 'per_seconds': 1},
    }

    def __init__(self):
        self.windows: Dict[str, deque] = {
            category: deque() for category in self.LIMITS
        }
        self._locks: Dict[str, asyncio.Lock] = {
            category: asyncio.Lock() for category in self.LIMITS
        }

    async def acquire(self, category: str) -> bool:
        """
        Acquire permission to make an API call.
        Blocks until rate limit allows the request.

        Args:
            category: API category ('quotes', 'accounts', 'orders', 'transactions')

        Returns:
            True when request is allowed to proceed
        """
        if category not in self.LIMITS:
            category = 'accounts'  # Default to conservative limit

        config = self.LIMITS[category]
        window = self.windows[category]

        async with self._locks[category]:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=config['per_seconds'])

            # Remove timestamps outside the window
            while window and window[0] < window_start:
                window.popleft()

            # Check if we're at the limit
            if len(window) >= config['rate']:
                # Calculate wait time
                oldest = window[0]
                wait_seconds = (oldest - window_start).total_seconds()
                if wait_seconds > 0:
                    await asyncio.sleep(wait_seconds + 0.05)  # Small buffer

                # Clean up again after waiting
                now = datetime.utcnow()
                window_start = now - timedelta(seconds=config['per_seconds'])
                while window and window[0] < window_start:
                    window.popleft()

            # Record this request
            window.append(datetime.utcnow())
            return True

    async def get_wait_time(self, category: str) -> float:
        """Get estimated wait time before next request is allowed."""
        if category not in self.LIMITS:
            return 0

        config = self.LIMITS[category]
        window = self.windows[category]

        if len(window) < config['rate']:
            return 0

        oldest = window[0]
        window_start = datetime.utcnow() - timedelta(seconds=config['per_seconds'])
        wait = (oldest - window_start).total_seconds()
        return max(0, wait)


# Global rate limiter instance
rate_limiter = RateLimiter()


# Decorator for rate-limited functions
def rate_limited(category: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            await rate_limiter.acquire(category)
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

#### Usage Example

```python
class ETradeService:

    @rate_limited('quotes')
    async def get_quotes(self, symbols: list[str]) -> dict:
        """Get market quotes for symbols."""
        # E*TRADE allows up to 25 symbols per request
        if len(symbols) > 25:
            raise ValueError("Maximum 25 symbols per quote request")
        return await self._make_request('GET', f'/v1/market/quote/{",".join(symbols)}')

    @rate_limited('accounts')
    async def get_portfolio(self, account_id: str) -> dict:
        """Get portfolio for account."""
        return await self._make_request('GET', f'/v1/accounts/{account_id}/portfolio')

    @rate_limited('orders')
    async def preview_order(self, account_id: str, order: dict) -> dict:
        """Preview an order before placement."""
        return await self._make_request('POST', f'/v1/accounts/{account_id}/orders/preview', order)
```

### OAuth 1.0a Complete Flow

E*TRADE uses OAuth 1.0a with specific requirements for token management.

#### OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     E*TRADE OAuth 1.0a Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. REQUEST TOKEN                                                        │
│     POST /oauth/request_token                                            │
│     → Returns: oauth_token, oauth_token_secret                           │
│                                                                          │
│  2. USER AUTHORIZATION                                                   │
│     Redirect user to: https://us.etrade.com/e/t/etws/authorize           │
│     ?key={consumer_key}&token={oauth_token}                              │
│     → User logs in, approves access                                      │
│     → Returns: oauth_verifier (displayed to user or callback)            │
│                                                                          │
│  3. ACCESS TOKEN                                                         │
│     POST /oauth/access_token                                             │
│     With: oauth_verifier from step 2                                     │
│     → Returns: access_token, access_token_secret                         │
│                                                                          │
│  4. API CALLS                                                            │
│     All requests signed with access_token + access_token_secret          │
│                                                                          │
│  5. TOKEN REFRESH (Daily)                                                │
│     GET /oauth/renew_access_token                                        │
│     → Returns: refreshed access_token (same secret)                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Token Lifecycle

| Event | Timing | Action Required |
|-------|--------|-----------------|
| Token Created | After OAuth flow | Store encrypted |
| Daily Expiration | Midnight ET | Proactive refresh at 23:30 ET |
| Inactivity Timeout | 2 hours no activity | Refresh before next use |
| Token Revoked | User action on E*TRADE | Re-initiate OAuth flow |
| API Returns 401 | Any time | Attempt refresh, then re-auth |

#### Complete OAuth Implementation

```python
# app/services/etrade_oauth_service.py
import hashlib
import hmac
import base64
import time
import urllib.parse
from typing import Optional, Tuple, Dict
import httpx
import secrets as python_secrets

class ETradeOAuthService:
    """
    Complete E*TRADE OAuth 1.0a implementation.
    """

    SANDBOX_BASE_URL = "https://apisb.etrade.com"
    PRODUCTION_BASE_URL = "https://api.etrade.com"
    AUTH_BASE_URL = "https://us.etrade.com"

    def __init__(self, consumer_key: str, consumer_secret: str, sandbox: bool = True):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.base_url = self.SANDBOX_BASE_URL if sandbox else self.PRODUCTION_BASE_URL

    async def get_request_token(self, callback_url: str = "oob") -> Tuple[str, str]:
        """
        Step 1: Get request token.

        Args:
            callback_url: OAuth callback URL or "oob" for out-of-band

        Returns:
            Tuple of (oauth_token, oauth_token_secret)
        """
        url = f"{self.base_url}/oauth/request_token"

        oauth_params = {
            'oauth_consumer_key': self.consumer_key,
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_nonce': python_secrets.token_hex(16),
            'oauth_callback': callback_url,
            'oauth_version': '1.0',
        }

        # Sign request (no token secret yet)
        signature = self._generate_signature('POST', url, oauth_params, '')
        oauth_params['oauth_signature'] = signature

        headers = {'Authorization': self._build_auth_header(oauth_params)}

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()

        # Parse response: oauth_token=xxx&oauth_token_secret=yyy
        params = urllib.parse.parse_qs(response.text)
        return params['oauth_token'][0], params['oauth_token_secret'][0]

    def get_authorization_url(self, oauth_token: str) -> str:
        """
        Step 2: Generate URL for user authorization.

        Returns:
            URL to redirect user to for E*TRADE login and approval
        """
        return (
            f"{self.AUTH_BASE_URL}/e/t/etws/authorize"
            f"?key={self.consumer_key}&token={oauth_token}"
        )

    async def get_access_token(
        self,
        oauth_token: str,
        oauth_token_secret: str,
        oauth_verifier: str
    ) -> Tuple[str, str]:
        """
        Step 3: Exchange request token for access token.

        Args:
            oauth_token: Request token from step 1
            oauth_token_secret: Request token secret from step 1
            oauth_verifier: Verifier code from user authorization

        Returns:
            Tuple of (access_token, access_token_secret)
        """
        url = f"{self.base_url}/oauth/access_token"

        oauth_params = {
            'oauth_consumer_key': self.consumer_key,
            'oauth_token': oauth_token,
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_nonce': python_secrets.token_hex(16),
            'oauth_verifier': oauth_verifier,
            'oauth_version': '1.0',
        }

        signature = self._generate_signature('POST', url, oauth_params, oauth_token_secret)
        oauth_params['oauth_signature'] = signature

        headers = {'Authorization': self._build_auth_header(oauth_params)}

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()

        params = urllib.parse.parse_qs(response.text)
        return params['oauth_token'][0], params['oauth_token_secret'][0]

    async def renew_access_token(
        self,
        access_token: str,
        access_token_secret: str
    ) -> str:
        """
        Step 5: Renew access token before expiration.

        Note: Token secret remains the same after renewal.

        Returns:
            New access token (use with existing secret)
        """
        url = f"{self.base_url}/oauth/renew_access_token"

        oauth_params = {
            'oauth_consumer_key': self.consumer_key,
            'oauth_token': access_token,
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_nonce': python_secrets.token_hex(16),
            'oauth_version': '1.0',
        }

        signature = self._generate_signature('GET', url, oauth_params, access_token_secret)
        oauth_params['oauth_signature'] = signature

        headers = {'Authorization': self._build_auth_header(oauth_params)}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

        params = urllib.parse.parse_qs(response.text)
        return params['oauth_token'][0]

    async def revoke_access_token(
        self,
        access_token: str,
        access_token_secret: str
    ) -> bool:
        """
        Revoke access token (user disconnect).
        """
        url = f"{self.base_url}/oauth/revoke_access_token"

        oauth_params = {
            'oauth_consumer_key': self.consumer_key,
            'oauth_token': access_token,
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_nonce': python_secrets.token_hex(16),
            'oauth_version': '1.0',
        }

        signature = self._generate_signature('GET', url, oauth_params, access_token_secret)
        oauth_params['oauth_signature'] = signature

        headers = {'Authorization': self._build_auth_header(oauth_params)}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            return response.status_code == 200

    def _generate_signature(
        self,
        method: str,
        url: str,
        oauth_params: Dict[str, str],
        token_secret: str
    ) -> str:
        """Generate OAuth 1.0a HMAC-SHA1 signature."""
        # Sort and encode parameters
        sorted_params = sorted(oauth_params.items())
        param_string = urllib.parse.urlencode(sorted_params, quote_via=urllib.parse.quote)

        # Create signature base string
        base_string = '&'.join([
            method.upper(),
            urllib.parse.quote(url, safe=''),
            urllib.parse.quote(param_string, safe='')
        ])

        # Create signing key
        signing_key = f"{urllib.parse.quote(self.consumer_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"

        # Generate signature
        signature = hmac.new(
            signing_key.encode('utf-8'),
            base_string.encode('utf-8'),
            hashlib.sha1
        ).digest()

        return base64.b64encode(signature).decode('utf-8')

    def _build_auth_header(self, oauth_params: Dict[str, str]) -> str:
        """Build OAuth Authorization header."""
        auth_params = ', '.join([
            f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
            for k, v in sorted(oauth_params.items())
        ])
        return f'OAuth {auth_params}'
```

#### Proactive Token Refresh Scheduler

```python
# app/workers/token_refresh_scheduler.py
from datetime import datetime, time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

ET_TIMEZONE = pytz.timezone('America/New_York')

async def refresh_all_tokens():
    """
    Refresh all active E*TRADE tokens before midnight expiration.
    Runs at 11:30 PM ET daily.
    """
    active_users = await db.fetch_all("""
        SELECT user_id, access_token, access_token_secret
        FROM user_etrade_tokens
        WHERE is_active = TRUE
    """)

    for user in active_users:
        try:
            new_token = await oauth_service.renew_access_token(
                user['access_token'],
                user['access_token_secret']
            )

            await db.execute("""
                UPDATE user_etrade_tokens
                SET access_token = $1, refreshed_at = NOW()
                WHERE user_id = $2
            """, new_token, user['user_id'])

            await audit.log_authentication_event(
                action='token_refresh',
                user_id=user['user_id'],
                success=True,
                metadata={'trigger': 'scheduled'}
            )

        except Exception as e:
            await audit.log_authentication_event(
                action='token_refresh',
                user_id=user['user_id'],
                success=False,
                metadata={'error': str(e)}
            )
            # Mark token as needing re-auth
            await db.execute("""
                UPDATE user_etrade_tokens
                SET needs_reauth = TRUE
                WHERE user_id = $1
            """, user['user_id'])


# Schedule daily refresh at 11:30 PM ET
scheduler = AsyncIOScheduler()
scheduler.add_job(
    refresh_all_tokens,
    CronTrigger(hour=23, minute=30, timezone=ET_TIMEZONE),
    id='etrade_token_refresh',
    replace_existing=True
)
```

### API Request Signing

Every E*TRADE API request must be signed with OAuth credentials.

```python
# app/services/etrade_client.py
from typing import Optional, Dict, Any
import httpx

class ETradeClient:
    """
    Signed HTTP client for E*TRADE API requests.
    """

    def __init__(self, oauth_service: ETradeOAuthService):
        self.oauth = oauth_service
        self.timeout = httpx.Timeout(30.0, connect=10.0)

    async def request(
        self,
        method: str,
        endpoint: str,
        access_token: str,
        access_token_secret: str,
        params: Optional[Dict] = None,
        json_body: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to E*TRADE API.
        """
        url = f"{self.oauth.base_url}{endpoint}"

        # Build OAuth parameters
        oauth_params = {
            'oauth_consumer_key': self.oauth.consumer_key,
            'oauth_token': access_token,
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_timestamp': str(int(time.time())),
            'oauth_nonce': python_secrets.token_hex(16),
            'oauth_version': '1.0',
        }

        # Include query params in signature for GET requests
        sign_params = {**oauth_params}
        if params and method.upper() == 'GET':
            sign_params.update(params)

        signature = self.oauth._generate_signature(
            method, url, sign_params, access_token_secret
        )
        oauth_params['oauth_signature'] = signature

        headers = {
            'Authorization': self.oauth._build_auth_header(oauth_params),
            'Accept': 'application/json',
        }

        if json_body:
            headers['Content-Type'] = 'application/json'

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method,
                url,
                headers=headers,
                params=params,
                json=json_body
            )

            # Handle specific error codes
            if response.status_code == 401:
                raise ETradeAuthError("Token expired or invalid")
            elif response.status_code == 429:
                retry_after = response.headers.get('Retry-After', '60')
                raise ETradeRateLimitError(f"Rate limited. Retry after {retry_after}s")
            elif response.status_code >= 400:
                raise ETradeAPIError(f"API error: {response.status_code} - {response.text}")

            return response.json()
```

### API Fallback Behavior

When E*TRADE API is unavailable, the system degrades gracefully.

| Scenario | Detection | Fallback Behavior |
|----------|-----------|-------------------|
| API Timeout | No response in 30s | Retry once, then show cached data |
| Rate Limited | HTTP 429 | Queue request, notify user of delay |
| Auth Failed | HTTP 401 | Prompt user to reconnect E*TRADE |
| Service Down | HTTP 503 | Show cached data with staleness warning |
| Network Error | Connection refused | Retry with backoff, then cache fallback |

```python
# app/services/etrade_service.py

class ETradeService:
    """
    High-level E*TRADE service with fallback handling.
    """

    async def get_portfolio_safe(self, user_id: str, account_id: str) -> Dict:
        """
        Get portfolio with automatic fallback to cache.
        """
        try:
            # Check circuit breaker
            if circuit_breakers['etrade'].state == CircuitState.OPEN:
                return await self._get_cached_portfolio(user_id, account_id)

            # Attempt live fetch
            token = await self.token_service.get_valid_token(user_id)
            if not token:
                raise ETradeAuthError("No valid token")

            portfolio = await self.client.request(
                'GET',
                f'/v1/accounts/{account_id}/portfolio',
                token['access_token'],
                token['access_token_secret']
            )

            # Update cache
            await self.cache.set(
                f'portfolio:{user_id}:{account_id}',
                portfolio,
                ttl=60
            )

            return {
                'data': portfolio,
                'source': 'live',
                'timestamp': datetime.utcnow().isoformat()
            }

        except ETradeRateLimitError:
            # Return cache, queue refresh
            cached = await self._get_cached_portfolio(user_id, account_id)
            await self.queue_delayed_refresh(user_id, account_id, delay=60)
            return cached

        except ETradeAuthError:
            # Mark for re-auth, return cache if available
            await self.mark_needs_reauth(user_id)
            cached = await self._get_cached_portfolio(user_id, account_id)
            if cached:
                cached['auth_required'] = True
            return cached

        except (ETradeAPIError, httpx.TimeoutException) as e:
            # Record failure for circuit breaker
            circuit_breakers['etrade']._on_failure()
            return await self._get_cached_portfolio(user_id, account_id)

    async def _get_cached_portfolio(self, user_id: str, account_id: str) -> Dict:
        """Get cached portfolio with staleness metadata."""
        cached = await self.cache.get(f'portfolio:{user_id}:{account_id}')

        if not cached:
            raise PortfolioUnavailableError(
                "Portfolio unavailable. Please try again later."
            )

        return {
            'data': cached['data'],
            'source': 'cached',
            'timestamp': cached['cached_at'],
            'stale': True,
            'warning': 'Showing cached data. Live data temporarily unavailable.'
        }
```