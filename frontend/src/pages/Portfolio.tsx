import { useEffect, useState } from 'react';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { portfolioApi, brokerageApi } from '../lib/api';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { PositionsTable } from '../components/PositionsTable';
import { useTheme } from '../contexts/ThemeContext';
import type { PortfolioSummary as PortfolioSummaryType, Position, BrokerConnection } from '../types';

export function Portfolio() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [summaryRes, positionsRes, brokersRes] = await Promise.allSettled([
        portfolioApi.getSummary(),
        portfolioApi.getPositions(),
        brokerageApi.getConnections(),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (positionsRes.status === 'fulfilled') setPositions(positionsRes.value.data);
      if (brokersRes.status === 'fulfilled') {
        const data = brokersRes.value.data;
        const all = Array.isArray(data) ? data : [];
        setBrokers(all.filter((b: BrokerConnection) => b.status === 'active'));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={theme === 'dark' ? 'mx-auto max-w-lg bg-[#161b22]' : 'mx-auto max-w-lg'}>
        <div className="text-center">
          <Text className="text-red-500">{error}</Text>
          <button
            onClick={loadPortfolio}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  // Only show empty state if no brokers are connected
  if (brokers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Title className={theme === 'dark' ? 'text-white' : ''}>Portfolio Overview</Title>
          <Text className={theme === 'dark' ? 'text-gray-400' : ''}>View your aggregated portfolio across all connected brokers.</Text>
        </div>

        <Card className={`mx-auto max-w-lg text-center py-12 ${theme === 'dark' ? 'bg-[#161b22]' : ''}`}>
          <svg
            className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <Title className={`mt-4 ${theme === 'dark' ? 'text-white' : ''}`}>No Brokers Connected</Title>
          <Text className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : ''}`}>
            Connect a brokerage account to see your portfolio here.
          </Text>
          <a
            href="/settings"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Connect Broker
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Title className={theme === 'dark' ? 'text-white' : ''}>Portfolio Overview</Title>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Your aggregated portfolio across all connected brokers.</Text>
      </div>

      <PortfolioSummary summary={summary || { total_value: 0, total_cash: 0, total_buying_power: 0, total_positions: 0, total_unrealized_pl: 0, total_unrealized_pl_percent: 0, by_broker: {}, last_updated: '' }} />

      <TabGroup>
        <TabList>
          <Tab>Positions</Tab>
          <Tab>Performance</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4">
              <PositionsTable positions={positions} />
            </div>
          </TabPanel>
          <TabPanel>
            <Card className={`mt-4 ${theme === 'dark' ? 'bg-[#161b22]' : ''}`}>
              <Text className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Performance charts coming soon
              </Text>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
