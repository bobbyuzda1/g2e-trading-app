import { Card, Title, Text, Badge } from '@tremor/react';
import type { Strategy } from '../types';

interface StrategyCardProps {
  strategy: Strategy;
  isSelected: boolean;
  onSelect: () => void;
}

export function StrategyCard({ strategy, isSelected, onSelect }: StrategyCardProps) {
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const getHorizonColor = (horizon: string) => {
    switch (horizon.toLowerCase()) {
      case 'long-term': return 'blue';
      case 'medium-term': return 'indigo';
      case 'short-term': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-primary-500 shadow-lg'
          : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <Title className="text-base">{strategy.name}</Title>
        {isSelected && (
          <span className="text-primary-600 text-sm font-medium">Selected</span>
        )}
      </div>

      <Text className="mt-2 text-sm line-clamp-3">{strategy.description}</Text>

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
