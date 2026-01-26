"""Tests for strategy service."""
import pytest
from app.services.strategy import STRATEGY_KNOWLEDGE


def test_strategy_knowledge_exists():
    """Test strategy knowledge base is populated."""
    assert len(STRATEGY_KNOWLEDGE) > 0
    assert "value_investing" in STRATEGY_KNOWLEDGE
    assert "dividend_growth" in STRATEGY_KNOWLEDGE


def test_strategy_knowledge_has_required_fields():
    """Test each strategy has required fields."""
    for key, info in STRATEGY_KNOWLEDGE.items():
        assert "name" in info
        assert "description" in info
        assert "time_horizon" in info
        assert "risk_level" in info
