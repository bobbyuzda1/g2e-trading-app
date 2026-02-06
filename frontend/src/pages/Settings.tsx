import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel, Divider } from '@tremor/react';
import { useAuth } from '../contexts/AuthContext';
import { BrokerConnections } from '../components/BrokerConnections';
import { UserRules } from '../components/UserRules';
import { brokerageApi } from '../lib/api';

export function Settings() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle OAuth callback when returning from broker authorization
  useEffect(() => {
    const broker = searchParams.get('broker');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    // Check if this is an OAuth callback
    if (broker && (code || oauthToken)) {
      const completeOAuth = async () => {
        try {
          const redirectUri = `${window.location.origin}/settings?broker=${broker}`;

          // Build callback data based on OAuth version
          const callbackData: { state: string; code?: string; oauth_token?: string; oauth_verifier?: string } = {
            state: state || '',
          };

          if (code) {
            // OAuth 2.0 (Alpaca)
            callbackData.code = code;
          } else if (oauthToken && oauthVerifier) {
            // OAuth 1.0a (E*TRADE)
            callbackData.oauth_token = oauthToken;
            callbackData.oauth_verifier = oauthVerifier;
          }

          await brokerageApi.completeOAuth(broker, redirectUri, callbackData);
          setOauthStatus({ type: 'success', message: `Successfully connected to ${broker}!` });
        } catch (error: any) {
          console.error('OAuth callback failed:', error);
          setOauthStatus({
            type: 'error',
            message: error.response?.data?.detail || `Failed to connect to ${broker}. Please try again.`
          });
        } finally {
          // Clean up URL parameters
          setSearchParams({});
        }
      };

      completeOAuth();
    }
  }, [searchParams, setSearchParams]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Title>Settings</Title>
        <Text>Manage your account, brokers, and preferences.</Text>
      </div>

      {/* OAuth Status Message */}
      {oauthStatus && (
        <div
          className={`p-4 rounded-lg ${
            oauthStatus.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <Text className={oauthStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {oauthStatus.message}
            </Text>
            <button
              onClick={() => setOauthStatus(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <TabGroup>
        <TabList>
          <Tab>Brokers</Tab>
          <Tab>Trading Rules</Tab>
          <Tab>Account</Tab>
        </TabList>
        <TabPanels>
          {/* Brokers Tab */}
          <TabPanel>
            <div className="mt-4">
              <BrokerConnections />
            </div>
          </TabPanel>

          {/* Trading Rules Tab */}
          <TabPanel>
            <div className="mt-4">
              <UserRules />
            </div>
          </TabPanel>

          {/* Account Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              <Card>
                <Title className="text-lg">Profile</Title>
                <div className="mt-4 space-y-4">
                  <div>
                    <Text className="text-sm text-gray-500">Full Name</Text>
                    <Text className="font-medium">{user?.full_name || '-'}</Text>
                  </div>
                  <div>
                    <Text className="text-sm text-gray-500">Email</Text>
                    <Text className="font-medium">{user?.email || '-'}</Text>
                  </div>
                  <div>
                    <Text className="text-sm text-gray-500">Member Since</Text>
                    <Text className="font-medium">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '-'}
                    </Text>
                  </div>
                </div>
              </Card>

              <Card>
                <Title className="text-lg text-red-600">Danger Zone</Title>
                <Text className="mt-2">
                  These actions are irreversible. Please proceed with caution.
                </Text>
                <Divider className="my-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="font-medium">Sign Out</Text>
                    <Text className="text-sm text-gray-500">
                      Sign out of your account on this device.
                    </Text>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </Card>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
