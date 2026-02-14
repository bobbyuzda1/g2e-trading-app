import { Card, Text } from '@tremor/react';
import { PlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import type { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const { theme } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <Card className={`h-full flex flex-col ${
      theme === 'dark' ? 'bg-[#161b22] ring-slate-700' : ''
    }`}>
      <div className={`flex-shrink-0 pb-4 border-b ${
        theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-4">
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className={`mx-auto h-8 w-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <Text className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>No conversations yet</Text>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeId === conversation.id
                    ? theme === 'dark'
                      ? 'bg-slate-700 text-primary-400'
                      : 'bg-primary-50 text-primary-700'
                    : theme === 'dark'
                      ? 'hover:bg-slate-800 text-gray-300'
                      : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Text className={`font-medium truncate text-sm ${
                  activeId === conversation.id
                    ? theme === 'dark' ? 'text-primary-400' : 'text-primary-700'
                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {conversation.title || 'New conversation'}
                </Text>
                <Text className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {formatDate(conversation.updated_at)}
                </Text>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
