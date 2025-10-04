/**
 * Feature Status Badge Component
 * 
 * Displays status badges for features based on their readiness level.
 * Used throughout the platform to indicate feature availability and limitations.
 */

import React from 'react';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getFeature, type FeatureStatus } from '../lib/featureFlags';

interface FeatureStatusBadgeProps {
  featureId: string;
  showLimitations?: boolean;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIGS: Record<FeatureStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
  textColor: string;
  borderColor: string;
}> = {
  production_ready: {
    label: 'Production Ready',
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  acceptable: {
    label: 'Available',
    icon: CheckCircle,
    className: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  partial: {
    label: 'Limited Availability',
    icon: AlertTriangle,
    className: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
  },
  deferred: {
    label: 'Coming Soon',
    icon: Clock,
    className: 'bg-gray-50 border-gray-200',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
};

export const FeatureStatusBadge: React.FC<FeatureStatusBadgeProps> = ({
  featureId,
  showLimitations = false,
  compact = false,
  className = '',
}) => {
  const feature = getFeature(featureId);
  
  if (!feature) {
    return null;
  }

  const config = STATUS_CONFIGS[feature.status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.className} ${config.textColor} ${className}`}
        title={feature.limitations?.join('; ')}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`${config.className} ${config.textColor} border ${config.borderColor} rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{config.label}</span>
            <span className="text-xs opacity-75">Rating: {feature.rating}/5</span>
          </div>
          
          {feature.estimatedRelease && (
            <p className="text-xs mt-1 opacity-90">
              Expected: {feature.estimatedRelease}
            </p>
          )}
          
          {showLimitations && feature.limitations && feature.limitations.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium">Known Limitations:</p>
              <ul className="text-xs space-y-0.5 list-disc list-inside opacity-90">
                {feature.limitations.map((limitation, idx) => (
                  <li key={idx}>{limitation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline feature warning for deferred features
 */
export const DeferredFeatureNotice: React.FC<{ featureId: string }> = ({ featureId }) => {
  const feature = getFeature(featureId);
  
  if (!feature || feature.status !== 'deferred') {
    return null;
  }

  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {feature.name}
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        This feature is under development and will be available in Phase 2.
      </p>
      {feature.estimatedRelease && (
        <p className="text-xs text-gray-500">
          Expected Release: {feature.estimatedRelease}
        </p>
      )}
    </div>
  );
};

/**
 * Partial feature warning banner
 */
export const PartialFeatureWarning: React.FC<{ featureId: string; className?: string }> = ({
  featureId,
  className = '',
}) => {
  const feature = getFeature(featureId);
  
  if (!feature || feature.status !== 'partial') {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Limited Functionality
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              This feature is available with the following limitations:
            </p>
            {feature.limitations && feature.limitations.length > 0 && (
              <ul className="list-disc list-inside space-y-1">
                {feature.limitations.map((limitation, idx) => (
                  <li key={idx}>{limitation}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Acceptable feature info banner (less prominent than partial)
 */
export const AcceptableFeatureInfo: React.FC<{ featureId: string; className?: string }> = ({
  featureId,
  className = '',
}) => {
  const feature = getFeature(featureId);
  
  if (!feature || feature.status !== 'acceptable' || !feature.limitations || feature.limitations.length === 0) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-xs font-medium text-blue-800">
            Feature Notes
          </h3>
          <div className="mt-1 text-xs text-blue-700">
            <ul className="list-disc list-inside space-y-0.5">
              {feature.limitations.map((limitation, idx) => (
                <li key={idx}>{limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureStatusBadge;
