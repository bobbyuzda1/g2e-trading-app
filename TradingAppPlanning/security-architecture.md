# G2E Security Architecture

## Overview

This document defines the security architecture for the G2E Trading Application. The system handles sensitive financial data and brokerage API credentials, requiring robust security controls at every layer.

---

## Security Principles

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimum access required for each component
3. **Zero Trust** - Verify every request, trust nothing by default
4. **Fail Secure** - System defaults to secure state on failures
5. **Audit Everything** - Comprehensive logging of security events

---

## Secrets Management

### Solution: HashiCorp Vault (Recommended) or AWS Secrets Manager

**Why Vault over environment variables:**
- Dynamic secret generation
- Automatic rotation
- Audit logging built-in
- Fine-grained access control
- Encryption in transit and at rest

### Secret Categories

| Category | Examples | Rotation Frequency |
|----------|----------|-------------------|
| API Keys | Gemini API key | 90 days |
| OAuth Credentials | E*TRADE consumer key/secret | 90 days |
| Database Credentials | PostgreSQL password | 30 days |
| JWT Signing Keys | HMAC secret / RSA private key | 30 days |
| Encryption Keys | AES-256 data encryption keys | Annual |
| Service Tokens | Redis password, SendGrid API | 90 days |

### Vault Integration

```python
# app/services/secrets_service.py
import hvac
from functools import lru_cache
from typing import Optional, Dict
import os

class SecretsService:
    """
    Manages secrets using HashiCorp Vault.
    Falls back to environment variables for local development.
    """

    def __init__(self):
        self.vault_addr = os.getenv('VAULT_ADDR')
        self.vault_token = os.getenv('VAULT_TOKEN')
        self.environment = os.getenv('ENVIRONMENT', 'development')

        if self.vault_addr and self.vault_token:
            self.client = hvac.Client(
                url=self.vault_addr,
                token=self.vault_token
            )
            self.use_vault = True
        else:
            self.client = None
            self.use_vault = False

    def get_secret(self, path: str, key: str) -> Optional[str]:
        """
        Retrieve a secret value.

        Args:
            path: Vault path (e.g., 'g2e/api-keys')
            key: Secret key within the path (e.g., 'gemini_api_key')

        Returns:
            Secret value or None if not found
        """
        if self.use_vault:
            return self._get_from_vault(path, key)
        else:
            return self._get_from_env(path, key)

    def _get_from_vault(self, path: str, key: str) -> Optional[str]:
        """Retrieve secret from Vault KV store."""
        try:
            secret = self.client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point='secret'
            )
            return secret['data']['data'].get(key)
        except Exception as e:
            # Log error but don't expose details
            logger.error(f"Vault secret retrieval failed: {path}/{key}")
            return None

    def _get_from_env(self, path: str, key: str) -> Optional[str]:
        """Fall back to environment variables for development."""
        env_key = f"{path.upper().replace('/', '_')}_{key.upper()}"
        return os.getenv(env_key)

    @lru_cache(maxsize=100)
    def get_cached_secret(self, path: str, key: str) -> Optional[str]:
        """
        Get secret with caching. Cache clears on rotation.
        Use for frequently accessed secrets.
        """
        return self.get_secret(path, key)

    def clear_cache(self):
        """Clear cached secrets after rotation."""
        self.get_cached_secret.cache_clear()


# Singleton instance
secrets = SecretsService()


# Convenience functions
def get_gemini_api_key() -> str:
    key = secrets.get_secret('g2e/api-keys', 'gemini_api_key')
    if not key:
        raise RuntimeError("Gemini API key not configured")
    return key


def get_etrade_credentials() -> Dict[str, str]:
    return {
        'consumer_key': secrets.get_secret('g2e/etrade', 'consumer_key'),
        'consumer_secret': secrets.get_secret('g2e/etrade', 'consumer_secret'),
    }


def get_jwt_secret() -> str:
    return secrets.get_secret('g2e/auth', 'jwt_secret')
```

### Vault Secret Structure

```
secret/
└── g2e/
    ├── api-keys/
    │   ├── gemini_api_key
    │   └── sendgrid_api_key
    ├── etrade/
    │   ├── consumer_key
    │   └── consumer_secret
    ├── database/
    │   ├── host
    │   ├── port
    │   ├── username
    │   ├── password
    │   └── database
    ├── redis/
    │   ├── host
    │   ├── port
    │   └── password
    ├── auth/
    │   ├── jwt_secret
    │   └── jwt_public_key
    └── encryption/
        ├── data_encryption_key
        └── backup_encryption_key
```

