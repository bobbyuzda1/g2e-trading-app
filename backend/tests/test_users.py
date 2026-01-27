"""Tests for user service."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.user import UserService
from app.schemas.user import UserUpdate


@pytest.fixture
def mock_db():
    """Create mock database session."""
    return AsyncMock()


@pytest.fixture
def user_service(mock_db):
    """Create user service with mock db."""
    return UserService(mock_db)


def test_user_service_initialization(mock_db):
    """Test user service initializes with database session."""
    service = UserService(mock_db)
    assert service.db == mock_db


@pytest.mark.asyncio
async def test_get_user_returns_none_when_not_found(user_service, mock_db):
    """Test get_user returns None for non-existent user."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await user_service.get_user(uuid4())

    assert result is None


@pytest.mark.asyncio
async def test_delete_user_returns_false_when_not_found(user_service, mock_db):
    """Test delete_user returns False for non-existent user."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await user_service.delete_user(uuid4())

    assert result is False
