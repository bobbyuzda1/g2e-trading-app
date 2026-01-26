import { Card, Title, Text, Badge, Divider, ProgressBar } from '@tremor/react';
import type { StrategyAnalysis } from '../types';

interface SymbolAnalysisProps {
  analysis: StrategyAnalysis;
}

export function SymbolAnalysis({ analysis }: SymbolAnalysisProps) {
  const getRecommendationColor = (rec: string) => {
    const lower = rec.toLowerCase();
    if (lower.includes('buy') || lower.includes('bullish')) return 'green';
    if (lower.includes('sell') || lower.includes('bearish')) return 'red';
    if (lower.includes('hold') || lower.includes('neutral')) return 'yellow';
    return 'gray';
  };

  const confidenceColor = analysis.confidence >= 0.8
    ? 'emerald'
    : analysis.confidence >= 0.6
    ? 'yellow'
    : 'red';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <Title>{analysis.symbol}</Title>
          <Text className="text-sm text-gray-500">
            Strategy: {analysis.strategy}
          </Text>
        </div>
        <Badge color={getRecommendationColor(analysis.recommendation)} size="lg">
          {analysis.recommendation}
        </Badge>
      </div>

      <Divider className="my-4" />

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <Text className="text-sm font-medium">Confidence</Text>
            <Text className="text-sm">{(analysis.confidence * 100).toFixed(0)}%</Text>
          </div>
          <ProgressBar value={analysis.confidence * 100} color={confidenceColor} />
        </div>

        <div>
          <Text className="font-medium mb-2">Analysis</Text>
          <div className="prose prose-sm max-w-none">
            <Text className="whitespace-pre-wrap">{analysis.analysis}</Text>
          </div>
        </div>
      </div>

      <Divider className="my-4" />

      <Text className="text-xs text-gray-400">
        This analysis is AI-generated for informational purposes only.
        Always do your own research before making investment decisions.
      </Text>
    </Card>
  );
}
