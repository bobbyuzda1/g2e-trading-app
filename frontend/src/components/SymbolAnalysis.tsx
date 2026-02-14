import { Card, Title, Text, Badge, Divider } from '@tremor/react';
import type { StrategyAnalysis } from '../types';

interface SymbolAnalysisProps {
  analysis: StrategyAnalysis;
}

export function SymbolAnalysis({ analysis }: SymbolAnalysisProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Title>{analysis.strategy_name}</Title>
        <Badge color={analysis.alignment_score >= 70 ? 'green' : analysis.alignment_score >= 40 ? 'yellow' : 'red'}>
          {analysis.alignment_score.toFixed(0)}% aligned
        </Badge>
      </div>

      <Divider className="my-4" />

      <div className="space-y-4">
        <div>
          <Text className="font-medium mb-2">Analysis</Text>
          <Text className="whitespace-pre-wrap">{analysis.analysis}</Text>
        </div>

        {analysis.warnings.length > 0 && (
          <div>
            <Text className="font-medium mb-2">Warnings</Text>
            {analysis.warnings.map((w, i) => (
              <Text key={i} className="text-amber-600 text-sm">{w}</Text>
            ))}
          </div>
        )}
      </div>

      <Divider className="my-4" />

      <Text className="text-xs text-gray-400">
        This analysis is AI-generated for informational purposes only.
        Always do your own research before making investment decisions.
      </Text>
    </Card>
  );
}
