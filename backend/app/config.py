"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "G2E Trading App"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    frontend_url: str = ""  # For CORS - set to Firebase hosting URL in production

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/g2e"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model_pro: str = "gemini-2.5-pro"
    gemini_model_flash: str = "gemini-2.5-flash"

    # E*TRADE (OAuth 1.0a)
    etrade_consumer_key: str = ""
    etrade_consumer_secret: str = ""
    etrade_sandbox: bool = True

    # Alpaca (OAuth 2.0)
    alpaca_client_id: str = ""
    alpaca_client_secret: str = ""
    alpaca_paper: bool = True

    # Schwab (OAuth 2.0)
    schwab_client_id: str = ""
    schwab_client_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
