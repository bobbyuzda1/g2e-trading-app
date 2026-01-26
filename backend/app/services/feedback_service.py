"""Feedback learning service for personalized recommendations."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
import json

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import (
    RecommendationFeedback,
    UserPreferenceProfile,
    ExplicitUserRule,
    FeedbackType,
)
from app.services.gemini import GeminiService, get_gemini_service
from app.core.cache import CacheService


class FeedbackService:
    """Service for managing user feedback and preference learning."""

    def __init__(self, db: AsyncSession, cache: CacheService | None = None):
        self.db = db
        self.cache = cache
        self._gemini = get_gemini_service()

    async def record_feedback(
        self,
        user_id: UUID,
        recommendation_symbol: str,
        recommendation_action: str,
        recommendation_summary: str,
        feedback_type: FeedbackType,
        user_reasoning: str | None = None,
        conversation_id: UUID | None = None,
        message_id: UUID | None = None,
        context_tags: list[str] | None = None,
    ) -> RecommendationFeedback:
        """Record user feedback on a recommendation."""
        # Extract preferences from reasoning using AI if provided
        extracted_preferences = None
        if user_reasoning:
            extracted_preferences = await self._extract_preferences(
                feedback_type=feedback_type,
                reasoning=user_reasoning,
                symbol=recommendation_symbol,
                action=recommendation_action,
            )

        feedback = RecommendationFeedback(
            user_id=user_id,
            conversation_id=conversation_id,
            message_id=message_id,
            recommendation_symbol=recommendation_symbol,
            recommendation_action=recommendation_action,
            recommendation_summary=recommendation_summary,
            feedback_type=feedback_type,
            user_reasoning=user_reasoning,
            extracted_preferences=extracted_preferences,
            context_tags=context_tags or [],
        )

        self.db.add(feedback)
        await self.db.commit()
        await self.db.refresh(feedback)

        # Update user preference profile asynchronously
        await self._update_preference_profile(user_id)

        return feedback

    async def _extract_preferences(
        self,
        feedback_type: FeedbackType,
        reasoning: str,
        symbol: str,
        action: str,
    ) -> dict | None:
        """Use AI to extract implicit preferences from user reasoning."""
        if not reasoning or len(reasoning) < 10:
            return None

        prompt = f"""Analyze this user feedback and extract trading preferences.

Feedback Type: {feedback_type.value}
Symbol: {symbol}
Action: {action}
User's Reasoning: {reasoning}

Extract JSON with these fields (only include if clearly expressed):
- risk_preference: "conservative", "moderate", "aggressive", or null
- sector_preference: positive/negative sentiment about sector, or null
- position_size_preference: any mentioned preferences, or null
- timing_preference: any timing-related preferences, or null
- explicit_rule: if user states a clear rule ("I never...", "I always..."), or null

