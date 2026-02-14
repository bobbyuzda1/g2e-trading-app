import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  register: (email: string, password: string, fullName: string) =>
    api.post('/auth/register', { email, password, full_name: fullName }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
};

// Portfolio API
export const portfolioApi = {
  getSummary: () => api.get('/portfolio/summary'),
  getPositions: () => api.get('/portfolio/positions'),
  getHistory: (days?: number) => api.get('/portfolio/history', { params: { days } }),
  getQuotes: (symbols: string) => api.get('/portfolio/quotes', { params: { symbols } }),
};

// Trading API
export const tradingApi = {
  previewOrder: (data: {
    broker_id: string;
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    order_type: 'market' | 'limit';
    limit_price?: number;
  }) => api.post('/trading/preview', data),
  submitOrder: (data: {
    broker_id: string;
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    order_type: 'market' | 'limit';
    limit_price?: number;
  }) => api.post('/trading/orders', data),
  getOrders: (brokerId?: string, status?: string) =>
    api.get('/trading/orders', { params: { broker_id: brokerId, status } }),
  cancelOrder: (data: { broker_id: string; account_id: string; order_id: string }) =>
    api.delete('/trading/orders', { data }),
};

// Chat API
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (title?: string) =>
    api.post('/chat/conversations', { title }),
  getConversation: (conversationId: string) =>
    api.get(`/chat/conversations/${conversationId}`),
  renameConversation: (conversationId: string, title: string) =>
    api.patch(`/chat/conversations/${conversationId}`, { title }),
  deleteConversation: (conversationId: string) =>
    api.delete(`/chat/conversations/${conversationId}`),
  sendMessage: (message: string, conversationId?: string) =>
    api.post('/chat/send', { message, conversation_id: conversationId }),
};

// Strategy API
export const strategyApi = {
  getTemplates: () => api.get('/strategies/templates'),
  getStrategies: (activeOnly?: boolean) =>
    api.get('/strategies', { params: { active_only: activeOnly } }),
  getStrategy: (id: string) => api.get(`/strategies/${id}`),
  createStrategy: (data: {
    name: string;
    description?: string;
    source?: string;
    config?: Record<string, unknown>;
    focus_config?: Record<string, unknown>;
  }) => api.post('/strategies', data),
  updateStrategy: (id: string, data: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
    focus_config?: Record<string, unknown>;
    is_active?: boolean;
  }) => api.put(`/strategies/${id}`, data),
  deleteStrategy: (id: string) => api.delete(`/strategies/${id}`),
  analyzeAlignment: (strategyId?: string) =>
    api.post('/strategies/analyze', { strategy_id: strategyId }),
};

// User API
export const userApi = {
  updateProfile: (data: { full_name?: string; email?: string }) =>
    api.put('/users/me', data),
};

// Brokerage API
export const brokerageApi = {
  getConnections: () => api.get('/brokerages/connections'),
  getSupportedBrokers: () => api.get('/brokerages/supported'),
  initiateConnection: (brokerId: string, redirectUri: string) =>
    api.post(`/brokerages/connect/${brokerId}`, null, { params: { redirect_uri: redirectUri } }),
  completeOAuth: (brokerId: string, redirectUri: string, callbackData: { state: string; code?: string; oauth_token?: string; oauth_verifier?: string }) =>
    api.post(`/brokerages/callback/${brokerId}`, callbackData, { params: { redirect_uri: redirectUri } }),
  disconnect: (connectionId: string) =>
    api.delete(`/brokerages/connections/${connectionId}`),
  // Per-user broker API credentials
  getCredentials: () => api.get('/brokerages/credentials'),
  saveCredentials: (data: { broker_id: string; api_key: string; api_secret: string; is_sandbox: boolean }) =>
    api.put('/brokerages/credentials', data),
  deleteCredentials: (brokerId: string) =>
    api.delete(`/brokerages/credentials/${brokerId}`),
};

// Feedback API
export const feedbackApi = {
  submit: (data: {
    recommendation_symbol: string;
    recommendation_action: string;
    recommendation_summary: string;
    feedback_type: 'accept' | 'reject' | 'modify' | 'question';
    user_reasoning?: string;
    context_tags?: string[];
  }) => api.post('/feedback', data),
  getHistory: (limit?: number) => api.get('/feedback', { params: { limit } }),
  getProfile: () => api.get('/feedback/profile'),
  getRules: () => api.get('/feedback/rules'),
  addRule: (ruleText: string, category: string) =>
    api.post('/feedback/rules', { rule_text: ruleText, category }),
  deleteRule: (ruleId: string) => api.delete(`/feedback/rules/${ruleId}`),
};

export default api;
