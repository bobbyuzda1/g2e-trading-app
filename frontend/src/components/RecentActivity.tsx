import { Card, Title, Text } from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// Placeholder for now - would integrate with real activity API
interface Activity {
  id: string;
  type: 'trade' | 'chat' | 'feedback' | 'connection';
  title: string;
  description: string;
  timestamp: string;
}

export function RecentActivity() {
  // Placeholder data - would come from API
  const activities: Activity[] = [];

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'trade':
        return ArrowTrendingUpIcon;
      case 'chat':
        return ChatBubbleLeftIcon;
      case 'feedback':
        return CheckCircleIcon;
      case 'connection':
        return ArrowTrendingDownIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getIconColor = (type: Activity['type']) => {
    switch (type) {
      case 'trade':
        return 'text-green-500 bg-green-50';
      case 'chat':
        return 'text-blue-500 bg-blue-50';
      case 'feedback':
        return 'text-purple-500 bg-purple-50';
      case 'connection':
        return 'text-indigo-500 bg-indigo-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <Card>
      <Title className="text-lg">Recent Activity</Title>

      {activities.length === 0 ? (
        <div className="mt-4 text-center py-8">
          <Text className="text-gray-500">No recent activity</Text>
          <Text className="text-sm text-gray-400">
            Your trading activity and AI interactions will appear here.
          </Text>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {activities.map((activity) => {
            const Icon = getIcon(activity.type);
            const colorClass = getIconColor(activity.type);
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <Text className="font-medium">{activity.title}</Text>
                  <Text className="text-sm text-gray-500 truncate">
                    {activity.description}
                  </Text>
                </div>
                <Text className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(activity.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
