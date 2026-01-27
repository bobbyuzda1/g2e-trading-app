import { useEffect, useState } from 'react';
import { Card, Title, Text, TextInput, Select, SelectItem, Button, Badge } from '@tremor/react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { feedbackApi } from '../lib/api';
import type { UserRule, UserPreferenceProfile } from '../types';

const RULE_CATEGORIES = [
  { value: 'risk', label: 'Risk Management' },
  { value: 'timing', label: 'Timing' },
  { value: 'sector', label: 'Sector Preference' },
  { value: 'position', label: 'Position Sizing' },
  { value: 'other', label: 'Other' },
];

export function UserRules() {
  const [rules, setRules] = useState<UserRule[]>([]);
  const [profile, setProfile] = useState<UserPreferenceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newRule, setNewRule] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rulesRes, profileRes] = await Promise.all([
        feedbackApi.getRules(),
        feedbackApi.getProfile(),
      ]);
      setRules(rulesRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.trim()) return;

    setIsAdding(true);
    try {
      const response = await feedbackApi.addRule(newRule.trim(), newCategory);
      setRules([...rules, response.data]);
      setNewRule('');
      setNewCategory('other');
    } catch (error) {
      console.error('Failed to add rule:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await feedbackApi.deleteRule(ruleId);
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learned Preferences */}
      {profile && profile.total_feedback_count > 0 && (
        <Card>
          <Title className="text-lg">Learned Preferences</Title>
          <Text className="mt-1">
            Based on {profile.total_feedback_count} feedback interactions.
          </Text>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {profile.learned_risk_tolerance && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text className="text-sm text-gray-500">Risk Tolerance</Text>
                <Text className="font-medium">{profile.learned_risk_tolerance}/10</Text>
              </div>
            )}
            {profile.acceptance_rate !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text className="text-sm text-gray-500">Acceptance Rate</Text>
                <Text className="font-medium">{profile.acceptance_rate.toFixed(1)}%</Text>
              </div>
            )}
            {Object.keys(profile.preferred_sectors).length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg sm:col-span-2">
                <Text className="text-sm text-gray-500 mb-2">Preferred Sectors</Text>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(profile.preferred_sectors).map((sector) => (
                    <Badge key={sector} color="green">{sector}</Badge>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(profile.avoided_sectors).length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg sm:col-span-2">
                <Text className="text-sm text-gray-500 mb-2">Avoided Sectors</Text>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(profile.avoided_sectors).map((sector) => (
                    <Badge key={sector} color="red">{sector}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Explicit Rules */}
      <Card>
        <Title className="text-lg">Trading Rules</Title>
        <Text className="mt-1">
          Set explicit rules for the AI to follow when making recommendations.
        </Text>

        {/* Add Rule Form */}
        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <TextInput
              value={newRule}
              onValueChange={setNewRule}
              placeholder="e.g., Never buy stocks within 2 weeks of earnings"
            />
          </div>
          <Select value={newCategory} onValueChange={setNewCategory} className="w-40">
            {RULE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </Select>
          <Button
            icon={PlusIcon}
            loading={isAdding}
            onClick={handleAddRule}
            disabled={!newRule.trim()}
          >
            Add
          </Button>
        </div>

        {/* Rules List */}
        {rules.length === 0 ? (
          <div className="mt-6 text-center py-8 bg-gray-50 rounded-lg">
            <Text className="text-gray-500">No rules defined yet.</Text>
            <Text className="text-sm text-gray-400">
              Add rules above to guide the AI's recommendations.
            </Text>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge color="gray" size="sm">
                    {RULE_CATEGORIES.find((c) => c.value === rule.category)?.label || rule.category}
                  </Badge>
                  <Text>{rule.rule_text}</Text>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
