import { useEffect, useState } from 'react';
import { Card, Title, Text, Grid } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import { strategyApi } from '../lib/api';
import { StrategyCard } from '../components/StrategyCard';
import type { Strategy } from '../types';

export function Strategies() {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await strategyApi.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to load strategy templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

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
        <Title className={isDark ? 'text-white' : ''}>Trading Strategies</Title>
        <Text className={isDark ? 'text-gray-400' : ''}>
          Explore different trading strategies to guide your investment approach.
        </Text>
      </div>

      {/* Strategy Templates */}
      {templates.length > 0 ? (
        <div>
          <Title className={`text-lg mb-4 ${isDark ? 'text-white' : ''}`}>Available Strategies</Title>
          <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-4">
            {templates.map((strategy) => (
              <StrategyCard
                key={strategy.key}
                strategy={strategy}
                isSelected={selectedStrategy === strategy.key}
                onSelect={() => setSelectedStrategy(
                  selectedStrategy === strategy.key ? null : strategy.key
                )}
              />
            ))}
          </Grid>
        </div>
      ) : (
        <Card className={`text-center py-12 ${isDark ? 'bg-slate-800 ring-slate-700' : ''}`}>
          <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            No strategy templates available yet.
          </Text>
        </Card>
      )}

      {/* Selected strategy details */}
      {selectedStrategy && (
        <Card className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
          <Title className={isDark ? 'text-white' : ''}>
            {templates.find(s => s.key === selectedStrategy)?.name}
          </Title>
          <Text className={`mt-2 ${isDark ? 'text-gray-300' : ''}`}>
            {templates.find(s => s.key === selectedStrategy)?.description}
          </Text>
          <div className="mt-4 flex gap-4">
            <div>
              <Text className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Time Horizon
              </Text>
              <Text className={`font-semibold ${isDark ? 'text-white' : ''}`}>
                {templates.find(s => s.key === selectedStrategy)?.time_horizon}
              </Text>
            </div>
            <div>
              <Text className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Risk Level
              </Text>
              <Text className={`font-semibold ${isDark ? 'text-white' : ''}`}>
                {templates.find(s => s.key === selectedStrategy)?.risk_level}
              </Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
