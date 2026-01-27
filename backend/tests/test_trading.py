"""Tests for trading service."""
import pytest
from decimal import Decimal
from app.services.trading import OrderPreview
from app.brokers.models import OrderSide, OrderType


def test_order_preview_initialization():
    """Test OrderPreview creation."""
    preview = OrderPreview(
        symbol="AAPL",
        side=OrderSide.BUY,
        quantity=Decimal("10"),
        order_type=OrderType.MARKET,
        estimated_cost=Decimal("1500"),
        estimated_price=Decimal("150"),
        buying_power_impact=Decimal("-1500"),
        buying_power_after=Decimal("8500"),
        position_after=Decimal("10"),
        risk_assessment={"portfolio_concentration_percent": 15.0},
        warnings=[],
        can_execute=True,
    )

    assert preview.symbol == "AAPL"
    assert preview.can_execute is True
    assert preview.estimated_cost == Decimal("1500")


def test_order_preview_with_warnings():
    """Test OrderPreview with warnings prevents execution."""
    preview = OrderPreview(
        symbol="AAPL",
        side=OrderSide.BUY,
        quantity=Decimal("100"),
        order_type=OrderType.MARKET,
        estimated_cost=Decimal("15000"),
        estimated_price=Decimal("150"),
        buying_power_impact=Decimal("-15000"),
        buying_power_after=Decimal("-5000"),
        position_after=Decimal("100"),
        risk_assessment={},
        warnings=["Insufficient buying power"],
        can_execute=False,
    )

    assert preview.can_execute is False
    assert "Insufficient buying power" in preview.warnings
