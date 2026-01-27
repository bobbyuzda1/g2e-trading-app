import { Card, Metric, Text, Flex, BadgeDelta, Grid } from '@tremor/react';
import type { PortfolioSummary as PortfolioSummaryType } from '../types';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
      <Card decoration="top" decorationColor="blue">
        <Text>Total Portfolio Value</Text>
        <Metric>{formatCurrency(summary.total_value)}</Metric>
        <Flex className="mt-4">
          <Text>Day Change</Text>
          <BadgeDelta
            deltaType={summary.day_change >= 0 ? 'increase' : 'decrease'}
          >
            {formatPercent(summary.day_change_percent)}
          </BadgeDelta>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor="green">
        <Text>Cash Balance</Text>
        <Metric>{formatCurrency(summary.total_cash)}</Metric>
        <Flex className="mt-4">
          <Text>Available for trading</Text>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor="indigo">
        <Text>Invested Value</Text>
        <Metric>{formatCurrency(summary.total_invested)}</Metric>
        <Flex className="mt-4">
          <Text>{summary.positions?.length || 0} positions</Text>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor={summary.day_change >= 0 ? 'emerald' : 'red'}>
        <Text>Today's P/L</Text>
        <Metric className={summary.day_change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatCurrency(summary.day_change)}
        </Metric>
        <Flex className="mt-4">
          <BadgeDelta
            deltaType={summary.day_change >= 0 ? 'increase' : 'decrease'}
          >
            {formatPercent(summary.day_change_percent)}
          </BadgeDelta>
        </Flex>
      </Card>
    </Grid>
  );
}
