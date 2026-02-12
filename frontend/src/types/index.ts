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
  side: 'buy' | 'sell';
  quantity: number;
  estimated_price: number;
  estimated_total: number;
  commission: number;
  risk_assessment: {
    risk_level: string;
    warnings: string[];
    position_size_percent: number;
  };
}

export interface Order {
  id: string;
  broker_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  order_type: 'market' | 'limit';
  limit_price?: number;
  status: string;
  filled_quantity: number;
  average_fill_price?: number;
  created_at: string;
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

// Strategy types
export interface Strategy {
  key: string;
  name: string;
  description: string;
  time_horizon: string;
  risk_level: string;
}

export interface StrategyAnalysis {
  symbol: string;
  strategy: string;
  analysis: string;
  recommendation: string;
  confidence: number;
}

// Brokerage types
export interface BrokerConnection {
  id: string;
  broker: string;
  account_id: string;
  is_active: boolean;
  connected_at: string;
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
