import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BrokerConnections } from '../components/BrokerConnections';
import { UserRules } from '../components/UserRules';
import { brokerageApi, userApi } from '../lib/api';

export function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile editing
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Handle OAuth callback when returning from broker authorization
  useEffect(() => {
    const broker = searchParams.get('broker');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    if (broker && (code || oauthToken)) {
      const completeOAuth = async () => {
        try {
          const redirectUri = `${window.location.origin}/settings?broker=${broker}`;
          const callbackData: { state: string; code?: string; oauth_token?: string; oauth_verifier?: string } = {
            state: state || '',
          };
          if (code) {
            callbackData.code = code;
          } else if (oauthToken && oauthVerifier) {
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await userApi.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      if (refreshUser) await refreshUser();
      setSaveMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = fullName !== (user?.full_name || '') || email !== (user?.email || '');

  return (
    <div className="space-y-6">
      <div>
        <Title className={theme === 'dark' ? 'text-white' : ''}>Settings</Title>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Manage your account, brokers, and preferences.</Text>
      </div>

      {/* OAuth Status Message */}
      {oauthStatus && (
        <div
          className={`p-4 rounded-lg ${
            oauthStatus.type === 'success'
              ? theme === 'dark'
                ? 'bg-green-900/30 border border-green-700 text-green-400'
                : 'bg-green-50 border border-green-200 text-green-800'
              : theme === 'dark'
                ? 'bg-red-900/30 border border-red-700 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <Text className={oauthStatus.type === 'success'
              ? theme === 'dark' ? 'text-green-400' : 'text-green-800'
              : theme === 'dark' ? 'text-red-400' : 'text-red-800'
            }>
              {oauthStatus.message}
            </Text>
            <button
              onClick={() => setOauthStatus(null)}
              className={theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}
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
              <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
                <Title className={`text-lg ${theme === 'dark' ? 'text-white' : ''}`}>Profile</Title>
                <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <Text className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      This is also your login email
                    </Text>
                  </div>
                  <div>
                    <Text className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </Text>
                  </div>

                  {saveMessage && (
                    <div className={`text-sm ${saveMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {saveMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving || !hasChanges}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </Card>

              <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
                <div className="flex items-center justify-between">
                  <div>
                    <Text className={`font-medium ${theme === 'dark' ? 'text-white' : ''}`}>Sign Out</Text>
                    <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Sign out of your account on this device.
                    </Text>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-gray-200 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
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
