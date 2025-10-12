/**
 * Forecast Baseline Comparison Component
 * 
 * Displays horizon-wise baseline uplift comparison:
 * - Model MAE vs Persistence baseline
 * - Model MAE vs Seasonal-Naive baseline
 * - Sample counts and completeness badges
 * - Confidence intervals
 */

import React from 'react';
import { TrendingUp, Target, Award, Info } from 'lucide-react';
import { DataQualityBadge } from './DataQualityBadge';

interface HorizonMetrics {
  horizon_hours: number;
  model_mae: number;
  persistence_mae: number;
  seasonal_naive_mae: number;
  uplift_vs_persistence: number;
  uplift_vs_seasonal: number;
  sample_count: number;
  completeness: number;
  confidence_interval: [number, number];
  meets_target: boolean;
}

interface ForecastBaselineComparisonProps {
  metrics: HorizonMetrics[];
  sourceType: 'solar' | 'wind';
  calibratedBy?: string;
}

export const ForecastBaselineComparison: React.FC<ForecastBaselineComparisonProps> = ({
  metrics,
  sourceType,
  calibratedBy = 'ECCC'
}) => {
  const target = sourceType === 'solar' ? 6.0 : 8.0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl border-2 border-blue-200">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {sourceType === 'solar' ? 'Solar' : 'Wind'} Forecast Baseline Comparison
              </h3>
              <p className="text-sm text-gray-600">
                Multi-horizon performance vs industry baselines
              </p>
            </div>
          </div>
          
          {calibratedBy && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
              <Award size={16} className="text-green-700" />
              <span className="text-sm font-medium text-green-900">
                Calibrated by {calibratedBy}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Horizon
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Model MAE
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Persistence
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Seasonal-Naive
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Uplift
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Quality
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {metrics.map((metric, idx) => {
              const meetsTarget = metric.model_mae <= target;
              const avgUplift = (metric.uplift_vs_persistence + metric.uplift_vs_seasonal) / 2;
              
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  {/* Horizon */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {metric.horizon_hours}h
                    </div>
                    <div className="text-xs text-gray-500">
                      ahead
                    </div>
                  </td>
                  
                  {/* Model MAE */}
                  <td className="px-4 py-3 text-center">
                    <div className={`text-lg font-bold ${meetsTarget ? 'text-green-600' : 'text-yellow-600'}`}>
                      {metric.model_mae.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      95% CI: [{metric.confidence_interval[0].toFixed(2)}, {metric.confidence_interval[1].toFixed(2)}]
                    </div>
                  </td>
                  
                  {/* Persistence Baseline */}
                  <td className="px-4 py-3 text-center">
                    <div className="text-lg font-medium text-gray-700">
                      {metric.persistence_mae.toFixed(2)}%
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      +{metric.uplift_vs_persistence.toFixed(1)}% uplift
                    </div>
                  </td>
                  
                  {/* Seasonal-Naive Baseline */}
                  <td className="px-4 py-3 text-center">
                    <div className="text-lg font-medium text-gray-700">
                      {metric.seasonal_naive_mae.toFixed(2)}%
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      +{metric.uplift_vs_seasonal.toFixed(1)}% uplift
                    </div>
                  </td>
                  
                  {/* Average Uplift */}
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                      <TrendingUp size={14} className="text-green-700" />
                      <span className="text-sm font-bold text-green-900">
                        +{avgUplift.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  
                  {/* Data Quality */}
                  <td className="px-4 py-3 text-center">
                    <DataQualityBadge
                      provenance={{
                        type: 'historical_archive',
                        source: 'forecast_performance_metrics',
                        timestamp: new Date().toISOString(),
                        confidence: 0.95,
                        completeness: metric.completeness
                      }}
                      sampleCount={metric.sample_count}
                      className="justify-center"
                    />
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {meetsTarget ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        <Target size={12} />
                        Meets Target
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        <Info size={12} />
                        Near Target
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Avg Model MAE</div>
            <div className="text-2xl font-bold text-blue-600">
              {(metrics.reduce((sum, m) => sum + m.model_mae, 0) / metrics.length).toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Avg Persistence</div>
            <div className="text-2xl font-bold text-gray-700">
              {(metrics.reduce((sum, m) => sum + m.persistence_mae, 0) / metrics.length).toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Avg Uplift</div>
            <div className="text-2xl font-bold text-green-600">
              +{(metrics.reduce((sum, m) => sum + m.uplift_vs_persistence, 0) / metrics.length).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Total Samples</div>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.reduce((sum, m) => sum + m.sample_count, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="bg-blue-50 border-t border-blue-200 p-4">
        <div className="flex items-start gap-2 text-sm text-blue-900">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>Baseline Methodology:</strong> Persistence assumes future = current value (naive forecast).
            Seasonal-naive assumes future = same hour last week (accounts for weekly patterns).
            Uplift shows % improvement over these industry-standard baselines.
            Target: {sourceType === 'solar' ? '≤6%' : '≤8%'} MAE for {sourceType} forecasting.
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version for dashboard cards
 */
export const ForecastBaselineComparisonCompact: React.FC<{
  avgMAE: number;
  avgUplift: number;
  sourceType: 'solar' | 'wind';
}> = ({ avgMAE, avgUplift, sourceType }) => {
  const target = sourceType === 'solar' ? 6.0 : 8.0;
  const meetsTarget = avgMAE <= target;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Baseline Comparison</h4>
        <TrendingUp className="text-blue-600" size={20} />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">Model MAE</div>
          <div className={`text-2xl font-bold ${meetsTarget ? 'text-green-600' : 'text-yellow-600'}`}>
            {avgMAE.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Avg Uplift</div>
          <div className="text-2xl font-bold text-green-600">
            +{avgUplift.toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        {meetsTarget ? (
          <div className="flex items-center gap-1 text-xs text-green-700">
            <Target size={12} />
            <span>Meets {sourceType} target (≤{target}%)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-yellow-700">
            <Info size={12} />
            <span>Near target (≤{target}%)</span>
          </div>
        )}
      </div>
    </div>
  );
};