### Key Rotation Strategy

```python
# app/workers/key_rotation.py
from datetime import datetime, timedelta
import secrets as python_secrets

class KeyRotationService:
    """
    Automated key rotation for secrets.
    """

    ROTATION_SCHEDULE = {
        'jwt_secret': timedelta(days=30),
        'database_password': timedelta(days=30),
        'api_keys': timedelta(days=90),
        'encryption_keys': timedelta(days=365),
    }

    async def check_rotation_needed(self):
        """Check if any secrets need rotation."""
        for secret_type, max_age in self.ROTATION_SCHEDULE.items():
            last_rotation = await self._get_last_rotation(secret_type)
            if datetime.utcnow() - last_rotation > max_age:
                await self._trigger_rotation(secret_type)

    async def rotate_jwt_secret(self):
        """
        Rotate JWT signing key with grace period.
        Both old and new keys valid for 24 hours.
        """
        # Generate new secret
        new_secret = python_secrets.token_urlsafe(64)

        # Store as 'next' key
        await self.vault.write_secret(
            'g2e/auth',
            'jwt_secret_next',
            new_secret
        )

        # After 24h, promote next to current
        # (Handled by scheduled job)

    async def rotate_database_password(self):
        """
        Rotate database password.
        Requires coordinated update of database and application.
        """
        new_password = python_secrets.token_urlsafe(32)

        # 1. Create new database user with new password
        # 2. Update Vault with new credentials
        # 3. Application picks up new credentials on next connection
        # 4. Drop old database user after grace period

        await self._execute_rotation_plan('database', new_password)
```

---

## API Key Rotation

### E*TRADE OAuth Token Management

E*TRADE tokens have specific requirements:
- **Access tokens expire at midnight ET daily**
- **Tokens become inactive after 2 hours of no activity**

```python
# app/services/etrade_token_service.py
from datetime import datetime, time, timedelta
from typing import Optional
import pytz

class ETradeTokenService:
    """
    Secure management of E*TRADE OAuth tokens.
    Handles automatic refresh before expiration.
    """

    ET_TIMEZONE = pytz.timezone('America/New_York')
    TOKEN_REFRESH_TIME = time(23, 30)  # 11:30 PM ET
    INACTIVITY_TIMEOUT = timedelta(hours=2)

    def __init__(self, secrets_service, db):
        self.secrets = secrets_service
        self.db = db

    async def get_valid_token(self, user_id: str) -> Optional[dict]:
        """
        Get a valid OAuth token for the user.
        Refreshes if expired or about to expire.
        """
        token = await self._load_token(user_id)
        if not token:
            return None

        if self._needs_refresh(token):
            token = await self._refresh_token(user_id, token)

        # Update last activity time
        await self._update_activity(user_id)

        return token

    def _needs_refresh(self, token: dict) -> bool:
        """Check if token needs refresh."""
        now_et = datetime.now(self.ET_TIMEZONE)

        # Check if approaching midnight reset
        if now_et.time() >= self.TOKEN_REFRESH_TIME:
            return True

        # Check inactivity timeout
        last_activity = token.get('last_activity')
        if last_activity:
            if datetime.now() - last_activity > self.INACTIVITY_TIMEOUT:
                return True

        return False

    async def _refresh_token(self, user_id: str, current_token: dict) -> dict:
        """
        Refresh OAuth token with E*TRADE.
        """
        credentials = get_etrade_credentials()

        # Use E*TRADE's renew access token endpoint
        new_token = await self._call_etrade_renew(
            current_token['access_token'],
            current_token['access_token_secret'],
            credentials
        )

        # Store encrypted
        await self._store_token(user_id, new_token)

        # Log for audit
        await audit.log_authentication_event(
            action='token_refresh',
            user_id=user_id,
            success=True,
            metadata={'reason': 'proactive_refresh'}
        )

        return new_token

    async def _store_token(self, user_id: str, token: dict):
        """
        Store token with encryption.
        """
        encrypted_token = encrypt_data(
            json.dumps(token),
            key=self.secrets.get_secret('g2e/encryption', 'data_encryption_key')
        )

        await self.db.execute("""
            INSERT INTO user_tokens (user_id, token_data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET token_data = $2, updated_at = NOW()
        """, user_id, encrypted_token)

    async def _load_token(self, user_id: str) -> Optional[dict]:
        """Load and decrypt token."""
        result = await self.db.fetchone(
            "SELECT token_data FROM user_tokens WHERE user_id = $1",
            user_id
        )

        if not result:
            return None

        decrypted = decrypt_data(
            result['token_data'],
            key=self.secrets.get_secret('g2e/encryption', 'data_encryption_key')
        )

        return json.loads(decrypted)


# Scheduled job: Proactive token refresh at 11:30 PM ET
scheduler.add_job(
    refresh_all_active_tokens,
    CronTrigger(hour=23, minute=30, timezone=ET_TIMEZONE),
    id='etrade_token_refresh'
)
```

