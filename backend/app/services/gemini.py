"""Google Gemini AI service."""
import json
from typing import AsyncGenerator

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.config import get_settings
from app.core.ai import AIModel, AIRole, SYSTEM_PROMPTS, AI_DISCLAIMER

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
    ) -> tuple[str, dict]:
        """Generate a response from Gemini.

        Returns:
            Tuple of (response_text, usage_metadata)
        """
        gemini_model = self._get_model(model)

        # Build the full prompt with system context
        system_prompt = SYSTEM_PROMPTS.get(role, SYSTEM_PROMPTS[AIRole.TRADING_ASSISTANT])

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
    ) -> AsyncGenerator[str, None]:
        """Stream a response from Gemini."""
        gemini_model = self._get_model(model)

        system_prompt = SYSTEM_PROMPTS.get(role, SYSTEM_PROMPTS[AIRole.TRADING_ASSISTANT])

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
    ) -> dict:
        """Analyze a portfolio and provide recommendations."""
        context = f"""
Portfolio Data:
{json.dumps(portfolio_data, indent=2, default=str)}

{f"Active Strategy: {strategy_name}" if strategy_name else "No active strategy selected."}

{f"User Preferences: {json.dumps(user_preferences, indent=2)}" if user_preferences else ""}
"""

        prompt = """Analyze this portfolio and provide:
1. Portfolio Overview (diversification, sector exposure, risk level)
2. Strengths and potential concerns
3. Alignment with strategy (if specified)
4. 2-3 specific recommendations with rationale
5. Risk considerations

Format the response clearly with headers."""

        response, usage = await self.generate(
            prompt=prompt,
            model=AIModel.GEMINI_PRO,
            role=AIRole.ANALYST,
            context=context,
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
    ) -> dict:
        """Analyze a potential trade."""
        context = f"""
Proposed Trade:
- Symbol: {symbol}
- Action: {side}
- Quantity: {quantity}

{f"Portfolio Context: {json.dumps(portfolio_context, indent=2, default=str)}" if portfolio_context else ""}
{f"Strategy: {strategy_name}" if strategy_name else ""}
"""

        prompt = """Evaluate this trade proposal:
1. Does it align with the strategy (if specified)?
2. Position sizing assessment
3. Risk/reward analysis
4. Potential concerns or alternatives
5. Overall recommendation (proceed/caution/reconsider)

Be specific and actionable."""

        response, usage = await self.generate(
            prompt=prompt,
            model=AIModel.GEMINI_PRO,
            role=AIRole.ANALYST,
            context=context,
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
