import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../contexts/ThemeContext';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about trading strategies, stocks, or your portfolio..."
          disabled={disabled}
          rows={1}
          className={`w-full resize-none rounded-lg border px-4 py-2 pr-12 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400 disabled:bg-slate-900 disabled:cursor-not-allowed'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed'
          }`}
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="flex-shrink-0 rounded-lg bg-primary-600 p-2 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PaperAirplaneIcon className="h-5 w-5" />
      </button>
    </form>
  );
}
