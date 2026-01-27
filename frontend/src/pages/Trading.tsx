import { useState } from 'react';
import { Card, Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { OrderForm } from '../components/OrderForm';
import { OrderPreview } from '../components/OrderPreview';
import { OrderHistory } from '../components/OrderHistory';
import type { OrderPreview as OrderPreviewType } from '../types';

export function Trading() {
  const [preview, setPreview] = useState<OrderPreviewType | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = (orderPreview: OrderPreviewType) => {
    setPreview(orderPreview);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreview(null);
  };

  const handleOrderSubmitted = () => {
    setShowPreview(false);
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Title>Trading</Title>
        <Text>Place orders and view your trading history.</Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="lg:col-span-1">
          <Card>
            <Title className="text-lg mb-4">New Order</Title>
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
      {showPreview && preview && (
        <OrderPreview
          preview={preview}
          onClose={handleClosePreview}
          onSubmit={handleOrderSubmitted}
        />
      )}
    </div>
  );
}
