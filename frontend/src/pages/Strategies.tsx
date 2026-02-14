import { useEffect, useState, useCallback } from 'react';
import { Card, Title, Text, Badge } from '@tremor/react';
import { strategyApi } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Strategy, UserStrategy } from '../types';

export function Strategies() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [templates, setTemplates] = useState<Strategy[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<UserStrategy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedTemplate, setSelectedTemplate] = useState<Strategy | null>(null);
  const [customText, setCustomText] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit active strategy state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deactivate state
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [templatesRes, strategiesRes] = await Promise.all([
        strategyApi.getTemplates(),
        strategyApi.getStrategies(true),
      ]);

      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(templatesData);

      const strategiesData = Array.isArray(strategiesRes.data) ? strategiesRes.data : [];
      const active = strategiesData.find((s: UserStrategy) => s.is_active) || null;
      setActiveStrategy(active);
    } catch (err: any) {
      console.error('Failed to load strategies:', err);
      setError('Failed to load strategies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      case 'very high': return 'red';
      default: return 'gray';
    }
  };

  const getHorizonColor = (horizon: string) => {
    switch (horizon.toLowerCase()) {
      case 'long-term': case 'long': return 'blue';
      case 'medium-term': case 'medium': return 'indigo';
      case 'short-term': case 'short': return 'purple';
      case 'intraday': return 'pink';
      default: return 'gray';
    }
  };

  const handleTemplateClick = (template: Strategy) => {
    setSelectedTemplate(template);
    setCustomText('');
    setModalError(null);
  };

  const handleCloseModal = () => {
    setSelectedTemplate(null);
    setCustomText('');
    setModalError(null);
  };

  const handleActivateStrategy = async () => {
    if (!selectedTemplate) return;

    setIsActivating(true);
    setModalError(null);

    try {
      // If there's already an active strategy, deactivate it first
      if (activeStrategy) {
        await strategyApi.updateStrategy(activeStrategy.id, { is_active: false });
      }

      // Create the new strategy from the template
      const createRes = await strategyApi.createStrategy({
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        source: 'manual',
        config: {
          template_key: selectedTemplate.key,
          custom_text: customText.trim() || undefined,
        },
      });

      const newStrategyId = createRes.data.id;

      // Activate it
      await strategyApi.updateStrategy(newStrategyId, { is_active: true });

      // Refresh data and close modal
      await loadData();
      handleCloseModal();
    } catch (err: any) {
      console.error('Failed to activate strategy:', err);
      setModalError(err.response?.data?.detail || 'Failed to activate strategy. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activeStrategy) return;

    setIsDeactivating(true);
    try {
      await strategyApi.deleteStrategy(activeStrategy.id);
      await loadData();
    } catch (err: any) {
      console.error('Failed to deactivate strategy:', err);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleStartEdit = () => {
    const currentCustomText = (activeStrategy?.config?.custom_text as string) || '';
    setEditText(currentCustomText);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!activeStrategy) return;

    setIsSavingEdit(true);
    try {
      await strategyApi.updateStrategy(activeStrategy.id, {
        config: {
          ...activeStrategy.config,
          custom_text: editText.trim() || undefined,
        },
      });
      await loadData();
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update strategy:', err);
    } finally {
      setIsSavingEdit(false);
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
      {/* Page Header */}
      <div>
        <Title className={isDark ? 'text-white' : ''}>Trading Strategies</Title>
        <Text className={isDark ? 'text-gray-400' : ''}>
          Choose a strategy to guide your AI trading assistant. Your active strategy provides additional context for all recommendations.
        </Text>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <div className="flex items-center justify-between">
            <Text className={isDark ? 'text-red-400' : 'text-red-800'}>{error}</Text>
            <button onClick={() => setError(null)} className={isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Active Strategy Section */}
      {activeStrategy && (
        <div>
          <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Your Active Strategy
          </Text>
          <Card className={`border-2 ${isDark ? 'bg-[#161b22] border-primary-500/50' : 'border-primary-200 bg-primary-50/30'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Title className={`text-lg ${isDark ? 'text-white' : ''}`}>{activeStrategy.name}</Title>
                  <Badge color="green" size="sm">Active</Badge>
                </div>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activeStrategy.description}
                </Text>

                {/* Show custom text if present and not editing */}
                {!isEditing && !!activeStrategy.config?.custom_text && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${isDark ? 'bg-slate-800/60 text-gray-300' : 'bg-white/60 text-gray-700'}`}>
                    <Text className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Custom instructions:
                    </Text>
                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {String(activeStrategy.config.custom_text)}
                    </p>
                  </div>
                )}

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Custom Strategy Instructions
                      </label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        placeholder="Add custom instructions for the AI, e.g., 'Focus on tech sector, avoid penny stocks, prefer dividend-paying companies...'"
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-vertical ${
                          isDark
                            ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit}
                        className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                        className={`px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 ${
                          isDark
                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!isEditing && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={handleStartEdit}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      isDark
                        ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                    className={`px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 ${
                      isDark
                        ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {isDeactivating ? 'Removing...' : 'Deactivate'}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Template Grid Section */}
      <div>
        <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {activeStrategy ? 'Switch Strategy' : 'Choose a Strategy'}
        </Text>

        {templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const isCurrentActive = activeStrategy?.config?.template_key === template.key;
              return (
                <button
                  key={template.key || template.name}
                  onClick={() => !isCurrentActive && handleTemplateClick(template)}
                  disabled={isCurrentActive}
                  className={`text-left rounded-xl p-5 border transition-all ${
                    isCurrentActive
                      ? isDark
                        ? 'bg-[#161b22] border-primary-500/30 opacity-60 cursor-default'
                        : 'bg-gray-50 border-primary-200 opacity-60 cursor-default'
                      : isDark
                        ? 'bg-[#161b22] border-slate-700 hover:border-primary-500/50 hover:bg-[#1c2333] cursor-pointer'
                        : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {template.name}
                    </h3>
                    {isCurrentActive && <Badge color="green" size="sm">Active</Badge>}
                  </div>
                  <p className={`text-sm line-clamp-3 mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge color={getRiskColor(template.risk_level)} size="sm">
                      {template.risk_level} risk
                    </Badge>
                    <Badge color={getHorizonColor(template.time_horizon)} size="sm">
                      {template.time_horizon}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <Card className={`text-center py-12 ${isDark ? 'bg-[#161b22]' : ''}`}>
            <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              No strategy templates available at the moment.
            </Text>
          </Card>
        )}
      </div>

      {/* Template Detail / Activate Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal Content */}
          <div className={`relative w-full max-w-lg rounded-xl shadow-2xl ${isDark ? 'bg-[#0d1117] border border-slate-700' : 'bg-white border border-gray-200'}`}>
            {/* Header */}
            <div className={`flex items-start justify-between p-6 pb-0`}>
              <div className="flex-1 min-w-0 pr-4">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTemplate.name}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge color={getRiskColor(selectedTemplate.risk_level)} size="sm">
                    {selectedTemplate.risk_level} risk
                  </Badge>
                  <Badge color={getHorizonColor(selectedTemplate.time_horizon)} size="sm">
                    {selectedTemplate.time_horizon}
                  </Badge>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className={`p-1 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedTemplate.description}
              </p>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Custom Instructions (optional)
                </label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={4}
                  placeholder="Add your own instructions, e.g., 'Focus on tech sector, avoid penny stocks, prefer companies with strong cash flow...'"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-vertical ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <Text className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  This text is sent to the AI alongside the strategy template to further personalize recommendations.
                </Text>
              </div>

              {/* Modal Error */}
              {modalError && (
                <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {modalError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 p-6 pt-0`}>
              <button
                onClick={handleCloseModal}
                disabled={isActivating}
                className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${
                  isDark
                    ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleActivateStrategy}
                disabled={isActivating}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActivating ? 'Activating...' : 'Activate Strategy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