---

## Encryption Standards

### Data at Rest

| Data Type | Encryption | Key Management |
|-----------|------------|----------------|
| Database | AES-256 (PostgreSQL pgcrypto) | Vault-managed KEK |
| OAuth Tokens | AES-256-GCM | Vault-managed DEK |
| Backups | AES-256-GCM | Separate backup key |
| File Storage | AES-256 (cloud provider) | Cloud KMS |

### Data in Transit

| Connection | Protocol | Minimum Version |
|------------|----------|-----------------|
| Client to API | HTTPS/TLS | TLS 1.3 |
| API to Database | TLS | TLS 1.2 |
| API to Redis | TLS | TLS 1.2 |
| API to E*TRADE | HTTPS/TLS | TLS 1.2 |
| API to Gemini | HTTPS/TLS | TLS 1.2 |

### Encryption Implementation

```python
# app/utils/encryption.py
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os
import base64

class EncryptionService:
    """
    AES-256-GCM encryption for sensitive data.
    """

    def __init__(self, master_key: bytes):
        """
        Initialize with master key from Vault.
        Master key should be 32 bytes for AES-256.
        """
        if len(master_key) != 32:
            raise ValueError("Master key must be 32 bytes")
        self.aesgcm = AESGCM(master_key)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string.
        Returns base64-encoded ciphertext with nonce prepended.
        """
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        plaintext_bytes = plaintext.encode('utf-8')

        ciphertext = self.aesgcm.encrypt(nonce, plaintext_bytes, None)

        # Prepend nonce to ciphertext
        combined = nonce + ciphertext

        return base64.b64encode(combined).decode('ascii')

    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt base64-encoded ciphertext.
        """
        combined = base64.b64decode(encrypted)

        # Extract nonce and ciphertext
        nonce = combined[:12]
        ciphertext = combined[12:]

        plaintext_bytes = self.aesgcm.decrypt(nonce, ciphertext, None)

        return plaintext_bytes.decode('utf-8')


# Database field encryption
class EncryptedField:
    """
    SQLAlchemy-compatible encrypted field type.
    """

    def __init__(self, encryption_service: EncryptionService):
        self.crypto = encryption_service

    def process_bind_param(self, value, dialect):
        if value is not None:
            return self.crypto.encrypt(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return self.crypto.decrypt(value)
        return value
```

---

## Session Management

### JWT Configuration

```python
# app/auth/jwt_config.py
from datetime import timedelta

JWT_CONFIG = {
    # Access token - short-lived
    'access_token': {
        'algorithm': 'HS256',  # Or RS256 for asymmetric
        'expiration': timedelta(minutes=15),
        'issuer': 'g2e-trading',
        'audience': 'g2e-api',
    },

    # Refresh token - longer-lived
    'refresh_token': {
        'algorithm': 'HS256',
        'expiration': timedelta(days=7),
        'issuer': 'g2e-trading',
        'audience': 'g2e-api',
        'rotation': True,  # New refresh token on each use
    },

    # Security settings
    'security': {
        'require_exp': True,
        'require_iat': True,
        'verify_aud': True,
        'verify_iss': True,
        'leeway': timedelta(seconds=30),  # Clock skew tolerance
    }
}
```

### Token Refresh Rotation

