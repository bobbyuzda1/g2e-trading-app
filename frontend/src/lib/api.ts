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
  }) => api.post('/trading/order', data),
  getOrders: () => api.get('/trading/orders'),
  cancelOrder: (orderId: string) => api.delete(`/trading/orders/${orderId}`),
};

// Chat API
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: () => api.post('/chat/conversations'),
  getMessages: (conversationId: string) =>
    api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { content }),
};

// Strategy API
export const strategyApi = {
  getStrategies: () => api.get('/strategy'),
  analyzeSymbol: (symbol: string, strategy?: string) =>
    api.get(`/strategy/analyze/${symbol}`, { params: { strategy } }),
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
