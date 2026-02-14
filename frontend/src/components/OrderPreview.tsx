import { useState } from 'react';
import { Card, Title, Text, Button, Badge, Divider } from '@tremor/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { tradingApi } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { OrderPreview as OrderPreviewType } from '../types';

interface OrderPreviewProps {
  preview: OrderPreviewType;
  brokerId: string;
  orderType: string;
  limitPrice?: number;
  onClose: () => void;
  onSubmit: () => void;
}

export function OrderPreview({ preview, brokerId, orderType, limitPrice, onClose, onSubmit }: OrderPreviewProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await tradingApi.submitOrder({
        broker_id: brokerId,
        symbol: preview.symbol,
        quantity: preview.quantity,
        side: preview.side as 'buy' | 'sell',
        order_type: orderType as 'market' | 'limit',
        limit_price: limitPrice,
      });
      onSubmit();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const concentration = preview.risk_assessment?.portfolio_concentration_percent || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className={`w-full max-w-md mx-4 ${theme === 'dark' ? 'bg-[#161b22]' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <Title className={theme === 'dark' ? 'text-white' : ''}>Order Preview</Title>
          <button
            onClick={onClose}
            className={theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className={`rounded-md p-3 mb-4 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between">
            <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Symbol</Text>
            <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{preview.symbol}</Text>
          </div>
          <div className="flex justify-between">
            <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Side</Text>
            <Badge color={preview.side === 'buy' ? 'green' : 'red'}>
              {preview.side.toUpperCase()}
            </Badge>
          </div>
          <div className="flex justify-between">
            <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Quantity</Text>
            <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{preview.quantity}</Text>
          </div>
          <div className="flex justify-between">
            <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Estimated Price</Text>
            <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(preview.estimated_price)}</Text>
          </div>
          <Divider />
          <div className="flex justify-between">
            <Text className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : ''}`}>Estimated Cost</Text>
            <Text className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(preview.estimated_cost)}</Text>
          </div>
          <div className="flex justify-between">
            <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Buying Power After</Text>
            <Text className={theme === 'dark' ? 'text-gray-300' : ''}>{formatCurrency(preview.buying_power_after)}</Text>
          </div>
        </div>

        {/* Risk Assessment */}
        {concentration > 0 && (
          <>
            <Divider className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Text className={`font-medium ${theme === 'dark' ? 'text-gray-300' : ''}`}>Risk Assessment</Text>
                <Badge color={concentration > 20 ? 'red' : concentration > 10 ? 'yellow' : 'green'}>
                  {concentration > 20 ? 'High' : concentration > 10 ? 'Medium' : 'Low'}
                </Badge>
              </div>
              <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Portfolio concentration: {concentration.toFixed(1)}%
              </Text>
            </div>
          </>
        )}

        {/* Warnings */}
        {preview.warnings && preview.warnings.length > 0 && (
          <div className="mt-4 space-y-1">
            {preview.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-amber-600">
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                <Text className="text-sm text-amber-600">{warning}</Text>
              </div>
            ))}
          </div>
        )}

        {!preview.can_execute && (
          <div className={`mt-4 rounded-md p-3 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <Text className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
              This order cannot be executed. Review the warnings above.
            </Text>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!preview.can_execute}
            color={preview.side === 'buy' ? 'green' : 'red'}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : `Confirm ${preview.side.toUpperCase()}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
