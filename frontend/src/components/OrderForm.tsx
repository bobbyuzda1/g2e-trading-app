import { useState, useEffect } from 'react';
import { TextInput, Select, SelectItem, NumberInput, Button } from '@tremor/react';
import { tradingApi, brokerageApi } from '../lib/api';
import type { OrderPreview, BrokerConnection } from '../types';

interface OrderFormProps {
  onPreview: (preview: OrderPreview) => void;
}

export function OrderForm({ onPreview }: OrderFormProps) {
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [brokerId, setBrokerId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState<number>(0);
  const [limitPrice, setLimitPrice] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    try {
      const response = await brokerageApi.getConnections();
      const active = response.data.filter((b: BrokerConnection) => b.status === 'active');
      setBrokers(active);
      if (active.length > 0) {
        setBrokerId(active[0].broker_id);
      }
    } catch (err) {
      console.error('Failed to load brokers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerId || !symbol || quantity <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await tradingApi.previewOrder({
        broker_id: brokerId,
        symbol: symbol.toUpperCase(),
        quantity,
        side,
        order_type: orderType,
        limit_price: orderType === 'limit' ? limitPrice : undefined,
      });
      onPreview(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: unknown } } };
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg || '').join(', ')
        : 'Failed to preview order';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (brokers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No brokers connected</p>
        <a
          href="/settings"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Connect a broker →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
        <Select value={brokerId} onValueChange={setBrokerId}>
          {brokers.map((broker) => (
            <SelectItem key={broker.id} value={broker.broker_id}>
              {broker.broker_id}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
        <TextInput
          value={symbol}
          onValueChange={setSymbol}
          placeholder="AAPL"
          className="uppercase"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
          <Select value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="limit">Limit</SelectItem>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <NumberInput
          value={quantity}
          onValueChange={(v) => setQuantity(v || 0)}
          min={1}
          step={1}
        />
      </div>

      {orderType === 'limit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Limit Price</label>
          <NumberInput
            value={limitPrice}
            onValueChange={setLimitPrice}
            min={0.01}
            step={0.01}
            placeholder="0.00"
          />
        </div>
      )}

      <Button
        type="submit"
        loading={isLoading}
        className="w-full"
        color={side === 'buy' ? 'green' : 'red'}
      >
        {isLoading ? 'Loading...' : `Preview ${side.toUpperCase()} Order`}
      </Button>
    </form>
  );
}
