"""Tests for authentication."""
import pytest
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token


def test_password_hashing():
    """Test password hashing and verification."""
    password = "testpassword123"
    hashed = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_token():
    """Test JWT token creation and decoding."""
    data = {"sub": "user123", "email": "test@example.com"}
    token = create_access_token(data)

    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user123"
    assert decoded["email"] == "test@example.com"


def test_decode_invalid_token():
    """Test decoding invalid token returns None."""
    result = decode_token("invalid.token.here")
    assert result is None
