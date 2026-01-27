import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Text, Badge } from '@tremor/react';
import { tradingApi } from '../lib/api';
import type { Order } from '../types';

interface OrderHistoryProps {
  filter: 'open' | 'all';
}

export function OrderHistory({ filter }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await tradingApi.getOrders();
      let data = response.data;
      if (filter === 'open') {
        data = data.filter((o: Order) => ['pending', 'open', 'partially_filled'].includes(o.status));
      }
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'green';
      case 'partially_filled': return 'yellow';
      case 'cancelled': return 'gray';
      case 'rejected': return 'red';
      default: return 'blue';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <Text className="text-center py-8 text-gray-500">
          {filter === 'open' ? 'No open orders' : 'No order history'}
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
            <TableHeaderCell>Side</TableHeaderCell>
            <TableHeaderCell className="text-right">Qty</TableHeaderCell>
            <TableHeaderCell className="text-right">Filled</TableHeaderCell>
            <TableHeaderCell className="text-right">Price</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Time</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Text className="font-semibold">{order.symbol}</Text>
              </TableCell>
              <TableCell>
                <Badge color={order.side === 'buy' ? 'green' : 'red'}>
                  {order.side.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Text>{order.quantity}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text>{order.filled_quantity}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text>{formatCurrency(order.average_fill_price || order.limit_price)}</Text>
              </TableCell>
              <TableCell>
                <Badge color={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Text className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
