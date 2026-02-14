import { Card, Metric, Text, Flex, Grid } from '@tremor/react';
import { ChartBarIcon, ChatBubbleLeftRightIcon, LinkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import type { PortfolioSummary } from '../types';

interface QuickStatsProps {
  portfolio: PortfolioSummary | null;
  brokersCount: number;
  feedbackCount: number;
}

export function QuickStats({ portfolio, brokersCount, feedbackCount }: QuickStatsProps) {
  const { theme } = useTheme();

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const stats = [
    {
      title: 'Portfolio Value',
      value: portfolio ? formatCurrency(portfolio.total_value) : '$0',
      icon: ChartBarIcon,
      color: 'blue' as const,
    },
    {
      title: 'Positions',
      value: portfolio?.total_positions?.toString() || '0',
      icon: ClockIcon,
      color: 'indigo' as const,
    },
    {
      title: 'Connected Brokers',
      value: brokersCount.toString(),
      icon: LinkIcon,
      color: 'green' as const,
    },
    {
      title: 'AI Interactions',
      value: feedbackCount.toString(),
      icon: ChatBubbleLeftRightIcon,
      color: 'purple' as const,
    },
  ];

  return (
    <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} decoration="top" decorationColor={stat.color} className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
          <Flex alignItems="start">
            <div>
              <Text className={theme === 'dark' ? 'text-gray-400' : ''}>{stat.title}</Text>
              <Metric className={`mt-1 ${theme === 'dark' ? 'text-white' : ''}`}>{stat.value}</Metric>
            </div>
            <stat.icon className={`h-8 w-8 text-${stat.color}-500`} />
          </Flex>
        </Card>
      ))}
    </Grid>
  );
}
