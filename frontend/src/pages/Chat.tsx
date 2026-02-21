import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Title, Text } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';
import { chatApi } from '../lib/api';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ConversationList } from '../components/ConversationList';
import type { Conversation, Message } from '../types';

export function Chat() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for initial message from Research page
    const msg = searchParams.get('message');
    if (msg) {
      setInitialMessage(msg);
      setSearchParams({});
    }
    loadConversations();
  }, []);

  // Send initial message once conversations are loaded
  useEffect(() => {
    if (initialMessage && !isLoading) {
      sendMessage(initialMessage);
      setInitialMessage(null);
    }
  }, [initialMessage, isLoading]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await chatApi.getConversations();
      setConversations(response.data);
      if (response.data.length > 0 && !activeConversation) {
        setActiveConversation(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await chatApi.getConversation(conversationId);
      const msgs = (response.data.messages || []).map((m: Message) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      }));
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await chatApi.createConversation();
      setConversations([response.data, ...conversations]);
      setActiveConversation(response.data.id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversation || '',
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await chatApi.sendMessage(
        content.trim(),
        activeConversation || undefined
      );
      const data = response.data;

      // If no active conversation, one was created automatically
      if (!activeConversation && data.conversation_id) {
        setActiveConversation(data.conversation_id);
        loadConversations();
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
        return [
          ...filtered,
          {
            id: data.message.id,
            conversation_id: data.message.conversation_id,
            role: data.message.role,
            content: data.message.content,
            created_at: data.message.created_at,
          },
          {
            id: data.response.id,
            conversation_id: data.response.conversation_id,
            role: data.response.role,
            content: data.response.content,
            created_at: data.response.created_at,
          },
        ];
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)]">
      <div className="flex h-full gap-4">
        {/* Conversation list - hidden on mobile */}
        <div className="w-64 flex-shrink-0 hidden md:block">
          <ConversationList
            conversations={conversations}
            activeId={activeConversation}
            onSelect={setActiveConversation}
            onNewChat={createNewConversation}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <Card className={`flex-1 flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-800 ring-slate-700' : ''
          }`}>
            {/* Header */}
            <div className={`flex-shrink-0 border-b px-4 py-3 ${
              theme === 'dark' ? 'border-slate-600' : 'border-gray-200'
            }`}>
              <Title className={`text-lg ${theme === 'dark' ? 'text-white' : ''}`}>
                AI Trading Assistant
              </Title>
              <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : ''}`}>
                Ask questions about trading strategies, get stock analysis, or discuss your portfolio.
              </Text>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <Text className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Start a conversation with your AI trading assistant.
                  </Text>
                  <div className="mt-4 space-y-2">
                    <Text className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Try asking:
                    </Text>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        'What strategies work for value investing?',
                        'Analyze AAPL for swing trading',
                        'How should I size my positions?',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendMessage(suggestion)}
                          className={`px-3 py-1 text-sm rounded-full ${
                            theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isSending && (
                    <div className={`flex items-center space-x-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <div className="animate-pulse flex space-x-1">
                        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className={`flex-shrink-0 border-t p-4 ${
              theme === 'dark' ? 'border-slate-600' : 'border-gray-200'
            }`}>
              <ChatInput onSend={sendMessage} disabled={isSending} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
