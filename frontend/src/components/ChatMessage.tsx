import { Text } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-gray-200'
                : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className={`text-sm whitespace-pre-wrap ${isUser ? 'text-white' : theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
            {message.content}
          </div>
        </div>
        <Text className={`text-xs mt-1 ${isUser ? 'text-right' : 'text-left'} ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </div>
    </div>
  );
}