```python
# app/auth/token_service.py
import jwt
from datetime import datetime, timedelta
from typing import Tuple, Optional
import secrets as python_secrets

class TokenService:
    """
    JWT token management with refresh token rotation.
    """

    def __init__(self, secrets_service, db):
        self.secrets = secrets_service
        self.db = db
        self.jwt_secret = secrets_service.get_secret('g2e/auth', 'jwt_secret')

    def create_token_pair(self, user_id: str, device_id: str) -> Tuple[str, str]:
        """
        Create access and refresh token pair.
        """
        now = datetime.utcnow()

        # Access token
        access_payload = {
            'sub': user_id,
            'iat': now,
            'exp': now + JWT_CONFIG['access_token']['expiration'],
            'iss': JWT_CONFIG['access_token']['issuer'],
            'aud': JWT_CONFIG['access_token']['audience'],
            'type': 'access',
        }
        access_token = jwt.encode(
            access_payload,
            self.jwt_secret,
            algorithm=JWT_CONFIG['access_token']['algorithm']
        )

        # Refresh token (stored in DB for rotation)
        refresh_token_id = python_secrets.token_urlsafe(32)
        refresh_payload = {
            'sub': user_id,
            'jti': refresh_token_id,
            'iat': now,
            'exp': now + JWT_CONFIG['refresh_token']['expiration'],
            'iss': JWT_CONFIG['refresh_token']['issuer'],
            'aud': JWT_CONFIG['refresh_token']['audience'],
            'type': 'refresh',
            'device_id': device_id,
        }
        refresh_token = jwt.encode(
            refresh_payload,
            self.jwt_secret,
            algorithm=JWT_CONFIG['refresh_token']['algorithm']
        )

        # Store refresh token for rotation tracking
        self._store_refresh_token(user_id, refresh_token_id, device_id)

        return access_token, refresh_token

    async def refresh_tokens(
        self,
        refresh_token: str,
        device_id: str
    ) -> Optional[Tuple[str, str]]:
        """
        Exchange refresh token for new token pair.
        Implements rotation - old refresh token is invalidated.
        """
        try:
            payload = jwt.decode(
                refresh_token,
                self.jwt_secret,
                algorithms=[JWT_CONFIG['refresh_token']['algorithm']],
                audience=JWT_CONFIG['refresh_token']['audience'],
                issuer=JWT_CONFIG['refresh_token']['issuer'],
            )
        except jwt.InvalidTokenError:
            return None

        # Verify token is still valid in DB
        token_id = payload['jti']
        stored_token = await self._get_refresh_token(token_id)

        if not stored_token or stored_token['revoked']:
            # Token reuse detected - possible theft
            # Revoke all tokens for this user
            await self._revoke_all_user_tokens(payload['sub'])
            await audit.log_authentication_event(
                action='token_reuse_detected',
                user_id=payload['sub'],
                success=False,
                metadata={'token_id': token_id, 'device_id': device_id}
            )
            return None

        # Device binding check
        if stored_token['device_id'] != device_id:
            await audit.log_authentication_event(
                action='device_mismatch',
                user_id=payload['sub'],
                success=False,
                metadata={
                    'expected_device': stored_token['device_id'],
                    'received_device': device_id
                }
            )
            return None

        # Revoke old refresh token
        await self._revoke_refresh_token(token_id)

        # Issue new token pair
        new_access, new_refresh = self.create_token_pair(
            payload['sub'],
            device_id
        )

        await audit.log_authentication_event(
            action='token_refresh',
            user_id=payload['sub'],
            success=True,
            metadata={'device_id': device_id}
        )

        return new_access, new_refresh

    async def _store_refresh_token(
        self,
        user_id: str,
        token_id: str,
        device_id: str
    ):
        await self.db.execute("""
            INSERT INTO refresh_tokens (id, user_id, device_id, created_at)
            VALUES ($1, $2, $3, NOW())
        """, token_id, user_id, device_id)

    async def _revoke_refresh_token(self, token_id: str):
        await self.db.execute("""
            UPDATE refresh_tokens
            SET revoked = TRUE, revoked_at = NOW()
            WHERE id = $1
        """, token_id)

    async def _revoke_all_user_tokens(self, user_id: str):
        await self.db.execute("""
            UPDATE refresh_tokens
            SET revoked = TRUE, revoked_at = NOW()
            WHERE user_id = $1 AND revoked = FALSE
        """, user_id)
```

---

## Two-Factor Authentication

### TOTP Implementation

```python
# app/auth/mfa_service.py
import pyotp
import qrcode
import io
import base64
from typing import Tuple

class MFAService:
    """
    Time-based One-Time Password (TOTP) MFA.
    """

    ISSUER = 'G2E Trading'

    def __init__(self, encryption_service):
        self.crypto = encryption_service

    def setup_totp(self, user_email: str) -> Tuple[str, str]:
        """
        Initialize TOTP for a user.

        Returns:
            Tuple of (encrypted_secret, qr_code_base64)
        """
        # Generate random secret
        secret = pyotp.random_base32()

        # Create TOTP URI for authenticator apps
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user_email,
            issuer_name=self.ISSUER
        )

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        # Encrypt secret for storage
        encrypted_secret = self.crypto.encrypt(secret)

        return encrypted_secret, qr_base64

    def verify_totp(self, encrypted_secret: str, code: str) -> bool:
        """
        Verify a TOTP code.
        """
        secret = self.crypto.decrypt(encrypted_secret)
        totp = pyotp.TOTP(secret)

        # Allow 1 window of clock drift
        return totp.verify(code, valid_window=1)

    def generate_backup_codes(self, count: int = 10) -> Tuple[list, list]:
        """
        Generate backup codes for MFA recovery.

        Returns:
            Tuple of (plaintext_codes, hashed_codes)
        """
        import secrets as python_secrets
        import hashlib

        plaintext_codes = []
        hashed_codes = []

        for _ in range(count):
            code = python_secrets.token_urlsafe(8)[:12]  # 12-char codes
            plaintext_codes.append(code)
            hashed_codes.append(
                hashlib.sha256(code.encode()).hexdigest()
            )

        return plaintext_codes, hashed_codes
```

