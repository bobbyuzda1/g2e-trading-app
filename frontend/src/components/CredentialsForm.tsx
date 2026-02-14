import { useState } from 'react';
import { Button, TextInput, Select, SelectItem, Text, Callout } from '@tremor/react';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { brokerageApi } from '../lib/api';
import type { BrokerCredential } from '../types';

type CredentialEnvironment = 'sandbox' | 'production';

interface CredentialsFormProps {
  brokerId: string;
  brokerName: string;
  onSaved: (credentials: BrokerCredential) => void;
  onCancel: () => void;
}

// Broker-specific labels for API keys
const BROKER_LABELS: Record<string, { keyLabel: string; secretLabel: string }> = {
  etrade: { keyLabel: 'Consumer Key', secretLabel: 'Consumer Secret' },
  alpaca: { keyLabel: 'API Key ID', secretLabel: 'API Secret Key' },
  schwab: { keyLabel: 'Client ID', secretLabel: 'Client Secret' },
  ibkr: { keyLabel: 'Client ID', secretLabel: 'Client Secret' },
};

export function CredentialsForm({ brokerId, brokerName, onSaved, onCancel }: CredentialsFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [environment, setEnvironment] = useState<CredentialEnvironment>('sandbox');
  const [label, setLabel] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = BROKER_LABELS[brokerId] || { keyLabel: 'API Key', secretLabel: 'API Secret' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('API Key and Secret are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await brokerageApi.saveCredentials({
        broker_id: brokerId,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        is_sandbox: environment === 'sandbox',
      });
      onSaved(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Callout
        title="Your credentials are encrypted"
        icon={ShieldCheckIcon}
        color="blue"
        className="mb-4"
      >
        Your API credentials are encrypted using industry-standard AES encryption before being
        stored. We never store or display your secrets in plain text.
      </Callout>

      {error && (
        <Callout title="Error" color="red" className="mb-4">
          {error}
        </Callout>
      )}

      <div>
        <Text className="mb-1 font-medium">{labels.keyLabel}</Text>
        <TextInput
          placeholder={`Enter your ${brokerName} ${labels.keyLabel}`}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Text className="mb-1 font-medium">{labels.secretLabel}</Text>
        <div className="relative">
          <TextInput
            type={showSecret ? 'text' : 'password'}
            placeholder={`Enter your ${brokerName} ${labels.secretLabel}`}
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            {showSecret ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div>
        <Text className="mb-1 font-medium">Environment</Text>
        <Select
          value={environment}
          onValueChange={(value) => setEnvironment(value as CredentialEnvironment)}
          disabled={isSubmitting}
        >
          <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
          <SelectItem value="production">Production (Live)</SelectItem>
        </Select>
        <Text className="mt-1 text-xs text-gray-500">
          Use sandbox for testing with paper trading. Switch to production for live trading.
        </Text>
      </div>

      <div>
        <Text className="mb-1 font-medium">Label (optional)</Text>
        <TextInput
          placeholder="e.g., My Trading Account"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={isSubmitting}
        />
        <Text className="mt-1 text-xs text-gray-500">
          A friendly name to identify these credentials.
        </Text>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save Credentials
        </Button>
      </div>
    </form>
  );
}
