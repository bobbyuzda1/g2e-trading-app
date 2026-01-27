"""Tests for E*TRADE broker adapter."""
import pytest
from app.brokers.etrade import ETradeAdapter, ETradeTokenSet
from app.models.brokerage import BrokerId


@pytest.fixture
def etrade_adapter():
    return ETradeAdapter(
        consumer_key="test_consumer_key",
        consumer_secret="test_consumer_secret",
        sandbox=True,
    )


def test_etrade_broker_id(etrade_adapter):
    assert etrade_adapter.broker_id == BrokerId.ETRADE


def test_etrade_broker_name_sandbox(etrade_adapter):
    assert "Sandbox" in etrade_adapter.broker_name


def test_etrade_features_no_crypto(etrade_adapter):
    assert etrade_adapter.features.crypto_trading is False
    assert etrade_adapter.features.stock_trading is True
    assert etrade_adapter.features.options_trading is True


def test_etrade_features_requires_reauth(etrade_adapter):
    assert etrade_adapter.features.requires_manual_reauth is True


def test_etrade_sandbox_base_url(etrade_adapter):
    assert "apisb.etrade.com" in etrade_adapter._base_url


def test_etrade_prod_base_url():
    adapter = ETradeAdapter(
        consumer_key="key",
        consumer_secret="secret",
        sandbox=False,
    )
    assert "api.etrade.com" in adapter._base_url
    assert "apisb" not in adapter._base_url


def test_etrade_authorize_url(etrade_adapter):
    url = etrade_adapter._build_authorize_url("test_token")
    assert "us.etrade.com" in url
    assert "authorize" in url
    assert "test_token" in url


def test_etrade_token_set():
    tokens = ETradeTokenSet(
        access_token="access",
        access_token_secret="secret",
        refresh_token="refresh",
        expires_at=3600,
    )
    assert tokens.access_token == "access"
    assert tokens.access_token_secret == "secret"
