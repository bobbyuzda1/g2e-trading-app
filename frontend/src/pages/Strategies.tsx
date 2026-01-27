import { useEffect, useState } from 'react';
import { Card, Title, Text, TextInput, Grid } from '@tremor/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { strategyApi } from '../lib/api';
import { StrategyCard } from '../components/StrategyCard';
import { SymbolAnalysis } from '../components/SymbolAnalysis';
import type { Strategy, StrategyAnalysis as StrategyAnalysisType } from '../types';

export function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('');
  const [analysis, setAnalysis] = useState<StrategyAnalysisType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setIsLoading(true);
      const response = await strategyApi.getStrategies();
      setStrategies(response.data);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await strategyApi.analyzeSymbol(
        symbol.toUpperCase(),
        selectedStrategy || undefined
      );
      setAnalysis(response.data);
    } catch (error) {
      console.error('Failed to analyze symbol:', error);
    } finally {
      setIsAnalyzing(false);
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
    <div className="space-y-6">
      <div>
        <Title>Trading Strategies</Title>
        <Text>Explore different trading strategies and analyze stocks.</Text>
      </div>

      {/* Symbol Analysis */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleAnalyze} className="flex-1 flex gap-4">
            <div className="flex-1">
              <TextInput
                icon={MagnifyingGlassIcon}
                placeholder="Enter symbol (e.g., AAPL)"
                value={symbol}
                onValueChange={setSymbol}
                className="uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing || !symbol.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
          {selectedStrategy && (
            <div className="flex items-center gap-2">
              <Text className="text-sm text-gray-500">Strategy:</Text>
              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm font-medium">
                {strategies.find(s => s.key === selectedStrategy)?.name || selectedStrategy}
              </span>
              <button
                onClick={() => setSelectedStrategy(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Analysis Results */}
      {analysis && <SymbolAnalysis analysis={analysis} />}

      {/* Strategy Cards */}
      <div>
        <Title className="text-lg mb-4">Available Strategies</Title>
        <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-4">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.key}
              strategy={strategy}
              isSelected={selectedStrategy === strategy.key}
              onSelect={() => setSelectedStrategy(
                selectedStrategy === strategy.key ? null : strategy.key
              )}
            />
          ))}
        </Grid>
      </div>
    </div>
  );
}
