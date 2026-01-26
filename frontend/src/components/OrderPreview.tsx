import { useState } from 'react';
import { Card, Title, Text, Button, Badge, Divider } from '@tremor/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { tradingApi } from '../lib/api';
import type { OrderPreview as OrderPreviewType } from '../types';

interface OrderPreviewProps {
  preview: OrderPreviewType;
  onClose: () => void;
  onSubmit: () => void;
}

interface ExtendedOrderPreview extends OrderPreviewType {
  broker_id?: string;
  order_type?: 'market' | 'limit';
  limit_price?: number;
}

export function OrderPreview({ preview, onClose, onSubmit }: OrderPreviewProps) {
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

    const extendedPreview = preview as ExtendedOrderPreview;

    try {
      await tradingApi.submitOrder({
        broker_id: extendedPreview.broker_id || '',
        symbol: preview.symbol,
        quantity: preview.quantity,
        side: preview.side,
        order_type: extendedPreview.order_type || 'market',
        limit_price: extendedPreview.limit_price,
      });
      onSubmit();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskColor = preview.risk_assessment?.risk_level === 'high'
    ? 'red'
    : preview.risk_assessment?.risk_level === 'medium'
    ? 'yellow'
    : 'green';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <Title>Order Preview</Title>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between">
            <Text>Symbol</Text>
            <Text className="font-semibold">{preview.symbol}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Side</Text>
            <Badge color={preview.side === 'buy' ? 'green' : 'red'}>
              {preview.side.toUpperCase()}
            </Badge>
          </div>
          <div className="flex justify-between">
            <Text>Quantity</Text>
            <Text className="font-semibold">{preview.quantity}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Estimated Price</Text>
            <Text className="font-semibold">{formatCurrency(preview.estimated_price)}</Text>
          </div>
          <Divider />
          <div className="flex justify-between">
            <Text>Commission</Text>
            <Text>{formatCurrency(preview.commission)}</Text>
          </div>
          <div className="flex justify-between">
            <Text className="font-semibold">Total</Text>
            <Text className="font-bold text-lg">{formatCurrency(preview.estimated_total)}</Text>
          </div>
        </div>

        {preview.risk_assessment && (
          <>
            <Divider className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Text className="font-medium">Risk Assessment</Text>
                <Badge color={riskColor}>{preview.risk_assessment.risk_level}</Badge>
              </div>
              <Text className="text-sm text-gray-500">
                Position size: {preview.risk_assessment.position_size_percent.toFixed(1)}% of portfolio
              </Text>
              {preview.risk_assessment.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {preview.risk_assessment.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-amber-600">
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                      <Text className="text-sm text-amber-600">{warning}</Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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
