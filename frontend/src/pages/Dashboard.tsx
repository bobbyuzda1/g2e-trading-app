import { useEffect, useState } from 'react';
import { Title, Text, Grid, Card, Metric, Flex, BadgeDelta, ProgressBar } from '@tremor/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { portfolioApi, chatApi, feedbackApi, brokerageApi } from '../lib/api';
import { QuickStats } from '../components/QuickStats';
import { RecentActivity } from '../components/RecentActivity';
import type { PortfolioSummary, Conversation, BrokerConnection } from '../types';

export function Dashboard() {
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
        setConversations(conversationsRes.value.data.slice(0, 5));
      }
      if (brokersRes.status === 'fulfilled') {
        setBrokers(brokersRes.value.data);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setFeedbackCount(profileRes.value.data.total_feedback_count || 0);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="text-center py-8">
            <Title className="text-white">Get Started with G2E</Title>
            <Text className="text-primary-100 mt-2">
              Connect your brokerage account to start trading with AI assistance.
            </Text>
            <Link
              to="/settings"
              className="mt-4 inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
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
                  <Metric>{formatCurrency(portfolio.total_value)}</Metric>
                  <Flex className="mt-2">
                    <Text>Today's change</Text>
                    <BadgeDelta
                      deltaType={portfolio.day_change >= 0 ? 'increase' : 'decrease'}
                    >
                      {portfolio.day_change >= 0 ? '+' : ''}
                      {portfolio.day_change_percent.toFixed(2)}%
                    </BadgeDelta>
                  </Flex>

                  <div className="mt-4">
                    <Flex>
                      <Text>Cash</Text>
                      <Text>{formatCurrency(portfolio.total_cash)}</Text>
                    </Flex>
                    <ProgressBar
                      value={(portfolio.total_cash / portfolio.total_value) * 100}
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
