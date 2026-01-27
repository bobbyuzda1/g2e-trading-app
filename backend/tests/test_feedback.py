"""Tests for feedback service."""
import pytest
from app.models.feedback import FeedbackType


def test_feedback_type_values():
    """Test FeedbackType enum values."""
    assert FeedbackType.ACCEPT.value == "accept"
    assert FeedbackType.REJECT.value == "reject"
    assert FeedbackType.MODIFY.value == "modify"
    assert FeedbackType.QUESTION.value == "question"


def test_feedback_service_imports():
    """Test feedback service can be imported."""
    from app.services.feedback_service import FeedbackService
    assert FeedbackService is not None


def test_feedback_schemas_imports():
    """Test feedback schemas can be imported."""
    from app.schemas.feedback import (
        FeedbackCreate,
        FeedbackResponse,
        UserRuleCreate,
        UserRuleResponse,
        UserPreferenceProfileResponse,
        FeedbackContextResponse,
    )
    assert FeedbackCreate is not None
    assert FeedbackResponse is not None
    assert UserRuleCreate is not None
    assert UserRuleResponse is not None
    assert UserPreferenceProfileResponse is not None
    assert FeedbackContextResponse is not None


def test_feedback_create_schema():
    """Test FeedbackCreate schema validation."""
    from app.schemas.feedback import FeedbackCreate

    feedback = FeedbackCreate(
        recommendation_symbol="AAPL",
        recommendation_action="BUY",
        recommendation_summary="Buy AAPL for growth potential",
        feedback_type=FeedbackType.ACCEPT,
        user_reasoning="I like the company fundamentals",
        context_tags=["tech", "growth"],
    )

    assert feedback.recommendation_symbol == "AAPL"
    assert feedback.recommendation_action == "BUY"
    assert feedback.feedback_type == FeedbackType.ACCEPT
    assert len(feedback.context_tags) == 2


def test_user_rule_create_schema():
    """Test UserRuleCreate schema validation."""
    from app.schemas.feedback import UserRuleCreate

    rule = UserRuleCreate(
        rule_text="Never buy stocks within 2 weeks of earnings",
        category="timing",
    )

    assert rule.rule_text == "Never buy stocks within 2 weeks of earnings"
    assert rule.category == "timing"
