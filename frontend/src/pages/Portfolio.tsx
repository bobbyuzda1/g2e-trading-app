import { useEffect, useState } from 'react';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { portfolioApi } from '../lib/api';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { PositionsTable } from '../components/PositionsTable';
import type { PortfolioSummary as PortfolioSummaryType, Position } from '../types';

export function Portfolio() {
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [summaryRes, positionsRes] = await Promise.all([
        portfolioApi.getSummary(),
        portfolioApi.getPositions(),
      ]);
      setSummary(summaryRes.data);
      setPositions(positionsRes.data);
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
      <Card className="mx-auto max-w-lg">
        <div className="text-center">
          <Text className="text-red-600">{error}</Text>
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

  // Show empty state if no broker connected
  if (!summary || summary.total_value === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Title>Portfolio Overview</Title>
          <Text>View your aggregated portfolio across all connected brokers.</Text>
        </div>

        <Card className="mx-auto max-w-lg text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <Title className="mt-4">No Brokers Connected</Title>
          <Text className="mt-2">
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
        <Title>Portfolio Overview</Title>
        <Text>Your aggregated portfolio across all connected brokers.</Text>
      </div>

      <PortfolioSummary summary={summary} />

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
            <Card className="mt-4">
              <Text className="text-center py-8 text-gray-500">
                Performance charts coming soon
              </Text>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
