"""Initial database schema.

Revision ID: 001_initial
Revises:
Create Date: 2026-01-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE brokerid AS ENUM ('etrade', 'alpaca', 'schwab', 'ibkr')")
    op.execute("CREATE TYPE connectionstatus AS ENUM ('pending', 'active', 'expired', 'revoked', 'error')")
    op.execute("CREATE TYPE strategysource AS ENUM ('manual', 'ai_generated', 'ai_refined')")
    op.execute("CREATE TYPE messagerole AS ENUM ('user', 'assistant', 'system')")
    op.execute("CREATE TYPE auditaction AS ENUM ('login', 'logout', 'broker_connect', 'broker_disconnect', 'token_refresh', 'order_preview', 'order_submit', 'order_cancel', 'order_modify', 'ai_recommendation', 'ai_analysis', 'strategy_change', 'plan_change', 'portfolio_view', 'account_view')")
    op.execute("CREATE TYPE feedbacktype AS ENUM ('accept', 'reject', 'modify', 'question')")

    # Users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Brokerage connections table
    op.create_table(
        'brokerage_connections',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('broker_id', sa.Enum('etrade', 'alpaca', 'schwab', 'ibkr', name='brokerid', create_type=False), nullable=False),
        sa.Column('status', sa.Enum('pending', 'active', 'expired', 'revoked', 'error', name='connectionstatus', create_type=False), nullable=False, default='pending'),
        sa.Column('token_secret_id', sa.String(255), nullable=True),
        sa.Column('connected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, default=False),
        sa.Column('nickname', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Brokerage accounts table
    op.create_table(
        'brokerage_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('connection_id', UUID(as_uuid=True), sa.ForeignKey('brokerage_connections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('broker_id', sa.Enum('etrade', 'alpaca', 'schwab', 'ibkr', name='brokerid', create_type=False), nullable=False),
        sa.Column('broker_account_id', sa.String(100), nullable=False),
        sa.Column('account_number_masked', sa.String(20), nullable=True),
        sa.Column('account_type', sa.String(30), nullable=True),
        sa.Column('account_name', sa.String(100), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('include_in_aggregate', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Trading strategies table
    op.create_table(
        'trading_strategies',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source', sa.Enum('manual', 'ai_generated', 'ai_refined', name='strategysource', create_type=False), nullable=False, default='manual'),
        sa.Column('config', sa.JSON(), nullable=False, default={}),
        sa.Column('focus_config', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Trading plans table
    op.create_table(
        'trading_plans',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('strategy_id', UUID(as_uuid=True), sa.ForeignKey('trading_strategies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('term_type', sa.String(20), nullable=False),
        sa.Column('objectives', sa.JSON(), nullable=False, default={}),
        sa.Column('progress', sa.JSON(), nullable=False, default={}),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Conversations table
    op.create_table(
        'conversations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('context_snapshot', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Messages table
    op.create_table(
        'messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('user', 'assistant', 'system', name='messagerole', create_type=False), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('model', sa.String(50), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Audit logs table (append-only for compliance)
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.Enum('login', 'logout', 'broker_connect', 'broker_disconnect', 'token_refresh', 'order_preview', 'order_submit', 'order_cancel', 'order_modify', 'ai_recommendation', 'ai_analysis', 'strategy_change', 'plan_change', 'portfolio_view', 'account_view', name='auditaction', create_type=False), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('disclosure_shown', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Recommendation feedback table
    op.create_table(
        'recommendation_feedback',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('message_id', UUID(as_uuid=True), sa.ForeignKey('messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('recommendation_symbol', sa.String(20), nullable=False),
        sa.Column('recommendation_action', sa.String(20), nullable=False),
        sa.Column('recommendation_summary', sa.Text(), nullable=False),
        sa.Column('feedback_type', sa.Enum('accept', 'reject', 'modify', 'question', name='feedbacktype', create_type=False), nullable=False),
        sa.Column('user_reasoning', sa.Text(), nullable=True),
        sa.Column('extracted_preferences', sa.JSON(), nullable=True),
        sa.Column('context_tags', sa.JSON(), nullable=True),
        sa.Column('original_position_size', sa.Float(), nullable=True),
        sa.Column('modified_position_size', sa.Float(), nullable=True),
        sa.Column('modification_details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # User preference profiles table
    op.create_table(
        'user_preference_profiles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('learned_risk_tolerance', sa.Float(), nullable=False, default=5.0),
        sa.Column('preferred_sectors', sa.JSON(), nullable=False, default={}),
        sa.Column('avoided_sectors', sa.JSON(), nullable=False, default={}),
        sa.Column('strategy_preferences', sa.JSON(), nullable=False, default={}),
        sa.Column('avoided_patterns', sa.JSON(), nullable=False, default=[]),
        sa.Column('position_sizing_tendency', sa.String(20), nullable=False, default='moderate'),
        sa.Column('timing_preferences', sa.JSON(), nullable=False, default={}),
        sa.Column('explicit_rules', sa.JSON(), nullable=False, default=[]),
        sa.Column('feedback_summary', sa.Text(), nullable=True),
        sa.Column('total_feedback_count', sa.Integer(), nullable=False, default=0),
        sa.Column('acceptance_rate', sa.Float(), nullable=False, default=0.0),
        sa.Column('modification_rate', sa.Float(), nullable=False, default=0.0),
        sa.Column('profile_confidence', sa.Float(), nullable=False, default=0.0),
        sa.Column('is_learning_mode', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_paused', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Explicit user rules table
    op.create_table(
        'explicit_user_rules',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_text', sa.Text(), nullable=False),
        sa.Column('parsed_rule', sa.JSON(), nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('source', sa.String(20), nullable=False, default='user_stated'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create indexes
    op.create_index('ix_brokerage_connections_user_id', 'brokerage_connections', ['user_id'])
    op.create_index('ix_brokerage_accounts_user_id', 'brokerage_accounts', ['user_id'])
    op.create_index('ix_trading_strategies_user_id', 'trading_strategies', ['user_id'])
    op.create_index('ix_trading_plans_user_id', 'trading_plans', ['user_id'])
    op.create_index('ix_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_recommendation_feedback_user_id', 'recommendation_feedback', ['user_id'])


def downgrade() -> None:
    # Drop tables in reverse order of creation
    op.drop_table('explicit_user_rules')
    op.drop_table('user_preference_profiles')
    op.drop_table('recommendation_feedback')
    op.drop_table('audit_logs')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('trading_plans')
    op.drop_table('trading_strategies')
    op.drop_table('brokerage_accounts')
    op.drop_table('brokerage_connections')
    op.drop_table('users')

    # Drop enum types
    op.execute('DROP TYPE feedbacktype')
    op.execute('DROP TYPE auditaction')
    op.execute('DROP TYPE messagerole')
    op.execute('DROP TYPE strategysource')
    op.execute('DROP TYPE connectionstatus')
    op.execute('DROP TYPE brokerid')
