"""Tests for Gemini service."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.core.ai import AIModel, AIRole, SYSTEM_PROMPTS, AI_DISCLAIMER


def test_ai_model_enum():
    """Test AI model enum values."""
    assert AIModel.GEMINI_PRO.value == "gemini-2.5-pro"
    assert AIModel.GEMINI_FLASH.value == "gemini-2.5-flash"


def test_ai_role_enum():
    """Test AI role enum values."""
    assert AIRole.TRADING_ASSISTANT.value == "trading_assistant"
    assert AIRole.ANALYST.value == "analyst"
    assert AIRole.EDUCATOR.value == "educator"


def test_system_prompts_exist():
    """Test all roles have system prompts."""
    assert AIRole.TRADING_ASSISTANT in SYSTEM_PROMPTS
    assert AIRole.ANALYST in SYSTEM_PROMPTS
    assert AIRole.EDUCATOR in SYSTEM_PROMPTS


def test_system_prompts_contain_key_info():
    """Test system prompts contain important information."""
    trading_prompt = SYSTEM_PROMPTS[AIRole.TRADING_ASSISTANT]
    assert "investment advice" in trading_prompt.lower()
    assert "risk" in trading_prompt.lower()


def test_ai_disclaimer_exists():
    """Test AI disclaimer is defined."""
    assert AI_DISCLAIMER is not None
    assert "AI-generated" in AI_DISCLAIMER
    assert "investment advice" in AI_DISCLAIMER.lower()
