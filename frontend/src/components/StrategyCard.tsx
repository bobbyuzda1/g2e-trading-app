import { Card, Title, Text, Badge } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import type { Strategy } from '../types';

interface StrategyCardProps {
  strategy: Strategy;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const { theme } = useTheme();

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      case 'very high': return 'red';
      default: return 'gray';
    }
  };

  const getHorizonColor = (horizon: string) => {
    switch (horizon.toLowerCase()) {
      case 'long-term': return 'blue';
      case 'long': return 'blue';
      case 'medium-term': return 'indigo';
      case 'medium': return 'indigo';
      case 'short-term': return 'purple';
      case 'short': return 'purple';
      case 'intraday': return 'pink';
      default: return 'gray';
    }
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        theme === 'dark' ? 'bg-[#161b22] hover:bg-[#1c2333]' : ''
      }`}
    >
      <Title className={`text-base ${theme === 'dark' ? 'text-white' : ''}`}>{strategy.name}</Title>

      <Text className={`mt-2 text-sm line-clamp-3 ${theme === 'dark' ? 'text-gray-400' : ''}`}>
        {strategy.description}
      </Text>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge color={getRiskColor(strategy.risk_level)} size="sm">
          {strategy.risk_level} risk
        </Badge>
        <Badge color={getHorizonColor(strategy.time_horizon)} size="sm">
          {strategy.time_horizon}
        </Badge>
      </div>
    </Card>
  );
}
