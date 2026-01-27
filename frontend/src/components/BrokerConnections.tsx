import { useEffect, useState } from 'react';
import { Card, Title, Text, Badge, Button } from '@tremor/react';
import { PlusIcon, TrashIcon, LinkIcon } from '@heroicons/react/24/outline';
import { brokerageApi } from '../lib/api';
import type { BrokerConnection } from '../types';

const SUPPORTED_BROKERS = [
  { id: 'alpaca', name: 'Alpaca', description: 'Commission-free trading' },
  { id: 'etrade', name: 'E*TRADE', description: 'Full-service brokerage' },
];

export function BrokerConnections() {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingBroker, setConnectingBroker] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await brokerageApi.getConnections();
      setConnections(response.data);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (broker: string) => {
    setConnectingBroker(broker);
    try {
      const response = await brokerageApi.initiateConnection(broker);
      // Redirect to OAuth URL
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Failed to initiate connection:', error);
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

  const isConnected = (brokerId: string) => {
    return connections.some((c) => c.broker.toLowerCase() === brokerId && c.is_active);
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

  return (
    <div className="space-y-6">
      {/* Connected Brokers */}
      <Card>
        <Title className="text-lg">Connected Brokers</Title>
        <Text className="mt-1">Manage your brokerage connections.</Text>

        {connections.length === 0 ? (
          <div className="mt-6 text-center py-8 bg-gray-50 rounded-lg">
            <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Text className="mt-2 text-gray-500">No brokers connected yet.</Text>
            <Text className="text-sm text-gray-400">
              Connect a broker below to start trading.
            </Text>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Text className="font-bold text-primary-600">
                      {connection.broker[0]}
                    </Text>
                  </div>
                  <div>
                    <Text className="font-medium">{connection.broker}</Text>
                    <Text className="text-sm text-gray-500">
                      Account: {connection.account_id}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={connection.is_active ? 'green' : 'gray'}>
                    {connection.is_active ? 'Active' : 'Inactive'}
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
        <Text className="mt-1">Connect additional brokerage accounts.</Text>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SUPPORTED_BROKERS.map((broker) => {
            const connected = isConnected(broker.id);
            return (
              <div
                key={broker.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="font-medium">{broker.name}</Text>
                    <Text className="text-sm text-gray-500">{broker.description}</Text>
                  </div>
                  {connected ? (
                    <Badge color="green">Connected</Badge>
                  ) : (
                    <Button
                      size="xs"
                      icon={PlusIcon}
                      loading={connectingBroker === broker.id}
                      onClick={() => handleConnect(broker.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
