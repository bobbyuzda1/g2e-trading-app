import { useEffect, useState } from 'react';
import { Card, Title, Text, Badge, Button } from '@tremor/react';
import {
  PlusIcon,
  TrashIcon,
  LinkIcon,
  KeyIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { brokerageApi } from '../lib/api';
import { ETradeSetupGuide } from './ETradeSetupGuide';
import type { BrokerConnection, BrokerCredential } from '../types';

const SUPPORTED_BROKERS = [
  { id: 'etrade', name: 'E*TRADE', description: 'Full-service brokerage', hasGuide: true },
  { id: 'alpaca', name: 'Alpaca', description: 'Commission-free trading', hasGuide: false },
];

export function BrokerConnections() {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingBroker, setConnectingBroker] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [editingBroker, setEditingBroker] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keyForm, setKeyForm] = useState({ api_key: '', api_secret: '', is_sandbox: true });
  const [showSecret, setShowSecret] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [connRes, credRes] = await Promise.all([
        brokerageApi.getConnections(),
        brokerageApi.getCredentials(),
      ]);
      setConnections(connRes.data);
      setCredentials(credRes.data);
    } catch (error) {
      console.error('Failed to load broker data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (broker: string) => {
    // Check if credentials exist first
    const hasCreds = credentials.some((c) => c.broker_id === broker);
    if (!hasCreds) {
      setEditingBroker(broker);
      setSaveMessage({ type: 'error', text: 'Please save your API keys before connecting.' });
      return;
    }

    setConnectingBroker(broker);
    try {
      const redirectUri = `${window.location.origin}/settings?broker=${broker}`;
      const response = await brokerageApi.initiateConnection(broker, redirectUri);
      window.location.href = response.data.authorization_url;
    } catch (error: any) {
      console.error('Failed to initiate connection:', error);
      const detail = error.response?.data?.detail || 'Failed to connect broker. Please try again.';
      alert(detail);
      setConnectingBroker(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this broker?')) return;

    try {
      await brokerageApi.disconnect(connectionId);
      setConnections(connections.filter((c) => c.id !== connectionId));
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSaveKeys = async (brokerId: string) => {
    if (!keyForm.api_key.trim() || !keyForm.api_secret.trim()) {
      setSaveMessage({ type: 'error', text: 'Both API Key and API Secret are required.' });
      return;
    }

    setSavingKeys(true);
    setSaveMessage(null);
    try {
      await brokerageApi.saveCredentials({
        broker_id: brokerId,
        api_key: keyForm.api_key.trim(),
        api_secret: keyForm.api_secret.trim(),
        is_sandbox: keyForm.is_sandbox,
      });

      // Refresh credentials list
      const credRes = await brokerageApi.getCredentials();
      setCredentials(credRes.data);

      setKeyForm({ api_key: '', api_secret: '', is_sandbox: true });
      setEditingBroker(null);
      setShowSecret(false);
      setSaveMessage({ type: 'success', text: 'API keys saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to save credentials:', error);
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save API keys. Please try again.',
      });
    } finally {
      setSavingKeys(false);
    }
  };

  const handleDeleteKeys = async (brokerId: string) => {
    if (!confirm('Are you sure you want to delete your API keys for this broker?')) return;

    try {
      await brokerageApi.deleteCredentials(brokerId);
      setCredentials(credentials.filter((c) => c.broker_id !== brokerId));
      setSaveMessage({ type: 'success', text: 'API keys deleted.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete credentials:', error);
    }
  };

  const isConnected = (brokerId: string) => {
    return connections.some((c) => c.broker_id === brokerId && c.status === 'active');
  };

  const getCredential = (brokerId: string) => {
    return credentials.find((c) => c.broker_id === brokerId);
  };

  // Only show active connections (not pending/expired)
  const activeConnections = connections.filter((c) => c.status === 'active');

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status message */}
      {saveMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Connected Brokers */}
      <Card>
        <Title className="text-lg">Connected Brokers</Title>
        <Text className="mt-1">Manage your brokerage connections.</Text>

        {activeConnections.length === 0 ? (
          <div className="mt-6 text-center py-8 bg-gray-50 rounded-lg">
            <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Text className="mt-2 text-gray-500">No brokers connected yet.</Text>
            <Text className="text-sm text-gray-400">
              Save your API keys below, then connect a broker to start trading.
            </Text>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {activeConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Text className="font-bold text-blue-600">
                      {connection.broker_id[0].toUpperCase()}
                    </Text>
                  </div>
                  <div>
                    <Text className="font-medium">{connection.broker_id}</Text>
                    <Text className="text-sm text-gray-500">
                      Status: {connection.status}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={connection.status === 'active' ? 'green' : 'gray'}>
                    {connection.status}
                  </Badge>
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Available Brokers */}
      <Card>
        <Title className="text-lg">Available Brokers</Title>
        <Text className="mt-1">
          Save your API keys first, then connect to start trading.
        </Text>

        <div className="mt-4 space-y-4">
          {SUPPORTED_BROKERS.map((broker) => {
            const connected = isConnected(broker.id);
            const cred = getCredential(broker.id);
            const isEditing = editingBroker === broker.id;

            return (
              <div
                key={broker.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Broker header row */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Text className="font-bold text-gray-600">{broker.name[0]}</Text>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Text className="font-medium">{broker.name}</Text>
                        {broker.hasGuide && (
                          <button
                            onClick={() => setShowGuide(true)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="How to get API keys"
                          >
                            <QuestionMarkCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      <Text className="text-sm text-gray-500">{broker.description}</Text>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Credential status */}
                    {cred ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Keys: {cred.api_key_hint}
                        {cred.is_sandbox && (
                          <Badge size="xs" color="amber">Sandbox</Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No keys saved</span>
                    )}

                    {/* Action buttons */}
                    {connected ? (
                      <Badge color="green">Connected</Badge>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingBroker(null);
                              setKeyForm({ api_key: '', api_secret: '', is_sandbox: true });
                              setShowSecret(false);
                            } else {
                              setEditingBroker(broker.id);
                              setKeyForm({
                                api_key: '',
                                api_secret: '',
                                is_sandbox: cred?.is_sandbox ?? true,
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <KeyIcon className="h-3.5 w-3.5" />
                          {cred ? 'Update Keys' : 'Add Keys'}
                        </button>
                        <Button
                          size="xs"
                          icon={PlusIcon}
                          loading={connectingBroker === broker.id}
                          onClick={() => handleConnect(broker.id)}
                          disabled={!cred}
                        >
                          Connect
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* API key entry form (expandable) */}
                {isEditing && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-3 max-w-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          API Key / Consumer Key
                        </label>
                        <input
                          type="text"
                          value={keyForm.api_key}
                          onChange={(e) => setKeyForm({ ...keyForm, api_key: e.target.value })}
                          placeholder={cred ? `Current: ${cred.api_key_hint}` : 'Enter your API key'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          API Secret / Consumer Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={keyForm.api_secret}
                            onChange={(e) => setKeyForm({ ...keyForm, api_secret: e.target.value })}
                            placeholder="Enter your API secret"
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecret ? (
                              <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`sandbox-${broker.id}`}
                          checked={keyForm.is_sandbox}
                          onChange={(e) => setKeyForm({ ...keyForm, is_sandbox: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`sandbox-${broker.id}`} className="text-xs text-gray-700">
                          Sandbox / Paper Trading Mode
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleSaveKeys(broker.id)}
                          disabled={savingKeys}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {savingKeys ? 'Saving...' : 'Save Keys'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingBroker(null);
                            setKeyForm({ api_key: '', api_secret: '', is_sandbox: true });
                            setShowSecret(false);
                            setSaveMessage(null);
                          }}
                          className="px-4 py-2 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        {cred && (
                          <button
                            onClick={() => handleDeleteKeys(broker.id)}
                            className="px-4 py-2 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors ml-auto"
                          >
                            Delete Keys
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* E*TRADE Setup Guide Modal */}
      <ETradeSetupGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
