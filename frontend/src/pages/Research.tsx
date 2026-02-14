import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title, Text, Grid, Metric, Flex, BadgeDelta } from '@tremor/react';
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { portfolioApi } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface QuoteData {
  symbol: string;
  last_price: number;
  change: number;
  change_percent: number;
  bid: number;
  ask: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
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
      const response = await portfolioApi.getQuotes(symbol.toUpperCase().trim());
      const quotes = response.data;
      if (Array.isArray(quotes) && quotes.length > 0) {
        setQuote(quotes[0]);
      } else if (quotes && !Array.isArray(quotes)) {
        setQuote(quotes);
      } else {
        setError('No data found for this symbol. Please check the symbol and try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch quote data. Make sure you have an active broker connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const startAIChat = () => {
    if (quote) {
      navigate(`/chat?symbol=${quote.symbol}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <Title className={theme === 'dark' ? 'text-white' : ''}>Research</Title>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>
          Search for a stock symbol to view real-time market data.
        </Text>
      </div>

      {/* Search */}
      <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Enter symbol (e.g., AAPL, TSLA, MSFT)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !symbol.trim()}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </Card>

      {/* Error */}
      {error && (
        <Card className={theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}>
          <Text className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{error}</Text>
        </Card>
      )}

      {/* Quote Results */}
      {quote && (
        <>
          {/* Header with symbol and AI chat button */}
          <div className="flex items-center justify-between">
            <div>
              <Title className={theme === 'dark' ? 'text-white' : ''}>{quote.symbol}</Title>
              <div className="flex items-center gap-3 mt-1">
                <Metric className={theme === 'dark' ? 'text-white' : ''}>{formatCurrency(quote.last_price)}</Metric>
                <BadgeDelta
                  deltaType={quote.change >= 0 ? 'increase' : 'decrease'}
                  size="lg"
                >
                  {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)} ({quote.change_percent >= 0 ? '+' : ''}{quote.change_percent?.toFixed(2)}%)
                </BadgeDelta>
              </div>
            </div>
            <button
              onClick={startAIChat}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Start AI Chat
            </button>
          </div>

          {/* Quote Details */}
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
            <Card decoration="top" decorationColor="blue" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Previous Close</Text>
              <Metric className={`mt-1 ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(quote.previous_close)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="green" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Open</Text>
              <Metric className={`mt-1 ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(quote.open)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="indigo" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Day High</Text>
              <Metric className={`mt-1 ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(quote.high)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="red" className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Day Low</Text>
              <Metric className={`mt-1 ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(quote.low)}</Metric>
            </Card>
          </Grid>

          <Grid numItemsSm={2} numItemsLg={3} className="gap-4">
            <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Flex>
                <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Bid</Text>
                <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(quote.bid)}</Text>
              </Flex>
            </Card>
            <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Flex>
                <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Ask</Text>
                <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{formatCurrency(quote.ask)}</Text>
              </Flex>
            </Card>
            <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
              <Flex>
                <Text className={theme === 'dark' ? 'text-gray-400' : ''}>Volume</Text>
                <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{formatNumber(quote.volume)}</Text>
              </Flex>
            </Card>
          </Grid>
        </>
      )}

      {/* Empty state */}
      {!quote && !error && !isLoading && (
        <Card className={`text-center py-12 ${theme === 'dark' ? 'bg-[#161b22]' : ''}`}>
          <MagnifyingGlassIcon className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <Title className={`mt-4 ${theme === 'dark' ? 'text-white' : ''}`}>Search for a Stock</Title>
          <Text className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : ''}`}>
            Enter a ticker symbol above to view real-time market data and start an AI-powered analysis.
          </Text>
        </Card>
      )}
    </div>
  );
}
