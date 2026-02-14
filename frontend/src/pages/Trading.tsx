import { useState } from 'react';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { OrderForm } from '../components/OrderForm';
import { OrderPreview } from '../components/OrderPreview';
import { OrderHistory } from '../components/OrderHistory';
import { useTheme } from '../contexts/ThemeContext';
import type { OrderPreview as OrderPreviewType } from '../types';

interface PreviewState {
  preview: OrderPreviewType;
  brokerId: string;
  orderType: string;
  limitPrice?: number;
}

export function Trading() {
  const { theme } = useTheme();
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);

  const handlePreview = (preview: OrderPreviewType, brokerId: string, orderType: string, limitPrice?: number) => {
    setPreviewState({ preview, brokerId, orderType, limitPrice });
  };

  const handleClosePreview = () => {
    setPreviewState(null);
  };

  const handleOrderSubmitted = () => {
    setPreviewState(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Title className={theme === 'dark' ? 'text-white' : ''}>Trading</Title>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Place orders and view your trading history.</Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="lg:col-span-1">
          <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
            <Title className={`text-lg mb-4 ${theme === 'dark' ? 'text-white' : ''}`}>New Order</Title>
            <OrderForm onPreview={handlePreview} />
          </Card>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <TabGroup>
            <TabList>
              <Tab>Open Orders</Tab>
              <Tab>Order History</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <div className="mt-4">
                  <OrderHistory filter="open" />
                </div>
              </TabPanel>
              <TabPanel>
                <div className="mt-4">
                  <OrderHistory filter="all" />
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>

      {/* Order Preview Modal */}
      {previewState && (
        <OrderPreview
          preview={previewState.preview}
          brokerId={previewState.brokerId}
          orderType={previewState.orderType}
          limitPrice={previewState.limitPrice}
          onClose={handleClosePreview}
          onSubmit={handleOrderSubmitted}
        />
      )}
    </div>
  );
}
