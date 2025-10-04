/**
 * Recommendations Panel
 * Display personalized energy-saving recommendations
 */

import React, { useState } from 'react';
import { 
  Lightbulb, DollarSign, Zap, Leaf, ChevronDown, 
  ChevronUp, CheckCircle, Clock, TrendingDown 
} from 'lucide-react';
import type { Recommendation } from '../lib/types/household';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  onImplement: (recommendationId: string) => void;
}

const PRIORITY_COLORS = {
  high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10',
  medium: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10',
  low: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10',
};

const PRIORITY_TEXT_COLORS = {
  high: 'text-red-700 dark:text-red-300',
  medium: 'text-yellow-700 dark:text-yellow-300',
  low: 'text-blue-700 dark:text-blue-300',
};

const CATEGORY_ICONS = {
  behavioral: <Lightbulb className="w-5 h-5" />,
  upgrade: <Zap className="w-5 h-5" />,
  rebate: <DollarSign className="w-5 h-5" />,
  emergency: <Clock className="w-5 h-5" />,
  education: <Leaf className="w-5 h-5" />,
};

const EFFORT_LABELS = {
  easy: '🟢 Easy',
  moderate: '🟡 Moderate',
  significant: '🔴 Significant',
};

const RecommendationCard: React.FC<{
  recommendation: Recommendation;
  onImplement: () => void;
}> = ({ recommendation, onImplement }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border-2 rounded-lg transition-all ${PRIORITY_COLORS[recommendation.priority]}`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={PRIORITY_TEXT_COLORS[recommendation.priority]}>
                {CATEGORY_ICONS[recommendation.category]}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${PRIORITY_TEXT_COLORS[recommendation.priority]} bg-white dark:bg-gray-800`}>
                {recommendation.priority.toUpperCase()}
              </span>
              <span className="text-xs font-medium px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {recommendation.category}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {recommendation.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {recommendation.description}
            </p>

            {/* Savings Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  ${recommendation.potentialSavings.monthly}/month
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  (${recommendation.potentialSavings.annual}/year)
                </span>
              </div>
              {recommendation.potentialSavings.kwh > 0 && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {recommendation.potentialSavings.kwh} kWh saved
                  </span>
                </div>
              )}
              {recommendation.potentialSavings.co2Reduction > 0 && (
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {Math.round(recommendation.potentialSavings.co2Reduction)} kg CO₂
                  </span>
                </div>
              )}
            </div>

            {/* Effort */}
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Effort: {EFFORT_LABELS[recommendation.effort]}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col gap-2">
            {!recommendation.isCompleted ? (
              <button
                onClick={onImplement}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
              >
                Mark Done
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                Implemented
              </div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm border border-gray-300 dark:border-gray-600"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
            <h4 className="font-bold text-gray-900 dark:text-white mb-3">Action Steps:</h4>
            <div className="space-y-3">
              {recommendation.actionSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">{step.step}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {step.estimatedTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {step.estimatedTime}
                        </span>
                      )}
                      {step.difficulty && (
                        <span>Difficulty: {step.difficulty}</span>
                      )}
                      {step.cost !== undefined && step.cost > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${step.cost}
                        </span>
                      )}
                      {step.cost === 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {recommendation.relatedRebates && recommendation.relatedRebates.length > 0 && (
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                  💰 Related Rebates Available
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  You may qualify for rebates to help with this upgrade. Check the Rebates section for details.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({ 
  recommendations, 
  onImplement 
}) => {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'savings' | 'effort' | 'priority'>('savings');

  // Filter recommendations
  let filteredRecs = recommendations;
  if (filter !== 'all') {
    filteredRecs = recommendations.filter(r => r.priority === filter);
  }

  // Sort recommendations
  filteredRecs = [...filteredRecs].sort((a, b) => {
    if (sortBy === 'savings') {
      return b.potentialSavings.annual - a.potentialSavings.annual;
    } else if (sortBy === 'effort') {
      const effortRank = { easy: 1, moderate: 2, significant: 3 };
      return effortRank[a.effort] - effortRank[b.effort];
    } else {
      const priorityRank = { high: 3, medium: 2, low: 1 };
      return priorityRank[b.priority] - priorityRank[a.priority];
    }
  });

  const completedCount = recommendations.filter(r => r.isCompleted).length;
  const totalSavings = recommendations
    .filter(r => !r.isCompleted)
    .reduce((sum, r) => sum + r.potentialSavings.annual, 0);

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Recommendations Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Add your usage data to get personalized energy-saving recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Recommendations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendations.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Potential Savings</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalSavings}</p>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'high'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            High Priority
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'medium'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Medium Priority
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'low'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Low Priority
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="savings">Savings (High to Low)</option>
            <option value="effort">Effort (Easy First)</option>
            <option value="priority">Priority (High First)</option>
          </select>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecs.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onImplement={() => onImplement(recommendation.id)}
          />
        ))}
      </div>

      {filteredRecs.length === 0 && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No recommendations match the current filter
        </div>
      )}
    </div>
  );
};

export default RecommendationsPanel;
