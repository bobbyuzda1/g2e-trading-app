import {
  Card,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Text,
  Badge,
} from '@tremor/react';
import type { Position } from '../types';

interface PositionsTableProps {
  positions: Position[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
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

  if (positions.length === 0) {
    return (
      <Card>
        <Text className="text-center py-8 text-gray-500">
          No positions found. Start trading to see your holdings here.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Symbol</TableHeaderCell>
            <TableHeaderCell className="text-right">Shares</TableHeaderCell>
            <TableHeaderCell className="text-right">Avg Cost</TableHeaderCell>
            <TableHeaderCell className="text-right">Current Price</TableHeaderCell>
            <TableHeaderCell className="text-right">Market Value</TableHeaderCell>
            <TableHeaderCell className="text-right">P/L</TableHeaderCell>
            <TableHeaderCell>Broker</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {positions.map((position, index) => (
            <TableRow key={`${position.symbol}-${position.broker_id}-${index}`}>
              <TableCell>
                <Text className="font-semibold">{position.symbol}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text>{position.quantity}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text>{formatCurrency(position.average_cost)}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text>{formatCurrency(position.current_price)}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text className="font-medium">{formatCurrency(position.market_value)}</Text>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <Text
                    className={Number(position.unrealized_pl) >= 0 ? 'text-emerald-600' : 'text-red-600'}
                  >
                    {formatCurrency(position.unrealized_pl)}
                  </Text>
                  <Badge
                    color={Number(position.unrealized_pl_percent) >= 0 ? 'emerald' : 'red'}
                    size="xs"
                  >
                    {formatPercent(position.unrealized_pl_percent)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <Badge color="gray" size="xs">
                  {position.broker_name}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
