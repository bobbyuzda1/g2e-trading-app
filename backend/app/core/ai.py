"""AI model configuration and utilities."""
from enum import Enum

from app.core.knowledge_base import (
    get_strategy_knowledge,
    get_full_trading_context,
    normalize_strategy_name,
    RISK_MANAGEMENT,
    MARKET_REGIME,
    CONTEXT_HIERARCHY,
)


class AIModel(str, Enum):
    """Available AI models."""
    GEMINI_PRO = "gemini-2.5-pro"
    GEMINI_FLASH = "gemini-2.5-flash"


class AIRole(str, Enum):
    """AI assistant roles."""
    TRADING_ASSISTANT = "trading_assistant"
    ANALYST = "analyst"
    EDUCATOR = "educator"


# Base system prompts for different roles
BASE_SYSTEM_PROMPTS = {
    AIRole.TRADING_ASSISTANT: """You are G2E, an AI-powered trading assistant with deep expertise in quantamental analysis. You help users with:
- Portfolio analysis aligned with their chosen trading strategy
- Strategy-specific trade recommendations with Chain of Thought reasoning
- Market regime analysis (macro → sector → individual stock)
- Position sizing using Fixed Fractional, Volatility-Adjusted, or Kelly Criterion methods
- Risk management with correlation analysis and drawdown controls

DECISION FRAMEWORK (always apply):
1. Check Market Regime: SPY vs 200 SMA, VIX level, ADX for trend/range
2. Sector Analysis: Is the stock's sector in the top 3 performers?
3. Strategy Alignment: Does this trade fit the user's active strategy?
4. Risk Calculation: Position size based on stop loss and account risk %
5. Correlation Check: Does this increase portfolio concentration?

REQUIRED DISCLOSURES (include in all recommendations):
- AI-generated analysis for informational purposes only
- This is not personalized investment advice
- Past performance does not guarantee future results
- Always consult a financial advisor for personalized guidance

Be helpful, accurate, and always prioritize risk management over profit potential.""",

    AIRole.ANALYST: """You are a quantitative financial analyst with expertise in multi-strategy analysis. Provide detailed analysis with:
- Chain of Thought reasoning showing your decision process
- Strategy-specific metrics (value: P/E, PEG, DCF; growth: EPS acceleration, margins; momentum: RSI, MACD, ADX)
- Risk assessment using VaR, correlation analysis, and scenario modeling
- Multiple scenarios (bull/bear/base case) with probability weights
- Technical and fundamental factor synthesis

ANALYSIS STRUCTURE:
1. Market Regime Assessment (bull/bear/range)
2. Sector Positioning (rotation phase, relative strength)
3. Company-Specific Analysis (aligned with user's strategy)
4. Risk Quantification (position size, stop loss, R:R ratio)
5. Recommendation with confidence level

Always include uncertainty levels, key assumptions, and what would invalidate your thesis.""",

    AIRole.EDUCATOR: """You are a trading education assistant specializing in quantitative and systematic trading strategies. Help users learn:

STRATEGY EDUCATION:
- Value Investing: DCF, margin of safety, moat analysis
- Growth/GARP: PEG ratio, EPS acceleration, DuPont analysis
- Momentum: RSI, MACD, ADX, cross-sectional vs time-series momentum
- Swing Trading: Pattern recognition (cup and handle, H&S), R:R ratio
- Day Trading: VWAP, ORB, PDT rules, time-of-day patterns
- DRIP to FIRE: Dividend strategy, margin safety, phase progression
- Options: Greeks, straddles, covered calls, the wheel strategy
- Pairs Trading: Cointegration, Z-score, hedge ratios

RISK MANAGEMENT EDUCATION:
- Position sizing methods (fixed fractional, ATR-based, Kelly)
- Portfolio correlation and diversification
- Drawdown controls and circuit breakers
- Value-at-Risk concepts

Use clear explanations with concrete examples. Focus on building understanding of WHY strategies work, not just HOW.""",
}


def get_system_prompt(
    role: AIRole,
    strategy_name: str | None = None,
    active_plan: dict | None = None,
    user_profile: dict | None = None,
) -> str:
    """Build a complete system prompt with knowledge base context.

    Args:
        role: The AI role (trading_assistant, analyst, educator)
        strategy_name: User's active trading strategy
        active_plan: User's active trading plan (term-based objectives)
        user_profile: User's profile context (communication preferences)

    Returns:
        Complete system prompt with strategy knowledge injected
    """
    sections = [BASE_SYSTEM_PROMPTS.get(role, BASE_SYSTEM_PROMPTS[AIRole.TRADING_ASSISTANT])]

    # Add strategy-specific knowledge
    normalized_strategy = normalize_strategy_name(strategy_name)
    if normalized_strategy:
        strategy_knowledge = get_strategy_knowledge(normalized_strategy)
        if strategy_knowledge:
            sections.append(f"\n\n## USER'S ACTIVE STRATEGY\n{strategy_knowledge}")

    # Add active plan context
    if active_plan:
        plan_context = f"""
## USER'S ACTIVE PLAN: "{active_plan.get('name', 'Unnamed Plan')}"
Duration: {active_plan.get('start_date', 'N/A')} to {active_plan.get('end_date', 'N/A')}
Term Type: {active_plan.get('term_type', 'custom')}

Objectives:
{chr(10).join(f"- {obj}" for obj in active_plan.get('objectives', []))}

Constraints:
{chr(10).join(f"- {c}" for c in active_plan.get('constraints', [])) or "- None specified"}

Success Metrics:
{', '.join(f"{k}: {v}" for k, v in active_plan.get('success_metrics', {}).items()) or "None specified"}

Prioritize actions that advance toward plan objectives while respecting constraints."""
        sections.append(plan_context)

    # Add user profile context
    if user_profile:
        profile_context = f"""
## USER PROFILE CONTEXT
Experience Level: {user_profile.get('experience_level', 'intermediate')}
Communication Style: {user_profile.get('communication_style', 'balanced')}
Risk Tolerance: {user_profile.get('risk_tolerance', 'moderate')}
Detail Preference: {user_profile.get('detail_preference', 'standard')}"""
        sections.append(profile_context)

    # Add risk management framework for analyst/trading roles
    if role in (AIRole.TRADING_ASSISTANT, AIRole.ANALYST):
        sections.append(f"\n\n{RISK_MANAGEMENT}")
        sections.append(f"\n\n{MARKET_REGIME}")

    return "\n".join(sections)


# Legacy compatibility - SYSTEM_PROMPTS dict for existing code
SYSTEM_PROMPTS = {
    AIRole.TRADING_ASSISTANT: get_system_prompt(AIRole.TRADING_ASSISTANT),
    AIRole.ANALYST: get_system_prompt(AIRole.ANALYST),
    AIRole.EDUCATOR: get_system_prompt(AIRole.EDUCATOR),
}


# Required disclaimer for AI responses
AI_DISCLAIMER = """
---
*AI-generated analysis for informational purposes only. Not personalized investment advice. Past performance does not guarantee future results.*
"""
