"""Tests for conversation service."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4


def test_conversation_service_imports():
    """Test conversation service can be imported."""
    from app.services.conversation import ConversationService
    assert ConversationService is not None


def test_message_role_values():
    """Test MessageRole enum values."""
    from app.models.conversation import MessageRole
    assert MessageRole.USER.value == "user"
    assert MessageRole.ASSISTANT.value == "assistant"
    assert MessageRole.SYSTEM.value == "system"
