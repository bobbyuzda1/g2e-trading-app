"""Tests for portfolio service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from uuid import uuid4

from app.services.portfolio import PortfolioService, PortfolioSummary


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def portfolio_service(mock_db):
    return PortfolioService(mock_db)


def test_portfolio_summary_initialization():
    """Test PortfolioSummary dataclass."""
    from datetime import datetime, timezone

    summary = PortfolioSummary(
        total_value=Decimal("10000"),
        total_cash=Decimal("5000"),
        total_buying_power=Decimal("15000"),
        total_positions=5,
        total_unrealized_pl=Decimal("500"),
        total_unrealized_pl_percent=Decimal("5.0"),
        by_broker={},
        last_updated=datetime.now(timezone.utc),
    )

    assert summary.total_value == Decimal("10000")
    assert summary.total_positions == 5


@pytest.mark.asyncio
async def test_get_all_positions_empty_when_no_connections(portfolio_service, mock_db):
    """Test get_all_positions returns empty list with no connections."""
    with patch.object(portfolio_service._brokerage_service, 'get_connections', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []

        positions = await portfolio_service.get_all_positions(uuid4())

        assert positions == []