### Database Schema for MFA

```sql
-- MFA configuration per user
CREATE TABLE user_mfa (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    totp_secret_encrypted TEXT,  -- Encrypted TOTP secret
    mfa_enabled BOOLEAN DEFAULT FALSE,
    backup_codes_hashed TEXT[],  -- Hashed backup codes
    backup_codes_remaining INTEGER DEFAULT 10,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- MFA verification attempts (rate limiting)
CREATE TABLE mfa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    success BOOLEAN NOT NULL,
    ip_address INET,
    attempt_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mfa_attempts_user_time
    ON mfa_attempts(user_id, attempt_at DESC);
```

---

## Security Headers and API Protection

### FastAPI Security Middleware

```python
# app/middleware/security.py
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    """

    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
    }

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        for header, value in self.SECURITY_HEADERS.items():
            response.headers[header] = value

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting per user and IP.
    """

    # Limits per minute
    LIMITS = {
        'default': 60,
        'auth': 10,  # Login attempts
        'trade': 30,  # Trade-related endpoints
        'ai': 20,    # AI analysis calls
    }

    async def dispatch(self, request: Request, call_next):
        # Determine limit category based on path
        category = self._get_category(request.url.path)
        limit = self.LIMITS.get(category, self.LIMITS['default'])

        # Check rate limit
        key = self._get_rate_key(request, category)
        current = await self.redis.incr(key)

        if current == 1:
            await self.redis.expire(key, 60)  # 1 minute window

        if current > limit:
            return Response(
                content='Rate limit exceeded',
                status_code=429,
                headers={'Retry-After': '60'}
            )

        response = await call_next(request)
        response.headers['X-RateLimit-Limit'] = str(limit)
        response.headers['X-RateLimit-Remaining'] = str(max(0, limit - current))

        return response
```

---

## Security Monitoring

### Alerting Thresholds

| Event | Threshold | Action |
|-------|-----------|--------|
| Failed logins (same user) | 5 in 15 min | Lock account, notify user |
| Failed logins (same IP) | 20 in 15 min | Block IP temporarily |
| MFA failures | 3 in 5 min | Require CAPTCHA |
| Token reuse detected | 1 | Revoke all tokens, notify user |
| Unusual API volume | 3x normal | Alert admin |
| After-hours trading requests | Any | Require MFA re-verification |

### Security Event Logging

```python
# Security events to monitor
SECURITY_EVENTS = {
    'auth.login_success': 'info',
    'auth.login_failure': 'warning',
    'auth.mfa_failure': 'warning',
    'auth.token_reuse': 'critical',
    'auth.account_locked': 'warning',
    'access.unauthorized': 'warning',
    'access.forbidden': 'warning',
    'rate.limit_exceeded': 'warning',
    'api.suspicious_pattern': 'warning',
    'data.export_large': 'info',
}
```

---

## Security Checklist

### Pre-Launch Security Tasks

- [ ] Configure Vault/Secrets Manager
- [ ] Generate and store all secrets in Vault
- [ ] Implement key rotation automation
- [ ] Configure TLS 1.3 for all connections
- [ ] Implement JWT with refresh rotation
- [ ] Set up MFA infrastructure
- [ ] Configure security headers
- [ ] Implement rate limiting
- [ ] Set up security event alerting
- [ ] Conduct security review of all endpoints
- [ ] Configure encrypted database connections
- [ ] Implement field-level encryption for tokens

### Ongoing Security Tasks

| Task | Frequency |
|------|-----------|
| Review access logs | Daily |
| Check for failed login patterns | Daily |
| Rotate JWT secrets | Monthly |
| Rotate database credentials | Monthly |
| Rotate API keys | Quarterly |
| Security dependency updates | Weekly |
| Penetration testing | Annually |
| Security audit | Annually |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-24 | Initial security architecture |
