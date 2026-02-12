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
          <Text>Unrealized P/L</Text>
          <BadgeDelta
            deltaType={summary.total_unrealized_pl >= 0 ? 'increase' : 'decrease'}
          >
            {formatPercent(summary.total_unrealized_pl_percent ?? 0)}
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
        <Text>Buying Power</Text>
        <Metric>{formatCurrency(summary.total_buying_power)}</Metric>
        <Flex className="mt-4">
          <Text>{summary.total_positions || 0} positions</Text>
        </Flex>
      </Card>

      <Card decoration="top" decorationColor={summary.total_unrealized_pl >= 0 ? 'emerald' : 'red'}>
        <Text>Unrealized P/L</Text>
        <Metric className={summary.total_unrealized_pl >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatCurrency(summary.total_unrealized_pl)}
        </Metric>
        <Flex className="mt-4">
          <BadgeDelta
            deltaType={summary.total_unrealized_pl >= 0 ? 'increase' : 'decrease'}
          >
            {formatPercent(summary.total_unrealized_pl_percent ?? 0)}
          </BadgeDelta>
        </Flex>
      </Card>
    </Grid>
  );
}
