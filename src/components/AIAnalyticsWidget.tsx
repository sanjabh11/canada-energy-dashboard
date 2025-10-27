/**
 * AI Analytics Widget Component
 *
 * Interactive AI-powered analytics widget with scenario modeling,
 * predictive insights, and recommendation engine.
 */

import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Settings, Play, Pause, RotateCcw } from 'lucide-react';
import { getTransitionAnalyticsInsight, type TransitionKpisResponse } from '../lib/llmClient';

export interface ScenarioModel {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  impact: {
    renewableIncrease: number;
    costReduction: number;
    emissionReduction: number;
  };
}

export interface AIRecommendation {
  id: string;
  type: 'optimization' | 'investment' | 'policy' | 'technical';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  implementationTime: string;
  confidence: number;
}

export interface AIAnalyticsProps {
  dataset: string;
  currentMetrics?: Record<string, number>;
  onScenarioApply?: (scenario: ScenarioModel) => void;
  onRecommendationApply?: (recommendation: AIRecommendation) => void;
}

const DEFAULT_SCENARIOS: ScenarioModel[] = [
  {
    id: 'solar-double',
    name: 'Solar Capacity Doubling',
    description: 'Double solar energy capacity across all provinces',
    parameters: { solarMultiplier: 2.0, investment: 5000000000 },
    impact: { renewableIncrease: 15, costReduction: 8, emissionReduction: 12 }
  },
  {
    id: 'wind-expansion',
    name: 'Wind Farm Expansion',
    description: 'Expand wind energy infrastructure by 50%',
    parameters: { windMultiplier: 1.5, investment: 3000000000 },
    impact: { renewableIncrease: 10, costReduction: 5, emissionReduction: 8 }
  },
  {
    id: 'storage-boost',
    name: 'Energy Storage Boost',
    description: 'Triple energy storage capacity for grid stability',
    parameters: { storageMultiplier: 3.0, investment: 2000000000 },
    impact: { renewableIncrease: 5, costReduction: 15, emissionReduction: 3 }
  }
];

export const AIAnalyticsWidget: React.FC<AIAnalyticsProps> = ({
  dataset,
  currentMetrics = {},
  onScenarioApply,
  onRecommendationApply
}) => {
  const [scenarios, setScenarios] = useState<ScenarioModel[]>(DEFAULT_SCENARIOS);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioModel | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate AI recommendations based on current data
  const generateRecommendations = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis - in real implementation, this would call the LLM API
      const mockRecommendations: AIRecommendation[] = [
        {
          id: 'rec-1',
          type: 'optimization',
          priority: 'high',
          title: 'Peak Shaving Implementation',
          description: 'Implement demand response during peak hours to reduce grid strain',
          expectedImpact: '10-15% peak demand reduction',
          implementationTime: '3-6 months',
          confidence: 0.87
        },
        {
          id: 'rec-2',
          type: 'investment',
          priority: 'medium',
          title: 'Battery Storage Expansion',
          description: 'Invest in distributed battery storage for renewable integration',
          expectedImpact: '20% renewable curtailment reduction',
          implementationTime: '6-12 months',
          confidence: 0.92
        },
        {
          id: 'rec-3',
          type: 'policy',
          priority: 'high',
          title: 'Carbon Pricing Adjustment',
          description: 'Optimize carbon pricing to accelerate clean energy transition',
          expectedImpact: '15% emission reduction acceleration',
          implementationTime: '1-2 months',
          confidence: 0.78
        }
      ];

      setRecommendations(mockRecommendations);

      // Generate insights
      const insightText = `Analysis of ${dataset} data reveals significant opportunities for optimization. Current renewable penetration is at ${currentMetrics.renewablePercentage || 67}%, with potential to reach ${currentMetrics.renewablePercentage || 67 + 15}% through strategic investments. Peak demand patterns suggest implementing demand response programs could reduce costs by 8-12%.`;
      setInsights(insightText);

    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    generateRecommendations();
  }, [dataset, currentMetrics]);

  const handleScenarioSelect = (scenario: ScenarioModel) => {
    setSelectedScenario(scenario);
  };

  const handleScenarioApply = () => {
    if (selectedScenario && onScenarioApply) {
      onScenarioApply(selectedScenario);
    }
  };

  const handleRecommendationApply = (recommendation: AIRecommendation) => {
    if (onRecommendationApply) {
      onRecommendationApply(recommendation);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'investment': return <CheckCircle className="h-4 w-4" />;
      case 'policy': return <AlertTriangle className="h-4 w-4" />;
      case 'technical': return <Settings className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">AI Analytics Engine</h3>
            <p className="text-sm text-slate-500">Powered by advanced machine learning</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          <button
            onClick={generateRecommendations}
            disabled={isAnalyzing}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Insights */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-slate-800">AI Insights</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {insights || 'Click "Analyze" to generate AI-powered insights based on current data patterns and trends.'}
        </p>
      </div>

      {/* Scenario Modeling */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-800">Scenario Modeling</h4>
          <span className="text-xs text-slate-500">{scenarios.length} scenarios</span>
        </div>

        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedScenario?.id === scenario.id
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => handleScenarioSelect(scenario)}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-slate-800">{scenario.name}</h5>
                <span className="text-xs text-slate-500">
                  ${(scenario.parameters.investment / 1000000000).toFixed(1)}B
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-2">{scenario.description}</p>

              <div className="flex gap-4 text-xs">
                <span className="text-green-600">
                  +{scenario.impact.renewableIncrease}% renewable
                </span>
                <span className="text-blue-600">
                  -{scenario.impact.costReduction}% costs
                </span>
                <span className="text-purple-600">
                  -{scenario.impact.emissionReduction}% emissions
                </span>
              </div>
            </div>
          ))}
        </div>

        {selectedScenario && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-800">
                Selected: {selectedScenario.name}
              </span>
              <button
                onClick={handleScenarioApply}
                className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                Apply Scenario
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Recommendations */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-800">AI Recommendations</h4>
          <span className="text-xs text-slate-500">{recommendations.length} recommendations</span>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className="p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${getPriorityColor(rec.priority)}`}>
                    {getTypeIcon(rec.type)}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {Math.round(rec.confidence * 100)}% confidence
                </span>
              </div>

              <h5 className="text-sm font-medium text-slate-800 mb-1">{rec.title}</h5>
              <p className="text-xs text-slate-600 mb-2">{rec.description}</p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Impact: {rec.expectedImpact}</span>
                <span>Time: {rec.implementationTime}</span>
              </div>

              <button
                onClick={() => handleRecommendationApply(rec)}
                className="mt-2 w-full px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                Apply Recommendation
              </button>
            </div>
          ))}
        </div>

        {recommendations.length === 0 && !isAnalyzing && (
          <div className="text-center py-6 text-slate-500">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recommendations available</p>
            <p className="text-xs">Click "Analyze" to generate AI recommendations</p>
          </div>
        )}
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <h4 className="text-sm font-medium text-slate-800 mb-3">Advanced Settings</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">Analysis Depth</label>
              <select className="w-full border border-slate-300 rounded px-2 py-1">
                <option>Standard</option>
                <option>Deep</option>
                <option>Comprehensive</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Time Horizon</label>
              <select className="w-full border border-slate-300 rounded px-2 py-1">
                <option>1 Year</option>
                <option>5 Years</option>
                <option>10 Years</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsWidget;
