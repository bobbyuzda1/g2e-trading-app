import { useEffect, useState, useRef } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { chatApi } from '../lib/api';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ConversationList } from '../components/ConversationList';
import type { Conversation, Message } from '../types';

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

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
      const response = await chatApi.getMessages(conversationId);
      setMessages(response.data);
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
    if (!activeConversation || !content.trim()) return;

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversation,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await chatApi.sendMessage(activeConversation, content.trim());
      // Replace temp message and add AI response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
        return [...filtered, response.data.user_message, response.data.assistant_message];
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
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
        {/* Conversation list */}
        <div className="w-64 flex-shrink-0">
          <ConversationList
            conversations={conversations}
            activeId={activeConversation}
            onSelect={setActiveConversation}
            onNewChat={createNewConversation}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
              <Title className="text-lg">AI Trading Assistant</Title>
              <Text className="text-sm">
                Ask questions about trading strategies, get stock analysis, or discuss your portfolio.
              </Text>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <Text className="mt-4 text-gray-500">
                    Start a conversation with your AI trading assistant.
                  </Text>
                  <div className="mt-4 space-y-2">
                    <Text className="text-sm text-gray-400">Try asking:</Text>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        'What strategies work for value investing?',
                        'Analyze AAPL for swing trading',
                        'How should I size my positions?',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendMessage(suggestion)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
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
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-200"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-400"></div>
                      </div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <ChatInput onSend={sendMessage} disabled={isSending || !activeConversation} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
