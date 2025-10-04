/**
 * Feature Availability Page
 * 
 * User-facing page showing what's available in Phase 1 launch
 * and what's coming in Phase 2.
 */

import React, { useState, useMemo } from 'react';
import { CheckCircle, Clock, AlertTriangle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { FEATURE_REGISTRY, getDeploymentStats, type FeatureStatus, type FeatureConfig } from '../lib/featureFlags';
import { CONTAINER_CLASSES } from '../lib/ui/layout';

const STATUS_CONFIG = {
  production_ready: {
    label: 'Production Ready',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: '✨',
  },
  acceptable: {
    label: 'Available',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: '🟡',
  },
  partial: {
    label: 'Limited',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badge: '🟠',
  },
  deferred: {
    label: 'Coming Soon',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badge: '🔜',
  },
};

const FeatureCard: React.FC<{ feature: FeatureConfig }> = ({ feature }) => {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[feature.status];
  const Icon = config.icon;

  return (
    <div className={`border-2 ${config.borderColor} rounded-lg p-4 ${config.bgColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-6 w-6 ${config.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{feature.name}</h3>
              <span className="text-xl">{config.badge}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
              <span className={`font-medium ${config.color}`}>{config.label}</span>
              <span>Rating: {feature.rating}/5</span>
              {feature.estimatedRelease && (
                <span className="text-gray-500">• Est: {feature.estimatedRelease}</span>
              )}
            </div>

            {feature.limitations && feature.limitations.length > 0 && (
              <>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {expanded ? 'Hide' : 'Show'} limitations ({feature.limitations.length})
                </button>

                {expanded && (
                  <div className="mt-3 pl-4 border-l-2 border-gray-300">
                    <p className="text-xs font-medium text-gray-700 mb-2">Known Limitations:</p>
                    <ul className="space-y-1.5">
                      {feature.limitations.map((limitation, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-gray-400" />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {!feature.enabled && feature.status === 'deferred' && (
              <div className="mt-2 text-xs text-gray-600 italic">
                This feature is under development for Phase 2 release.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeatureAvailability: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<FeatureStatus | 'all'>('all');
  const stats = useMemo(() => getDeploymentStats(), []);

  const features = useMemo(() => {
    const allFeatures = Object.values(FEATURE_REGISTRY);
    if (filterStatus === 'all') {
      return allFeatures;
    }
    return allFeatures.filter(f => f.status === filterStatus);
  }, [filterStatus]);

  const groupedFeatures = useMemo(() => {
    return {
      production_ready: features.filter(f => f.status === 'production_ready'),
      acceptable: features.filter(f => f.status === 'acceptable'),
      partial: features.filter(f => f.status === 'partial'),
      deferred: features.filter(f => f.status === 'deferred'),
    };
  }, [features]);

  return (
    <div className={CONTAINER_CLASSES.page}>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Feature Availability - Phase 1 Launch
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Transparency about what's working, what has limitations, and what's coming next.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total Features</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{stats.productionReady}</div>
              <div className="text-xs text-green-700 mt-1">Production Ready</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{stats.acceptable}</div>
              <div className="text-xs text-blue-700 mt-1">Available</div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-700">{stats.partial}</div>
              <div className="text-xs text-yellow-700 mt-1">Limited</div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-700">{stats.deferred}</div>
              <div className="text-xs text-gray-700 mt-1">Coming Soon</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Features ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('production_ready')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'production_ready'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            ✨ Production Ready ({stats.productionReady})
          </button>
          <button
            onClick={() => setFilterStatus('acceptable')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'acceptable'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            🟡 Available ({stats.acceptable})
          </button>
          <button
            onClick={() => setFilterStatus('partial')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'partial'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
            }`}
          >
            🟠 Limited ({stats.partial})
          </button>
          <button
            onClick={() => setFilterStatus('deferred')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'deferred'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            🔜 Coming Soon ({stats.deferred})
          </button>
        </div>

        {/* Feature Lists */}
        <div className="space-y-8">
          {/* Production Ready */}
          {(filterStatus === 'all' || filterStatus === 'production_ready') && groupedFeatures.production_ready.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">✨</span>
                Production Ready - No Limitations
              </h2>
              <p className="text-gray-600 mb-4">
                These features are fully functional and tested. Use with confidence for production workloads.
              </p>
              <div className="space-y-3">
                {groupedFeatures.production_ready.map(feature => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            </div>
          )}

          {/* Acceptable */}
          {(filterStatus === 'all' || filterStatus === 'acceptable') && groupedFeatures.acceptable.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">🟡</span>
                Available - Known Limitations
              </h2>
              <p className="text-gray-600 mb-4">
                These features work well within documented limitations. Review limitations before use.
              </p>
              <div className="space-y-3">
                {groupedFeatures.acceptable.map(feature => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            </div>
          )}

          {/* Partial */}
          {(filterStatus === 'all' || filterStatus === 'partial') && groupedFeatures.partial.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">🟠</span>
                Limited Functionality - Use with Caution
              </h2>
              <p className="text-gray-600 mb-4">
                These features have significant limitations. Suitable for exploration and visualization, not critical decisions.
              </p>
              <div className="space-y-3">
                {groupedFeatures.partial.map(feature => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            </div>
          )}

          {/* Deferred */}
          {(filterStatus === 'all' || filterStatus === 'deferred') && groupedFeatures.deferred.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">🔜</span>
                Coming in Phase 2 - Q1 2026
              </h2>
              <p className="text-gray-600 mb-4">
                These features are under active development and will be available in the Phase 2 release.
              </p>
              <div className="space-y-3">
                {groupedFeatures.deferred.map(feature => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Your Feedback Shapes Phase 2
          </h3>
          <p className="text-blue-800 text-sm mb-3">
            Help us prioritize what matters most. Which deferred features would add the most value for you?
            What limitations in available features cause the most friction?
          </p>
          <p className="text-blue-700 text-xs">
            Use the feedback button (top right) or help system to share your thoughts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeatureAvailability;
