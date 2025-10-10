/**
 * Baseline Comparison Card Component
 * Displays AI model performance vs. baseline models (persistence, seasonal)
 * Shows uplift percentage and sample counts for award evidence
 */

import React from 'react';
import { TrendingUp, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaselineComparisonCardProps {
  sourceType: 'solar' | 'wind';
  horizonHours: number;
  aiModelMae: number;
  persistenceBaselineMae: number;
  seasonalBaselineMae: number;
  sampleCount: number;
  completeness: number;
  className?: string;
}

export const BaselineComparisonCard: React.FC<BaselineComparisonCardProps> = ({
  sourceType,
  horizonHours,
  aiModelMae,
  persistenceBaselineMae,
  seasonalBaselineMae,
  sampleCount,
  completeness,
  className,
}) => {
  // Calculate uplift percentages
  const persistenceUplift = persistenceBaselineMae > 0
    ? ((persistenceBaselineMae - aiModelMae) / persistenceBaselineMae) * 100
    : 0;
  
  const seasonalUplift = seasonalBaselineMae > 0
    ? ((seasonalBaselineMae - aiModelMae) / seasonalBaselineMae) * 100
    : 0;

  // Determine if targets are met
  const meetsUpliftTarget = persistenceUplift >= 25 && seasonalUplift >= 25;
  const meetsSampleTarget = sampleCount >= 200;
  const meetsCompletenessTarget = completeness >= 95;

  const cardClass = cn(
    'rounded-xl border bg-white shadow-sm p-6',
    sourceType === 'solar' ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-blue-500',
    className
  );

  const badgeClass = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 capitalize">
            {sourceType} Forecast - {horizonHours}h Horizon
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            AI Model vs. Baseline Comparisons
          </p>
        </div>
        {meetsUpliftTarget && meetsSampleTarget && meetsCompletenessTarget && (
          <CheckCircle className="h-6 w-6 text-green-600" />
        )}
      </div>

      {/* Model Performance */}
      <div className="space-y-4">
        {/* AI Model */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-900">AI Model (XGBoost + ARIMA)</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {aiModelMae.toFixed(1)}% MAE
              </div>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Persistence Baseline */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-slate-700">Persistence Baseline</div>
            <div className="text-lg font-semibold text-slate-900 mt-1">
              {persistenceBaselineMae.toFixed(1)}% MAE
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              'text-sm font-medium',
              persistenceUplift >= 25 ? 'text-green-600' : 'text-orange-600'
            )}>
              {persistenceUplift >= 0 ? '+' : ''}{persistenceUplift.toFixed(1)}% uplift
            </div>
            {persistenceUplift >= 25 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600">Target met</span>
              </div>
            )}
          </div>
        </div>

        {/* Seasonal Baseline */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-slate-700">Seasonal Baseline</div>
            <div className="text-lg font-semibold text-slate-900 mt-1">
              {seasonalBaselineMae.toFixed(1)}% MAE
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              'text-sm font-medium',
              seasonalUplift >= 25 ? 'text-green-600' : 'text-orange-600'
            )}>
              {seasonalUplift >= 0 ? '+' : ''}{seasonalUplift.toFixed(1)}% uplift
            </div>
            {seasonalUplift >= 25 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600">Target met</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
        <span className={cn(
          badgeClass,
          meetsSampleTarget ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        )}>
          {sampleCount} samples
        </span>
        <span className={cn(
          badgeClass,
          meetsCompletenessTarget ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        )}>
          {completeness.toFixed(1)}% complete
        </span>
        {meetsUpliftTarget && (
          <span className={cn(badgeClass, 'bg-blue-100 text-blue-800')}>
            Award Ready 🏆
          </span>
        )}
      </div>
    </div>
  );
};

export default BaselineComparisonCard;