Return ONLY valid JSON."""

        try:
            response, _ = await self._gemini.generate(
                prompt=prompt,
                temperature=0.3,
                max_tokens=500,
            )
            # Parse JSON from response
            # Handle potential markdown code blocks
            text = response.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except Exception:
            return None

    async def _update_preference_profile(self, user_id: UUID) -> None:
        """Update user preference profile based on all feedback."""
        # Get existing profile or create new one
        stmt = select(UserPreferenceProfile).where(
            UserPreferenceProfile.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()

        if not profile:
            profile = UserPreferenceProfile(user_id=user_id)
            self.db.add(profile)

        # Get all feedback for analysis
        feedback_stmt = select(RecommendationFeedback).where(
            RecommendationFeedback.user_id == user_id,
        ).order_by(RecommendationFeedback.created_at.desc()).limit(100)

        feedback_result = await self.db.execute(feedback_stmt)
        all_feedback = list(feedback_result.scalars().all())

        if not all_feedback:
            await self.db.commit()
            return

        # Calculate acceptance rate
        total = len(all_feedback)
        accepted = sum(1 for f in all_feedback if f.feedback_type == FeedbackType.ACCEPT)
        profile.total_feedback_count = total
        profile.acceptance_rate = accepted / total * 100 if total > 0 else 0.0

        # Aggregate extracted preferences
        preferred_sectors: dict[str, float] = {}
        avoided_sectors: dict[str, str] = {}
        avoided_patterns: list[str] = []

        for feedback in all_feedback:
            if feedback.extracted_preferences:
                prefs = feedback.extracted_preferences

                if prefs.get("sector_preference"):
                    sector_pref = prefs["sector_preference"]
                    if isinstance(sector_pref, dict):
                        sector = sector_pref.get("sector", "")
                        if sector_pref.get("sentiment") == "positive" and sector:
                            preferred_sectors[sector] = preferred_sectors.get(sector, 0) + 0.1
                        elif sector_pref.get("sentiment") == "negative" and sector:
                            reason = sector_pref.get("reason", "user preference")
                            avoided_sectors[sector] = reason

                if prefs.get("explicit_rule") and feedback.feedback_type == FeedbackType.REJECT:
                    avoided_patterns.append(prefs["explicit_rule"])

        # Update profile with aggregated data
        if preferred_sectors:
            profile.preferred_sectors = dict(sorted(
                preferred_sectors.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10])

        if avoided_sectors:
            profile.avoided_sectors = dict(list(avoided_sectors.items())[:10])

        if avoided_patterns:
            profile.avoided_patterns = list(set(avoided_patterns))[:10]

        # Calculate confidence based on feedback count
        if total >= 50:
            profile.profile_confidence = 0.9
        elif total >= 20:
            profile.profile_confidence = 0.7
        elif total >= 10:
            profile.profile_confidence = 0.5
        else:
            profile.profile_confidence = 0.3

        # Update learning mode
        profile.is_learning_mode = total < 10

        await self.db.commit()

    async def get_preference_profile(self, user_id: UUID) -> UserPreferenceProfile | None:
        """Get user preference profile."""
        stmt = select(UserPreferenceProfile).where(
            UserPreferenceProfile.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_ai_context(self, user_id: UUID) -> str:
        """Generate AI context string from user preferences and rules."""
        profile = await self.get_preference_profile(user_id)
        rules = await self.list_rules(user_id, active_only=True)

        context_parts = []

        if profile:
            if profile.learned_risk_tolerance:
                context_parts.append(f"Risk Tolerance: {profile.learned_risk_tolerance}/10")

            if profile.preferred_sectors:
                sectors = ", ".join(profile.preferred_sectors.keys())
                context_parts.append(f"Preferred Sectors: {sectors}")

            if profile.avoided_sectors:
                avoided = ", ".join(f"{k} ({v})" for k, v in profile.avoided_sectors.items())
                context_parts.append(f"Avoid Sectors: {avoided}")

            if profile.avoided_patterns:
                context_parts.append(f"Avoid Patterns: {', '.join(profile.avoided_patterns)}")

            if profile.position_sizing_tendency:
                context_parts.append(f"Position Sizing: {profile.position_sizing_tendency}")

        if rules:
            context_parts.append("User Rules:")
            for rule in rules:
                context_parts.append(f"  - {rule.rule_text}")

        return "\n".join(context_parts) if context_parts else ""

    async def get_feedback_history(
        self,
        user_id: UUID,
        limit: int = 20,
        feedback_type: FeedbackType | None = None,
    ) -> list[RecommendationFeedback]:
        """Get user's feedback history."""
        stmt = select(RecommendationFeedback).where(
            RecommendationFeedback.user_id == user_id,
        )
        if feedback_type:
            stmt = stmt.where(RecommendationFeedback.feedback_type == feedback_type)

        stmt = stmt.order_by(RecommendationFeedback.created_at.desc()).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # Explicit Rules Management
    async def add_rule(
        self,
        user_id: UUID,
        rule_text: str,
        category: str,
    ) -> ExplicitUserRule:
        """Add an explicit user rule."""
        rule = ExplicitUserRule(
            user_id=user_id,
            rule_text=rule_text,
            category=category,
            source="user",
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def list_rules(
        self,
        user_id: UUID,
        active_only: bool = True,
    ) -> list[ExplicitUserRule]:
        """List user's explicit rules."""
        stmt = select(ExplicitUserRule).where(
            ExplicitUserRule.user_id == user_id,
        )
        if active_only:
            stmt = stmt.where(ExplicitUserRule.is_active == True)  # noqa: E712

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_rule(
        self,
        rule_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Delete a rule (soft delete by deactivating)."""
        stmt = select(ExplicitUserRule).where(
            ExplicitUserRule.id == rule_id,
            ExplicitUserRule.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        rule = result.scalar_one_or_none()

        if not rule:
            return False

        rule.is_active = False
        await self.db.commit()
        return True

    async def export_profile(self, user_id: UUID) -> dict:
        """Export user profile for privacy compliance."""
        profile = await self.get_preference_profile(user_id)
        rules = await self.list_rules(user_id, active_only=False)
        feedback = await self.get_feedback_history(user_id, limit=1000)

        return {
            "profile": {
                "risk_tolerance": profile.learned_risk_tolerance if profile else None,
                "preferred_sectors": profile.preferred_sectors if profile else {},
                "avoided_sectors": profile.avoided_sectors if profile else {},
                "feedback_count": profile.total_feedback_count if profile else 0,
            } if profile else None,
            "rules": [
                {
                    "rule": r.rule_text,
                    "category": r.category,
                    "active": r.is_active,
                }
                for r in rules
            ],
            "feedback_count": len(feedback),
        }
