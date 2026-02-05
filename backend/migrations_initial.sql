-- G2E Trading App - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Create enum types
CREATE TYPE brokerid AS ENUM ('etrade', 'alpaca', 'schwab', 'ibkr');
CREATE TYPE connectionstatus AS ENUM ('pending', 'active', 'expired', 'revoked', 'error');
CREATE TYPE strategysource AS ENUM ('manual', 'ai_generated', 'ai_refined');
CREATE TYPE messagerole AS ENUM ('user', 'assistant', 'system');
CREATE TYPE auditaction AS ENUM ('login', 'logout', 'broker_connect', 'broker_disconnect', 'token_refresh', 'order_preview', 'order_submit', 'order_cancel', 'order_modify', 'ai_recommendation', 'ai_analysis', 'strategy_change', 'plan_change', 'portfolio_view', 'account_view');
CREATE TYPE feedbacktype AS ENUM ('accept', 'reject', 'modify', 'question');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX ix_users_email ON users(email);

-- Brokerage connections table
CREATE TABLE brokerage_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker_id brokerid NOT NULL,
    status connectionstatus NOT NULL DEFAULT 'pending',
    token_secret_id VARCHAR(255),
    connected_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    nickname VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_brokerage_connections_user_id ON brokerage_connections(user_id);

-- Brokerage accounts table
CREATE TABLE brokerage_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES brokerage_connections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker_id brokerid NOT NULL,
    broker_account_id VARCHAR(100) NOT NULL,
    account_number_masked VARCHAR(20),
    account_type VARCHAR(30),
    account_name VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    include_in_aggregate BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_brokerage_accounts_user_id ON brokerage_accounts(user_id);

-- Trading strategies table
CREATE TABLE trading_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    source strategysource NOT NULL DEFAULT 'manual',
    config JSONB NOT NULL DEFAULT '{}',
    focus_config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX ix_trading_strategies_user_id ON trading_strategies(user_id);

-- Trading plans table
CREATE TABLE trading_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES trading_strategies(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    term_type VARCHAR(20) NOT NULL,
    objectives JSONB NOT NULL DEFAULT '{}',
    progress JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX ix_trading_plans_user_id ON trading_plans(user_id);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    context_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX ix_conversations_user_id ON conversations(user_id);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role messagerole NOT NULL,
    content TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    model VARCHAR(50),
    extra_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_messages_conversation_id ON messages(conversation_id);

-- Audit logs table (append-only for compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action auditaction NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    details JSONB,
    disclosure_shown TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at);

-- Recommendation feedback table
CREATE TABLE recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    recommendation_symbol VARCHAR(20) NOT NULL,
    recommendation_action VARCHAR(20) NOT NULL,
    recommendation_summary TEXT NOT NULL,
    feedback_type feedbacktype NOT NULL,
    user_reasoning TEXT,
    extracted_preferences JSONB,
    context_tags JSONB,
    original_position_size FLOAT,
    modified_position_size FLOAT,
    modification_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_recommendation_feedback_user_id ON recommendation_feedback(user_id);

-- User preference profiles table
CREATE TABLE user_preference_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    learned_risk_tolerance FLOAT NOT NULL DEFAULT 5.0,
    preferred_sectors JSONB NOT NULL DEFAULT '{}',
    avoided_sectors JSONB NOT NULL DEFAULT '{}',
    strategy_preferences JSONB NOT NULL DEFAULT '{}',
    avoided_patterns JSONB NOT NULL DEFAULT '[]',
    position_sizing_tendency VARCHAR(20) NOT NULL DEFAULT 'moderate',
    timing_preferences JSONB NOT NULL DEFAULT '{}',
    explicit_rules JSONB NOT NULL DEFAULT '[]',
    feedback_summary TEXT,
    total_feedback_count INTEGER NOT NULL DEFAULT 0,
    acceptance_rate FLOAT NOT NULL DEFAULT 0.0,
    modification_rate FLOAT NOT NULL DEFAULT 0.0,
    profile_confidence FLOAT NOT NULL DEFAULT 0.0,
    is_learning_mode BOOLEAN NOT NULL DEFAULT TRUE,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Explicit user rules table
CREATE TABLE explicit_user_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_text TEXT NOT NULL,
    parsed_rule JSONB,
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(20) NOT NULL DEFAULT 'user_stated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alembic version tracking (so alembic knows this migration ran)
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('001_initial');
