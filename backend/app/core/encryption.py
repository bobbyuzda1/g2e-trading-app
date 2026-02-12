"""Simple encryption for broker API credentials using Fernet (AES-128-CBC)."""
import base64
import hashlib
from cryptography.fernet import Fernet

from app.config import get_settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from the app's SECRET_KEY."""
    settings = get_settings()
    key = hashlib.sha256(settings.secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns base64-encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext back to plaintext."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
