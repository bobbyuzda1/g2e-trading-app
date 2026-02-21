import { useEffect, useState } from 'react';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import { portfolioApi, brokerageApi } from '../lib/api';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { PositionsTable } from '../components/PositionsTable';
import type { PortfolioSummary as PortfolioSummaryType, Position, BrokerConnection } from '../types';

export function Portfolio() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [hasActiveBroker, setHasActiveBroker] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check broker connections first
      const connectionsRes = await brokerageApi.getConnections();
      const activeConnections = (connectionsRes.data || []).filter(
        (b: BrokerConnection) => b.status === 'active'
      );
      setHasActiveBroker(activeConnections.length > 0);

      if (activeConnections.length > 0) {
        const [summaryRes, positionsRes] = await Promise.all([
          portfolioApi.getSummary(),
          portfolioApi.getPositions(),
        ]);
        setSummary(summaryRes.data);
        setPositions(positionsRes.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load portfolio');
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
      <Card className={`mx-auto max-w-lg ${theme === 'dark' ? 'bg-slate-800 ring-slate-700' : ''}`}>
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

  // Only show "no broker" if actually no broker connected
  if (!hasActiveBroker) {
    return (
      <div className="space-y-6">
        <div>
          <Title className={theme === 'dark' ? 'text-white' : ''}>Portfolio Overview</Title>
          <Text className={theme === 'dark' ? 'text-gray-400' : ''}>
            View your aggregated portfolio across all connected brokers.
          </Text>
        </div>

        <Card className={`mx-auto max-w-lg text-center py-12 ${
          theme === 'dark' ? 'bg-slate-800 ring-slate-700' : ''
        }`}>
          <svg
            className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
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
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>
          Your aggregated portfolio across all connected brokers.
        </Text>
      </div>

      {summary && <PortfolioSummary summary={summary} />}

      <TabGroup>
        <TabList>
          <Tab>Positions</Tab>
          <Tab>Performance</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4">
              {positions.length > 0 ? (
                <PositionsTable positions={positions} />
              ) : (
                <Card className={theme === 'dark' ? 'bg-slate-800 ring-slate-700' : ''}>
                  <Text className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No positions found. This may be a sandbox account with no holdings.
                  </Text>
                </Card>
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <Card className={`mt-4 ${theme === 'dark' ? 'bg-slate-800 ring-slate-700' : ''}`}>
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
