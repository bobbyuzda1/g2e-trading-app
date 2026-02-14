import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Text, Badge } from '@tremor/react';
import { tradingApi } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Order } from '../types';

interface OrderHistoryProps {
  filter: 'open' | 'all';
}

export function OrderHistory({ filter }: OrderHistoryProps) {
  const { theme } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await tradingApi.getOrders();
      let data = Array.isArray(response.data) ? response.data : [];
      if (filter === 'open') {
        data = data.filter((o: Order) => ['pending', 'open', 'partially_filled', 'new', 'accepted'].includes(o.status));
      }
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'green';
      case 'partially_filled': return 'yellow';
      case 'cancelled': case 'canceled': return 'gray';
      case 'rejected': return 'red';
      default: return 'blue';
    }
  };

  if (isLoading) {
    return (
      <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <Text className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {filter === 'open' ? 'No open orders' : 'No order history'}
        </Text>
      </Card>
    );
  }

  return (
    <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
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
            <TableRow key={order.order_id || `${order.symbol}-${order.submitted_at}`}>
              <TableCell>
                <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{order.symbol}</Text>
              </TableCell>
              <TableCell>
                <Badge color={order.side === 'buy' ? 'green' : 'red'}>
                  {order.side.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Text className={theme === 'dark' ? 'text-gray-300' : ''}>{order.quantity}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text className={theme === 'dark' ? 'text-gray-300' : ''}>{order.filled_quantity}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text className={theme === 'dark' ? 'text-gray-300' : ''}>{formatCurrency(order.average_fill_price || order.limit_price)}</Text>
              </TableCell>
              <TableCell>
                <Badge color={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {order.submitted_at ? new Date(order.submitted_at).toLocaleString() : '-'}
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
