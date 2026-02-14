import { useState, useRef, useEffect } from 'react';
import { Card, Text } from '@tremor/react';
import { PlusIcon, ChatBubbleLeftIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import type { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: ConversationListProps) {
  const { theme } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setConfirmDeleteId(null);
  };

  const submitRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitRename();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setEditingId(null);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 3000);
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
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative rounded-lg transition-colors ${
                  activeId === conversation.id
                    ? theme === 'dark'
                      ? 'bg-slate-700'
                      : 'bg-primary-50'
                    : theme === 'dark'
                      ? 'hover:bg-slate-800'
                      : 'hover:bg-gray-50'
                }`}
              >
                {editingId === conversation.id ? (
                  /* Rename input */
                  <div className="flex items-center gap-1 px-3 py-2">
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={submitRename}
                      className={`flex-1 text-sm rounded px-1.5 py-0.5 border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      maxLength={200}
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={submitRename}
                      className="p-0.5 text-green-500 hover:text-green-400"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={cancelEditing}
                      className="p-0.5 text-gray-400 hover:text-gray-300"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  /* Normal display */
                  <button
                    onClick={() => onSelect(conversation.id)}
                    className="w-full text-left px-3 py-2"
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
                )}

                {/* Action buttons - shown on hover when not editing */}
                {editingId !== conversation.id && (
                  <div className={`absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 ${
                    theme === 'dark' ? 'bg-slate-700/90' : 'bg-white/90'
                  } rounded px-0.5`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(conversation);
                      }}
                      className={`p-1 rounded ${
                        theme === 'dark'
                          ? 'hover:bg-slate-600 text-gray-400 hover:text-gray-200'
                          : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                      }`}
                      title="Rename"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conversation.id);
                      }}
                      className={`p-1 rounded ${
                        confirmDeleteId === conversation.id
                          ? 'text-red-500 hover:text-red-400'
                          : theme === 'dark'
                            ? 'hover:bg-slate-600 text-gray-400 hover:text-red-400'
                            : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'
                      }`}
                      title={confirmDeleteId === conversation.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
