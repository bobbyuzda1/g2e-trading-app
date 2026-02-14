// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

// Auth types
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Portfolio types
export interface Position {
  symbol: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_pl_percent: number;
  broker_id: string;
  broker_name: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_cash: number;
  total_buying_power: number;
  total_positions: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  by_broker: Record<string, unknown>;
  last_updated: string;
}

// Trading types
export interface OrderPreview {
  symbol: string;
  side: string;
  quantity: number;
  order_type: string;
  estimated_cost: number;
  estimated_price: number;
  buying_power_impact: number;
  buying_power_after: number;
  position_after: number;
  risk_assessment: {
    portfolio_concentration_percent: number;
    is_concentrated: boolean;
    position_size_dollars: number;
    current_position_qty: number;
    broker_supports_feature?: {
      extended_hours: boolean;
      fractional_shares: boolean;
      short_selling: boolean;
    };
    error?: string;
  };
  warnings: string[];
  can_execute: boolean;
}

export interface Order {
  broker_id: string;
  account_id: string;
  order_id: string;
  client_order_id?: string;
  symbol: string;
  side: string;
  quantity: number;
  filled_quantity: number;
  order_type: string;
  limit_price?: number;
  stop_price?: number;
  time_in_force?: string;
  status: string;
  submitted_at?: string;
  filled_at?: string;
  average_fill_price?: number;
}

// Chat types
export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Strategy types - templates from backend
export interface Strategy {
  key: string;
  name: string;
  description: string;
  time_horizon: string;
  risk_level: string;
}

// User's saved strategy
export interface UserStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  source: string;
  config: Record<string, unknown>;
  focus_config: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StrategyAnalysis {
  strategy_name: string;
  alignment_score: number;
  analysis: string;
  recommendations: Record<string, unknown>[];
  warnings: string[];
}

// Brokerage types
export interface BrokerConnection {
  id: string;
  user_id: string;
  broker_id: string;
  status: string;
  nickname: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  expires_at: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrokerCredential {
  broker_id: string;
  has_credentials: boolean;
  is_sandbox: boolean;
  api_key_hint: string;
}

// Feedback types
export type FeedbackType = 'accept' | 'reject' | 'modify' | 'question';

export interface UserRule {
  id: string;
  rule_text: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface UserPreferenceProfile {
  learned_risk_tolerance: number | null;
  preferred_sectors: Record<string, number>;
  avoided_sectors: Record<string, string>;
  avoided_patterns: string[];
  total_feedback_count: number;
  acceptance_rate: number | null;
  profile_confidence: number | null;
}
