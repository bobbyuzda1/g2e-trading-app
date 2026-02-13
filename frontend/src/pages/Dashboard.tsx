import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Title, Text, Grid, Card, Metric, Flex, BadgeDelta, ProgressBar } from '@tremor/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { portfolioApi, chatApi, feedbackApi, brokerageApi } from '../lib/api';
import { QuickStats } from '../components/QuickStats';
import { RecentActivity } from '../components/RecentActivity';
import type { PortfolioSummary, Conversation, BrokerConnection } from '../types';

// Error boundary to prevent white screen crashes
class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mt-6">
          <Title className="text-red-600">Something went wrong</Title>
          <Text className="mt-2 text-gray-600">
            The dashboard encountered an error. Please try refreshing the page.
          </Text>
          <pre className="mt-4 p-3 bg-gray-100 rounded text-xs text-red-700 overflow-auto">
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Refresh Page
          </button>
        </Card>
      );
    }
    return this.props.children;
  }
}

function DashboardContent() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [portfolioRes, conversationsRes, brokersRes, profileRes] = await Promise.allSettled([
        portfolioApi.getSummary(),
        chatApi.getConversations(),
        brokerageApi.getConnections(),
        feedbackApi.getProfile(),
      ]);

      if (portfolioRes.status === 'fulfilled') {
        setPortfolio(portfolioRes.value.data);
      }
      if (conversationsRes.status === 'fulfilled') {
        const data = conversationsRes.value.data;
        setConversations(Array.isArray(data) ? data.slice(0, 5) : []);
      }
      if (brokersRes.status === 'fulfilled') {
        const data = brokersRes.value.data;
        setBrokers(Array.isArray(data) ? data : []);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setFeedbackCount(Number(profileRes.value.data.total_feedback_count) || 0);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const plValue = Number(portfolio?.total_unrealized_pl) || 0;
  const plPercent = Number(portfolio?.total_unrealized_pl_percent) || 0;
  const totalValue = Number(portfolio?.total_value) || 0;
  const totalCash = Number(portfolio?.total_cash) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title>
          {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Trader'}
        </Title>
        <Text>Here's your trading overview.</Text>
      </div>

      {/* No Broker Connected State */}
      {brokers.length === 0 ? (
        <Card className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] border-0 shadow-lg">
          <div className="text-center py-8">
            <Title className="text-white">Get Started with G2E</Title>
            <Text className="text-purple-100 mt-2">
              Connect your brokerage account to start trading with AI assistance.
            </Text>
            <Link
              to="/settings"
              className="mt-4 inline-flex items-center px-6 py-3 bg-white text-[#6366f1] rounded-lg font-medium hover:bg-gray-100 transition-colors shadow-md"
            >
              Connect Broker →
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Quick Stats */}
          <QuickStats portfolio={portfolio} brokersCount={brokers.length} feedbackCount={feedbackCount} />

          {/* Main Grid */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
            {/* Portfolio Quick View */}
            <Card>
              <Flex>
                <Title className="text-lg">Portfolio</Title>
                <Link to="/portfolio" className="text-primary-600 text-sm hover:underline">
                  View all →
                </Link>
              </Flex>

              {portfolio ? (
                <div className="mt-4">
                  <Metric>{formatCurrency(totalValue)}</Metric>
                  <Flex className="mt-2">
                    <Text>Unrealized P/L</Text>
                    <BadgeDelta
                      deltaType={plValue >= 0 ? 'increase' : 'decrease'}
                    >
                      {plValue >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                    </BadgeDelta>
                  </Flex>

                  <div className="mt-4">
                    <Flex>
                      <Text>Cash</Text>
                      <Text>{formatCurrency(totalCash)}</Text>
                    </Flex>
                    <ProgressBar
                      value={totalValue > 0 ? (totalCash / totalValue) * 100 : 0}
                      color="blue"
                      className="mt-2"
                    />
                  </div>
                </div>
              ) : (
                <Text className="mt-4 text-gray-500">No portfolio data available</Text>
              )}
            </Card>

            {/* Recent AI Conversations */}
            <Card>
              <Flex>
                <Title className="text-lg">AI Assistant</Title>
                <Link to="/chat" className="text-primary-600 text-sm hover:underline">
                  Open chat →
                </Link>
              </Flex>

              {conversations.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {conversations.slice(0, 3).map((conv) => (
                    <Link
                      key={conv.id}
                      to="/chat"
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Text className="font-medium truncate">
                        {conv.title || 'New conversation'}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </Text>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-center py-6">
                  <Text className="text-gray-500">No conversations yet</Text>
                  <Link
                    to="/chat"
                    className="mt-2 inline-block text-primary-600 hover:underline text-sm"
                  >
                    Start a conversation →
                  </Link>
                </div>
              )}
            </Card>
          </Grid>

          {/* Recent Activity */}
          <RecentActivity />
        </>
      )}
    </div>
  );
}

export function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
