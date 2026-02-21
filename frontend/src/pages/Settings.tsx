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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDark = theme === 'dark';

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
        } catch (error: unknown) {
          console.error('OAuth callback failed:', error);
          const err = error as { response?: { data?: { detail?: string } } };
          setOauthStatus({
            type: 'error',
            message: err.response?.data?.detail || `Failed to connect to ${broker}. Please try again.`
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

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const updateData: { full_name?: string; email?: string } = {};
      if (profileName !== user?.full_name) updateData.full_name = profileName;
      if (profileEmail !== user?.email) updateData.email = profileEmail;

      if (Object.keys(updateData).length === 0) {
        setProfileMessage({ type: 'success', text: 'No changes to save.' });
        setIsEditingProfile(false);
        return;
      }

      await userApi.updateProfile(updateData);
      await refreshUser();
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
      setIsEditingProfile(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setProfileMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to update profile.'
      });
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Title className={isDark ? 'text-white' : ''}>Settings</Title>
        <Text className={isDark ? 'text-gray-400' : ''}>Manage your account, brokers, and preferences.</Text>
      </div>

      {/* OAuth Status Message */}
      {oauthStatus && (
        <div
          className={`p-4 rounded-lg ${
            oauthStatus.type === 'success'
              ? isDark
                ? 'bg-green-900/30 border border-green-700 text-green-400'
                : 'bg-green-50 border border-green-200 text-green-800'
              : isDark
                ? 'bg-red-900/30 border border-red-700 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <Text className={oauthStatus.type === 'success'
              ? isDark ? 'text-green-400' : 'text-green-800'
              : isDark ? 'text-red-400' : 'text-red-800'
            }>
              {oauthStatus.message}
            </Text>
            <button
              onClick={() => setOauthStatus(null)}
              className={isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}
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
              {/* Profile Card */}
              <Card className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
                <div className="flex items-center justify-between">
                  <Title className={`text-lg ${isDark ? 'text-white' : ''}`}>Profile</Title>
                  {!isEditingProfile && (
                    <button
                      onClick={() => {
                        setProfileName(user?.full_name || '');
                        setProfileEmail(user?.email || '');
                        setIsEditingProfile(true);
                        setProfileMessage(null);
                      }}
                      className="text-sm text-primary-500 hover:text-primary-400 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {profileMessage && (
                  <div className={`mt-3 p-2 rounded text-sm ${
                    profileMessage.type === 'success'
                      ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'
                      : isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
                  }`}>
                    {profileMessage.text}
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  <div>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Full Name</Text>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className={`mt-1 w-full px-3 py-2 rounded-lg border focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                          isDark
                            ? 'bg-slate-700 border-slate-600 text-gray-200'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <Text className={`font-medium ${isDark ? 'text-white' : ''}`}>{user?.full_name || '-'}</Text>
                    )}
                  </div>
                  <div>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Email {isEditingProfile && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          (this is also your login credential)
                        </span>
                      )}
                    </Text>
                    {isEditingProfile ? (
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className={`mt-1 w-full px-3 py-2 rounded-lg border focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                          isDark
                            ? 'bg-slate-700 border-slate-600 text-gray-200'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <Text className={`font-medium ${isDark ? 'text-white' : ''}`}>{user?.email || '-'}</Text>
                    )}
                  </div>
                  <div>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Member Since</Text>
                    <Text className={`font-medium ${isDark ? 'text-white' : ''}`}>
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '-'}
                    </Text>
                  </div>

                  {isEditingProfile && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileMessage(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          isDark
                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sign Out Card */}
              <Card className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
                <div className="flex items-center justify-between">
                  <div>
                    <Text className={`font-medium ${isDark ? 'text-white' : ''}`}>Sign Out</Text>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
