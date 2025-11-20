/**
 * Data Quality Badge Component
 * 
 * Displays data quality indicators including:
 * - Provenance type (Historical, Real-time, Forecast)
 * - Sample count
 * - Completeness percentage
 * - Confidence score
 */

import React from 'react';
import { ProvenanceMetadata, getProvenanceBadge } from '@/lib/types/provenance';

interface DataQualityBadgeProps {
  provenance: ProvenanceMetadata;
  sampleCount?: number;
  className?: string;
  showDetails?: boolean;
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({
  provenance,
  sampleCount,
  className = '',
  showDetails = false
}) => {
  const badge = getProvenanceBadge(provenance.type);
  const quality = provenance.confidence * (provenance.completeness || 1);
  
  // Don't show mock/simulated in production
  if (provenance.type === 'mock' || provenance.type === 'simulated') {
    return null;
  }
  
  // Handle undefined badge (invalid provenance type)
  if (!badge) {
    console.warn('Invalid provenance type:', provenance.type);
    return null;
  }
  
  const qualityColor = quality >= 0.9 ? 'bg-green-100 text-green-800 border-green-300' :
                       quality >= 0.7 ? 'bg-blue-100 text-blue-800 border-blue-300' :
                       'bg-yellow-100 text-yellow-800 border-yellow-300';
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${qualityColor} text-sm ${className}`}>
      <span title={badge.description}>{badge.icon}</span>
      <span className="font-medium">{badge.label}</span>
      
      {sampleCount !== undefined && (
        <span className="text-xs opacity-75">n={sampleCount}</span>
      )}
      
      {provenance.completeness !== undefined && (
        <span className="text-xs opacity-75">
          {(provenance.completeness * 100).toFixed(0)}% complete
        </span>
      )}
      
      {showDetails && (
        <span 
          className="text-xs opacity-75 cursor-help" 
          title={`Confidence: ${(provenance.confidence * 100).toFixed(0)}%\nSource: ${provenance.source}`}
        >
          ℹ️
        </span>
      )}
    </div>
  );
};

/**
 * Compact version for inline display
 */
export const DataQualityBadgeCompact: React.FC<{
  type: ProvenanceMetadata['type'];
  confidence?: number;
}> = ({ type, confidence = 1 }) => {
  const badge = getProvenanceBadge(type);
  
  if (type === 'mock' || type === 'simulated') {
    return null;
  }
  
  if (!badge) {
    console.warn('Invalid provenance type:', type);
    return null;
  }
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary text-primary"
      title={`${badge.label}: ${badge.description}`}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
      {confidence < 1 && (
        <span className="opacity-75">({(confidence * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
};

/**
 * Data Quality Summary Card
 */
interface DataQualitySummaryProps {
  totalRecords: number;
  provenanceBreakdown: Record<string, number>;
  avgCompleteness: number;
  avgConfidence: number;
  period: string;
}

export const DataQualitySummary: React.FC<DataQualitySummaryProps> = ({
  totalRecords,
  provenanceBreakdown,
  avgCompleteness,
  avgConfidence,
  period
}) => {
  const overallQuality = avgCompleteness * avgConfidence;
  const qualityGrade = overallQuality >= 0.95 ? 'A' :
                       overallQuality >= 0.85 ? 'B' :
                       overallQuality >= 0.75 ? 'C' : 'D';
  
  const gradeColor = qualityGrade === 'A' ? 'text-green-600' :
                     qualityGrade === 'B' ? 'text-blue-600' :
                     qualityGrade === 'C' ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-primary">Data Quality</h3>
        <span className={`text-2xl font-bold ${gradeColor}`}>{qualityGrade}</span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-secondary">Total Records:</span>
          <span className="font-medium text-primary">{totalRecords.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-secondary">Completeness:</span>
          <span className="font-medium text-primary">{(avgCompleteness * 100).toFixed(1)}%</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-secondary">Confidence:</span>
          <span className="font-medium text-primary">{(avgConfidence * 100).toFixed(1)}%</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-secondary">Period:</span>
          <span className="font-medium text-primary">{period}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
        <div className="text-xs text-tertiary mb-2">Data Sources:</div>
        <div className="space-y-1">
          {Object.entries(provenanceBreakdown).map(([type, count]) => {
            const badge = getProvenanceBadge(type as any);
            const percentage = (count / totalRecords * 100).toFixed(1);
            
            if (!badge) return null;
            
            return (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-secondary">
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
                <span className="text-tertiary">
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}  
        </div>
      </div>
    </div>
  );
};
