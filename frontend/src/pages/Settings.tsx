import { useState } from 'react';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel, Divider } from '@tremor/react';
import { useAuth } from '../contexts/AuthContext';
import { BrokerConnections } from '../components/BrokerConnections';
import { UserRules } from '../components/UserRules';

export function Settings() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
