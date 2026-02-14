import ReactMarkdown from 'react-markdown';
import { Text } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const isDark = theme === 'dark';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary-600 text-white'
              : isDark
                ? 'bg-slate-700 text-gray-200'
                : 'bg-gray-100 text-gray-900'
          }`}
        >
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap text-white">
              {message.content}
            </div>
          ) : (
            <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              <ReactMarkdown
                components={{
                  h3: ({ children }) => (
                    <h3 className={`text-base font-bold mt-3 mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className={`text-sm font-bold mt-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="my-1.5 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside ml-2 my-1.5 space-y-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside ml-2 my-1.5 space-y-0.5">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  hr: () => (
                    <hr className={`my-3 border-t ${isDark ? 'border-slate-600' : 'border-gray-300'}`} />
                  ),
                  code: ({ children }) => (
                    <code
                      className={`px-1 py-0.5 rounded text-xs font-mono ${
                        isDark
                          ? 'bg-slate-600 text-gray-200'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {children}
                    </code>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <Text className={`text-xs mt-1 ${isUser ? 'text-right' : 'text-left'} ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </div>
    </div>
  );
}
