import { useEffect, useState } from 'react';
import { Card, Title, Text, Grid } from '@tremor/react';
import { strategyApi } from '../lib/api';
import { StrategyCard } from '../components/StrategyCard';
import { useTheme } from '../contexts/ThemeContext';
import type { Strategy } from '../types';

export function Strategies() {
  const { theme } = useTheme();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setIsLoading(true);
      const response = await strategyApi.getTemplates();
      const data = Array.isArray(response.data) ? response.data : [];
      setStrategies(data);
    } catch (error) {
      console.error('Failed to load strategies:', error);
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

  return (
    <div className="space-y-6">
      <div>
        <Title className={theme === 'dark' ? 'text-white' : ''}>Trading Strategies</Title>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>
          Explore proven trading strategies to guide your investment decisions.
        </Text>
      </div>

      {/* Strategy Cards */}
      {strategies.length > 0 ? (
        <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-4">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.key || strategy.name}
              strategy={strategy}
            />
          ))}
        </Grid>
      ) : (
        <Card className={`text-center py-12 ${theme === 'dark' ? 'bg-[#161b22]' : ''}`}>
          <Text className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
            No strategies available at the moment.
          </Text>
        </Card>
      )}
    </div>
  );
}
