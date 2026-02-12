-- Migration: Add user_broker_credentials table
-- Allows each user to store their own encrypted broker API keys

CREATE TABLE IF NOT EXISTS user_broker_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker_id brokerid NOT NULL,
    encrypted_key TEXT NOT NULL,
    encrypted_secret TEXT NOT NULL,
    is_sandbox BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_broker_credential UNIQUE (user_id, broker_id)
);

CREATE INDEX ix_user_broker_credentials_user_id ON user_broker_credentials(user_id);
