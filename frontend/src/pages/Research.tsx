import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title, Text } from '@tremor/react';
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { portfolioApi } from '../lib/api';

interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  timestamp: string;
  source: string;
}

export function Research() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState('');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setIsLoading(true);
    setError(null);
    setQuote(null);

    try {
      const response = await portfolioApi.getQuotes([symbol.toUpperCase().trim()]);
      if (response.data && response.data.length > 0) {
        setQuote(response.data[0]);
      } else {
        setError('No quote data found for this symbol.');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to fetch quote. Make sure you have an active broker connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAIChat = () => {
    if (!quote) return;
    const message = `Tell me about ${quote.symbol}. The current price is $${Number(quote.last).toFixed(2)} (${Number(quote.change_percent) >= 0 ? '+' : ''}${Number(quote.change_percent).toFixed(2)}% today). What are the latest developments and how can you help me analyze this stock?`;
    navigate(`/chat?message=${encodeURIComponent(message)}`);
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0;
    return `$${num.toFixed(2)}`;
  };

  const formatVolume = (val: number | string) => {
    const num = Number(val) || 0;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (val: number | string) => {
    const num = Number(val) || 0;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      <div>
        <Title className={isDark ? 'text-white' : ''}>Research</Title>
        <Text className={isDark ? 'text-gray-400' : ''}>
          Search for stocks and get real-time market data.
        </Text>
      </div>

      {/* Search */}
      <Card className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
              isDark ? 'text-gray-400' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Enter symbol (e.g., AAPL, TSLA, MSFT)"
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 uppercase ${
                isDark
                  ? 'bg-slate-700 border-slate-600 text-gray-200 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !symbol.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </Card>

      {/* Error */}
      {error && (
        <Card className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
          <Text className="text-red-500">{error}</Text>
        </Card>
      )}

      {/* Quote Results */}
      {quote && (
        <div className="space-y-4">
          {/* Main Quote Card */}
          <Card className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
            <div className="flex items-start justify-between">
              <div>
                <Title className={`text-2xl ${isDark ? 'text-white' : ''}`}>
                  {quote.symbol}
                </Title>
                <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  via {quote.source || 'Broker'}
                </Text>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(quote.last)}
                </p>
                <p className={`text-lg font-semibold ${
                  Number(quote.change) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {Number(quote.change) >= 0 ? '+' : ''}{formatCurrency(quote.change).replace('$', '')}{' '}
                  ({formatPercent(quote.change_percent)})
                </p>
              </div>
            </div>

            {/* AI Chat Button */}
            <div className="mt-6">
              <button
                onClick={handleStartAIChat}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                Start AI Chat about {quote.symbol}
              </button>
            </div>
          </Card>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Open', value: formatCurrency(quote.open) },
              { label: 'Previous Close', value: formatCurrency(quote.previous_close) },
              { label: 'Day High', value: formatCurrency(quote.high) },
              { label: 'Day Low', value: formatCurrency(quote.low) },
              { label: 'Bid', value: formatCurrency(quote.bid) },
              { label: 'Ask', value: formatCurrency(quote.ask) },
              { label: 'Volume', value: formatVolume(quote.volume) },
              { label: 'Spread', value: formatCurrency(Number(quote.ask) - Number(quote.bid)) },
            ].map((stat) => (
              <Card key={stat.label} className={isDark ? 'bg-slate-800 ring-slate-700' : ''}>
                <Text className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {stat.label}
                </Text>
                <p className={`mt-1 text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stat.value}
                </p>
              </Card>
            ))}
          </div>

          {/* Timestamp */}
          {quote.timestamp && (
            <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Last updated: {new Date(quote.timestamp).toLocaleString()}
            </Text>
          )}
        </div>
      )}

      {/* Empty state */}
      {!quote && !error && !isLoading && (
        <Card className={`text-center py-12 ${isDark ? 'bg-slate-800 ring-slate-700' : ''}`}>
          <MagnifyingGlassIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <Title className={`mt-4 ${isDark ? 'text-white' : ''}`}>Search for a Stock</Title>
          <Text className={`mt-2 ${isDark ? 'text-gray-400' : ''}`}>
            Enter a stock symbol above to view real-time market data and start an AI-powered analysis.
          </Text>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'].map((s) => (
              <button
                key={s}
                onClick={() => { setSymbol(s); }}
                className={`px-3 py-1 text-sm rounded-full font-medium ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
