/**
 * Storage Metrics Card - Compact Display
 * 
 * Shows key battery storage metrics in compact form:
 * - SoC (State of Charge)
 * - Renewable alignment %
 * - Actions count
 * - Revenue (expected vs realized)
 */

import React, { useState, useEffect } from 'react';
import { Battery, TrendingUp, Zap, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

interface StorageMetrics {
  battery: {
    soc_percent: number;
    soc_mwh: number;
    capacity_mwh: number;
  };
  alignment_pct_renewable_absorption: number;
  actions_count: number;
  soc_bounds_ok: boolean;
  expected_revenue_24h: number;
  expected_revenue_7d?: number;
  realized_revenue_24h?: number;
  provenance?: string;
  last_updated?: string;
}

interface StorageMetricsCardProps {
  province?: string;
  compact?: boolean;
}

export const StorageMetricsCard: React.FC<StorageMetricsCardProps> = ({
  province = 'ON',
  compact = true
}) => {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
    // Poll every 60 seconds for live updates
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, [province]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_EDGE_BASE}/api-v2-storage-dispatch/status?province=${province}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load storage metrics:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Battery className="animate-pulse text-gray-400" size={20} />
          <span className="text-sm text-gray-600">Loading storage...</span>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Battery className="text-gray-400" size={20} />
          <div>
            <div className="text-sm font-semibold text-gray-700">Storage Dispatch</div>
            <div className="text-xs text-gray-500">No data available</div>
          </div>
        </div>
      </div>
    );
  }

  const socPercent = metrics.battery?.soc_percent ?? 0;
  const socColor = socPercent >= 80 ? 'text-green-600' :
                   socPercent >= 50 ? 'text-blue-600' :
                   socPercent >= 20 ? 'text-yellow-600' : 'text-red-600';

  const alignmentPct = metrics.alignment_pct_renewable_absorption ?? 0;
  const alignmentColor = alignmentPct >= 70 ? 'text-green-600' :
                         alignmentPct >= 50 ? 'text-yellow-600' : 'text-orange-600';

  if (compact) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Battery className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Storage Dispatch</h3>
          </div>
          {metrics.soc_bounds_ok ? (
            <CheckCircle className="text-green-600" size={16} />
          ) : (
            <AlertTriangle className="text-red-600" size={16} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-600 mb-1">SoC</div>
            <div className={`text-lg font-bold ${socColor}`}>
              {(metrics.battery?.soc_percent ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              {(metrics.battery?.soc_mwh ?? 0).toFixed(1)} MWh
            </div>
          </div>

          <div>
            <div className="text-gray-600 mb-1">Alignment</div>
            <div className={`text-lg font-bold ${alignmentColor}`}>
              {(metrics.alignment_pct_renewable_absorption ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              {metrics.actions_count ?? 0} actions
            </div>
          </div>
        </div>

        {(metrics.expected_revenue_24h ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Expected Revenue (24h):</span>
              <span className="font-semibold text-green-600">
                ${(metrics.expected_revenue_24h ?? 0).toFixed(2)}
              </span>
            </div>
            {metrics.expected_revenue_7d && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Expected Revenue (7d):</span>
                <span className="font-semibold text-green-700">
                  ${Number(metrics.expected_revenue_7d).toFixed(0)}
                </span>
              </div>
            )}
            {metrics.provenance && (
              <div className="text-xs text-gray-500 mt-1">
                Provenance: {metrics.provenance}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Battery className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Storage Dispatch</h2>
              <p className="text-sm text-gray-500">Battery optimization metrics</p>
            </div>
          </div>
          {metrics.soc_bounds_ok ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Healthy
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Out of Bounds
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SoC */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Battery className={socColor} size={20} />
              <span className="text-sm font-medium text-gray-700">State of Charge</span>
            </div>
            <div className={`text-3xl font-bold ${socColor} mb-1`}>
              {(metrics.battery?.soc_percent ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              {(metrics.battery?.soc_mwh ?? 0).toFixed(1)} / {metrics.battery?.capacity_mwh ?? 0} MWh
            </div>
          </div>

          {/* Alignment */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={alignmentColor} size={20} />
              <span className="text-sm font-medium text-gray-700">Renewable Alignment</span>
            </div>
            <div className={`text-3xl font-bold ${alignmentColor} mb-1`}>
              {(metrics.alignment_pct_renewable_absorption ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              Curtailment absorption rate
            </div>
          </div>

          {/* Actions */}
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-purple-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Actions (24h)</span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {metrics.actions_count}
            </div>
            <div className="text-xs text-gray-600">
              Charge/discharge cycles
            </div>
          </div>

          {/* Revenue */}
          <div className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-emerald-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Expected Revenue</span>
            </div>
            <div className="text-3xl font-bold text-emerald-600 mb-1">
              ${(metrics.expected_revenue_24h ?? 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">
              24-hour window
            </div>
          </div>
        </div>

        {/* SoC Bounds Status */}
        <div className="mt-4 p-3 border rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            {metrics.soc_bounds_ok ? (
              <>
                <CheckCircle className="text-green-600" size={16} />
                <span className="text-sm text-gray-700">
                  SoC within operational bounds (20-80%)
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="text-red-600" size={16} />
                <span className="text-sm text-red-700">
                  ⚠️ SoC bounds violated - Review dispatch strategy
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageMetricsCard;
