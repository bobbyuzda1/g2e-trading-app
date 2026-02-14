import { Card, Metric, Text, Flex, BadgeDelta, Grid } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import type { PortfolioSummary as PortfolioSummaryType } from '../types';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const { theme } = useTheme();

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value) || 0);
  };

  const formatPercent = (value: number | string) => {
    const num = Number(value) || 0;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const pl = Number(summary.total_unrealized_pl) || 0;
  const plPercent = Number(summary.total_unrealized_pl_percent) || 0;

  return (
    <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
      <Card decoration="top" decorationColor="blue" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Total Portfolio Value</Text>
        <Metric className={theme === 'dark' ? 'text-white' : ''}>{formatCurrency(summary.total_value)}</Metric>
        <Flex className="mt-4">
          <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Unrealized P/L</Text>
          <BadgeDelta
            deltaType={pl >= 0 ? 'increase' : 'decrease'}
          >
            {formatPercent(plPercent)}
          </BadgeDelta>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor="green" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Cash Balance</Text>
        <Metric className={theme === 'dark' ? 'text-white' : ''}>{formatCurrency(summary.total_cash)}</Metric>
        <Flex className="mt-4">
          <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Available for trading</Text>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor="indigo" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Buying Power</Text>
        <Metric className={theme === 'dark' ? 'text-white' : ''}>{formatCurrency(summary.total_buying_power)}</Metric>
        <Flex className="mt-4">
          <Text className={theme === 'dark' ? 'text-gray-400' : ''}>{Number(summary.total_positions) || 0} positions</Text>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor={pl >= 0 ? 'emerald' : 'red'} className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Unrealized P/L</Text>
        <Metric className={pl >= 0 ? 'text-emerald-500' : 'text-red-500'}>
          {formatCurrency(summary.total_unrealized_pl)}
        </Metric>
        <Flex className="mt-4">
          <BadgeDelta
            deltaType={pl >= 0 ? 'increase' : 'decrease'}
          >
            {formatPercent(plPercent)}
          </BadgeDelta>
        </Flex>
      </Card>
    </Grid>
  );
}
