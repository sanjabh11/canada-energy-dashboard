/**
 * Provenance Badge Component
 * 
 * Displays data source and quality indicators for transparency
 */

import React from 'react';
import { CheckCircle, AlertCircle, Info, Database, Activity } from 'lucide-react';
import { getProvenanceBadge, type ProvenanceType } from '../lib/types/provenance';

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  source?: string;
  completeness?: number;
  compact?: boolean;
  showTooltip?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  type,
  source,
  completeness,
  compact = false,
  showTooltip = true,
}) => {
  const badge = getProvenanceBadge(type);

  // Color mapping
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    teal: 'bg-teal-100 text-teal-800 border-teal-300',
  };

  const colorClass = colorClasses[badge.color as keyof typeof colorClasses] || colorClasses.gray;

  // Icon mapping
  const Icon = type === 'real_stream' ? Activity :
               type === 'historical_archive' ? Database :
               type === 'calibrated' ? CheckCircle :
               type === 'proxy_indicative' ? AlertCircle :
               Info;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
        title={showTooltip ? badge.description : undefined}
      >
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${colorClass}`}>
      <Icon className="h-4 w-4 mr-2" />
      <div className="flex flex-col">
        <span className="font-semibold">{badge.label}</span>
        {source && (
          <span className="text-xs opacity-75">Source: {source}</span>
        )}
        {completeness !== undefined && (
          <span className="text-xs opacity-75">
            Completeness: {(completeness ?? 0).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
};

interface DataQualityBadgeProps {
  completeness: number;
  sampleCount?: number;
  compact?: boolean;
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({
  completeness,
  sampleCount,
  compact = false,
}) => {
  let color: string;
  let label: string;
  let Icon: typeof CheckCircle;

  if (completeness >= 98) {
    color = 'bg-green-100 text-green-800 border-green-300';
    label = '⭐ Excellent';
    Icon = CheckCircle;
  } else if (completeness >= 95) {
    color = 'bg-blue-100 text-blue-800 border-blue-300';
    label = '✓ Good';
    Icon = CheckCircle;
  } else if (completeness >= 90) {
    color = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    label = '○ Acceptable';
    Icon = AlertCircle;
  } else {
    color = 'bg-orange-100 text-orange-800 border-orange-300';
    label = '⚠ Poor';
    Icon = AlertCircle;
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${color}`}>
      <Icon className="h-4 w-4 mr-2" />
      <div className="flex flex-col">
        <span className="font-semibold">{label} Quality</span>
        <span className="text-xs opacity-75">{(completeness ?? 0).toFixed(1)}% complete</span>
        {sampleCount && (
          <span className="text-xs opacity-75">n = {sampleCount.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
};

interface BaselineComparisonBadgeProps {
  improvement: number;
  baselineMethod: string;
  compact?: boolean;
}

export const BaselineComparisonBadge: React.FC<BaselineComparisonBadgeProps> = ({
  improvement,
  baselineMethod,
  compact = false,
}) => {
  const isPositive = improvement > 0;
  const color = isPositive
    ? 'bg-green-100 text-green-800 border-green-300'
    : 'bg-red-100 text-red-800 border-red-300';

  const Icon = isPositive ? CheckCircle : AlertCircle;
  const sign = isPositive ? '+' : '';

  if (compact) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
        {sign}{(improvement ?? 0).toFixed(0)}% vs {baselineMethod}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${color}`}>
      <Icon className="h-4 w-4 mr-2" />
      <div className="flex flex-col">
        <span className="font-semibold">{sign}{(improvement ?? 0).toFixed(1)}% Improvement</span>
        <span className="text-xs opacity-75">vs. {baselineMethod}</span>
      </div>
    </div>
  );
};
