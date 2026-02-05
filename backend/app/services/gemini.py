"""Google Gemini AI service."""
import json
from typing import AsyncGenerator

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.config import get_settings
from app.core.ai import AIModel, AIRole, get_system_prompt, AI_DISCLAIMER

settings = get_settings()


class GeminiService:
    """Service for interacting with Google Gemini AI."""

    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self._models: dict[str, genai.GenerativeModel] = {}

    def _get_model(self, model: AIModel) -> genai.GenerativeModel:
        """Get or create a Gemini model instance."""
        if model.value not in self._models:
            self._models[model.value] = genai.GenerativeModel(model.value)
        return self._models[model.value]

    async def generate(
        self,
        prompt: str,
        model: AIModel = AIModel.GEMINI_PRO,
        role: AIRole = AIRole.TRADING_ASSISTANT,
        context: str | None = None,
        history: list[dict] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        strategy_name: str | None = None,
        active_plan: dict | None = None,
        user_profile: dict | None = None,
    ) -> tuple[str, dict]:
        """Generate a response from Gemini.

        Args:
            prompt: The user's message/query
            model: Which Gemini model to use (Pro for complex, Flash for fast)
            role: AI role determining base behavior
            context: Additional context (portfolio data, etc.)
            history: Conversation history for multi-turn chat
            temperature: Response creativity (0.0-1.0)
            max_tokens: Maximum response length
            strategy_name: User's active trading strategy for knowledge injection
            active_plan: User's term-based trading plan
            user_profile: User's communication preferences

        Returns:
            Tuple of (response_text, usage_metadata)
        """
        gemini_model = self._get_model(model)

        # Build the full prompt with strategy-aware system context
        system_prompt = get_system_prompt(
            role=role,
            strategy_name=strategy_name,
            active_plan=active_plan,
            user_profile=user_profile,
        )

        full_context = [system_prompt]
        if context:
            full_context.append(f"\nContext:\n{context}")

        # Convert history to Gemini format
        chat_history = []
        if history:
            for msg in history:
                role_name = "user" if msg.get("role") == "user" else "model"
                chat_history.append({
                    "role": role_name,
                    "parts": [msg.get("content", "")]
                })

        # Create chat session
        chat = gemini_model.start_chat(history=chat_history)

        # Generation config
        config = GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        # Generate response
        response = await chat.send_message_async(
            "\n".join(full_context) + "\n\nUser: " + prompt,
            generation_config=config,
        )

        # Extract usage metadata
        usage = {
            "input_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
            "output_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
            "model": model.value,
        }

        return response.text, usage

    async def generate_stream(
        self,
        prompt: str,
        model: AIModel = AIModel.GEMINI_FLASH,
        role: AIRole = AIRole.TRADING_ASSISTANT,
        context: str | None = None,
        history: list[dict] | None = None,
        temperature: float = 0.7,
        strategy_name: str | None = None,
        active_plan: dict | None = None,
        user_profile: dict | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a response from Gemini with strategy-aware context."""
        gemini_model = self._get_model(model)

        system_prompt = get_system_prompt(
            role=role,
            strategy_name=strategy_name,
            active_plan=active_plan,
            user_profile=user_profile,
        )

        full_context = [system_prompt]
        if context:
            full_context.append(f"\nContext:\n{context}")

        chat_history = []
        if history:
            for msg in history:
                role_name = "user" if msg.get("role") == "user" else "model"
                chat_history.append({
                    "role": role_name,
                    "parts": [msg.get("content", "")]
                })

        chat = gemini_model.start_chat(history=chat_history)

        response = await chat.send_message_async(
            "\n".join(full_context) + "\n\nUser: " + prompt,
            stream=True,
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text

    async def analyze_portfolio(
        self,
        portfolio_data: dict,
        strategy_name: str | None = None,
        user_preferences: dict | None = None,
        active_plan: dict | None = None,
    ) -> dict:
        """Analyze a portfolio with strategy-specific knowledge.

        The AI will use the knowledge base protocols for the specified strategy
        to provide more targeted, actionable analysis.
        """
        context = f"""
Portfolio Data:
{json.dumps(portfolio_data, indent=2, default=str)}

{f"Active Strategy: {strategy_name}" if strategy_name else "No active strategy selected."}

{f"User Preferences: {json.dumps(user_preferences, indent=2)}" if user_preferences else ""}
"""

        prompt = """Analyze this portfolio using the Chain of Thought framework:

1. **Market Regime Check**: Assess current macro environment (bull/bear/range)
2. **Portfolio Overview**: Diversification, sector exposure, correlation analysis
3. **Strategy Alignment**: How well does the portfolio match the active strategy?
4. **Risk Assessment**: VaR estimate, concentration risks, drawdown potential
5. **Recommendations**: 2-3 specific, actionable recommendations with position sizing guidance
6. **Risk Considerations**: Key risks and what would invalidate the analysis

Format with clear headers. Be specific and include quantitative reasoning where possible."""

        response, usage = await self.generate(
            prompt=prompt,
            model=AIModel.GEMINI_PRO,
            role=AIRole.ANALYST,
            context=context,
            strategy_name=strategy_name,
            active_plan=active_plan,
            user_profile=user_preferences,
        )

        return {
            "analysis": response + AI_DISCLAIMER,
            "usage": usage,
        }

    async def analyze_trade(
        self,
        symbol: str,
        side: str,
        quantity: str,
        portfolio_context: dict | None = None,
        strategy_name: str | None = None,
        active_plan: dict | None = None,
        user_profile: dict | None = None,
    ) -> dict:
        """Analyze a potential trade using strategy-specific decision logic.

        The AI applies the sequential decision logic from the knowledge base
        for the user's active strategy.
        """
        context = f"""
Proposed Trade:
- Symbol: {symbol}
- Action: {side}
- Quantity: {quantity}

{f"Portfolio Context: {json.dumps(portfolio_context, indent=2, default=str)}" if portfolio_context else ""}
"""

        prompt = f"""Evaluate this trade proposal using the Sequential Decision Framework:

1. **Market Regime Check**: Is macro environment favorable for this trade type?
2. **Sector Analysis**: Is {symbol}'s sector in the top performers?
3. **Strategy Alignment**: Does this trade fit the {strategy_name or 'general'} strategy criteria?
4. **Position Sizing**: Is the quantity appropriate for account risk limits?
5. **Correlation Check**: Does this increase portfolio concentration?
6. **Event Risk**: Any earnings/Fed announcements within 3 days?
7. **Technical Timing**: Is this the right entry point?
8. **Risk/Reward Assessment**: Calculate R:R ratio with stop loss and target

**Final Recommendation**: PROCEED / CAUTION / RECONSIDER with specific reasoning.

Be specific and actionable. Include suggested stop loss and target levels."""

        response, usage = await self.generate(
            prompt=prompt,
            model=AIModel.GEMINI_PRO,
            role=AIRole.ANALYST,
            context=context,
            strategy_name=strategy_name,
            active_plan=active_plan,
            user_profile=user_profile,
        )

        return {
            "analysis": response + AI_DISCLAIMER,
            "usage": usage,
        }

    async def explain_concept(self, concept: str) -> dict:
        """Explain a trading/investing concept."""
        prompt = f"""Explain the following trading/investing concept in clear, educational terms:

{concept}

Include:
1. Simple definition
2. How it works in practice
3. A real-world example
4. Key considerations for traders/investors
5. Common mistakes to avoid"""

        response, usage = await self.generate(
            prompt=prompt,
            model=AIModel.GEMINI_FLASH,
            role=AIRole.EDUCATOR,
            temperature=0.5,
        )

        return {
            "explanation": response,
            "usage": usage,
        }


# Global service instance
_gemini_service: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    """Get or create the Gemini service instance."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
