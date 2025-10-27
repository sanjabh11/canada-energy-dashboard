/**
 * Operations Health Panel
 * 
 * Displays SLO metrics and operational health indicators:
 * - Ingestion uptime
 * - Forecast job success rate
 * - Job latency
 * - Data freshness
 * - Last purge run
 * 
 * Fetches from /ops-health endpoint and auto-refreshes every 30 seconds.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock, Zap, Database, TrendingUp } from 'lucide-react';

interface OpsHealthMetrics {
  ingestion_uptime_percent: number;
  forecast_job_success_rate: number;
  last_purge_run: string;
  avg_job_latency_ms: number;
  data_freshness_minutes: number;
  error_rate_percent: number;
  last_24h_jobs: {
    total: number;
    successful: number;
    failed: number;
  };
  slo_status: {
    ingestion: 'meeting' | 'degraded';
    forecast: 'meeting' | 'degraded';
    latency: 'meeting' | 'degraded';
    freshness: 'meeting' | 'degraded';
  };
  monitoring_status?: 'Active' | 'Offline' | string;
  timestamp: string;
}

interface OpsHealthPanelProps {
  variant?: 'compact' | 'full' | 'inline';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export const OpsHealthPanel: React.FC<OpsHealthPanelProps> = ({
  variant = 'compact',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<OpsHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOpsHealth = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_EDGE_BASE}/ops-health`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch ops health:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchOpsHealth, refreshInterval);
      return () => {
        clearInterval(interval);
        abortRef.current?.abort();
      };
    }

    return () => abortRef.current?.abort();
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: 'meeting' | 'degraded'): string => {
    return status === 'meeting' ? 'text-green-600' : 'text-yellow-600';
  };

  const getStatusBgColor = (status: 'meeting' | 'degraded'): string => {
    return status === 'meeting' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200';
  };

  const getStatusIcon = (status: 'meeting' | 'degraded') => {
    return status === 'meeting' 
      ? <CheckCircle className="text-green-600" size={16} />
      : <AlertTriangle className="text-yellow-600" size={16} />;
  };

  const getOverallStatus = (): 'healthy' | 'degraded' | 'critical' => {
    if (!metrics) return 'critical';
    
    const statuses = Object.values(metrics.slo_status);
    const degradedCount = statuses.filter(s => s === 'degraded').length;
    
    if (degradedCount === 0) return 'healthy';
    if (degradedCount <= 1) return 'degraded';
    return 'critical';
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Activity className="animate-spin text-gray-400" size={20} />
          <span className="text-sm text-gray-600">Loading ops health...</span>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <XCircle className="text-red-600" size={20} />
          <span className="text-sm text-red-800">Ops health unavailable</span>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();

  // Inline variant - single line status
  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border rounded-full text-sm">
        {overallStatus === 'healthy' && <CheckCircle className="text-green-600" size={14} />}
        {overallStatus === 'degraded' && <AlertTriangle className="text-yellow-600" size={14} />}
        {overallStatus === 'critical' && <XCircle className="text-red-600" size={14} />}
        <span className="font-medium">
          Ops: {overallStatus === 'healthy' ? 'Healthy' : overallStatus === 'degraded' ? 'Degraded' : 'Critical'}
        </span>
        <span className="text-xs text-gray-500">
          {metrics.ingestion_uptime_percent.toFixed(1)}% uptime
        </span>
      </div>
    );
  }

  // Compact variant - small card
  if (variant === 'compact') {
    return (
      <div className={`border-2 rounded-lg p-4 ${
        overallStatus === 'healthy' ? 'bg-green-50 border-green-200' :
        overallStatus === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className={
              overallStatus === 'healthy' ? 'text-green-600' :
              overallStatus === 'degraded' ? 'text-yellow-600' :
              'text-red-600'
            } size={20} />
            <h3 className="font-semibold text-gray-900">Ops Health</h3>
          </div>
          <div className="flex items-center gap-2">
            {metrics.monitoring_status && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                metrics.monitoring_status === 'Active' ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-800'
              }`}>
                Monitoring: {metrics.monitoring_status === 'Offline' ? 'Standby' : String(metrics.monitoring_status)}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              overallStatus === 'healthy' ? 'bg-green-200 text-green-800' :
              overallStatus === 'degraded' ? 'bg-yellow-200 text-yellow-800' :
              'bg-red-200 text-red-800'
            }`}>
              {overallStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              {getStatusIcon(metrics.slo_status.ingestion)}
              <span>Ingestion</span>
            </div>
            <div className="font-semibold text-gray-900">
              {metrics.ingestion_uptime_percent.toFixed(1)}%
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              {getStatusIcon(metrics.slo_status.forecast)}
              <span>Forecasts</span>
            </div>
            <div className="font-semibold text-gray-900">
              {metrics.forecast_job_success_rate.toFixed(1)}%
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              {getStatusIcon(metrics.slo_status.latency)}
              <span>Latency</span>
            </div>
            <div className="font-semibold text-gray-900">
              {metrics.avg_job_latency_ms}ms
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              {getStatusIcon(metrics.slo_status.freshness)}
              <span>Freshness</span>
            </div>
            <div className="font-semibold text-gray-900">
              {metrics.data_freshness_minutes < 60
                ? `${metrics.data_freshness_minutes}min`
                : `${Math.floor(metrics.data_freshness_minutes / 60)}h ${metrics.data_freshness_minutes % 60}min`}
            </div>
          </div>
        </div>

        {lastUpdate && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  }

  // Full variant - detailed card
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              overallStatus === 'healthy' ? 'bg-green-100' :
              overallStatus === 'degraded' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <Activity className={
                overallStatus === 'healthy' ? 'text-green-600' :
                overallStatus === 'degraded' ? 'text-yellow-600' :
                'text-red-600'
              } size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Operations Health</h2>
              <p className="text-sm text-gray-500">SLO Metrics & System Status</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            overallStatus === 'healthy' ? 'bg-green-100 text-green-800' :
            overallStatus === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {overallStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Ingestion Uptime */}
          <div className={`border-2 rounded-lg p-4 ${getStatusBgColor(metrics.slo_status.ingestion)}`}>
            <div className="flex items-center gap-2 mb-2">
              <Database className={getStatusColor(metrics.slo_status.ingestion)} size={20} />
              <span className="font-medium text-gray-900">Ingestion Uptime</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.ingestion_uptime_percent.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600">
              Target: ≥99.5% • Data freshness: {metrics.data_freshness_minutes < 60
                ? `${metrics.data_freshness_minutes}min`
                : `${Math.floor(metrics.data_freshness_minutes / 60)}h ${metrics.data_freshness_minutes % 60}min`}
            </div>
          </div>

          {/* Forecast Success Rate */}
          <div className={`border-2 rounded-lg p-4 ${getStatusBgColor(metrics.slo_status.forecast)}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={getStatusColor(metrics.slo_status.forecast)} size={20} />
              <span className="font-medium text-gray-900">Forecast Success</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.forecast_job_success_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              Target: ≥98% • Error rate: {metrics.error_rate_percent.toFixed(1)}%
            </div>
          </div>

          {/* Job Latency */}
          <div className={`border-2 rounded-lg p-4 ${getStatusBgColor(metrics.slo_status.latency)}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={getStatusColor(metrics.slo_status.latency)} size={20} />
              <span className="font-medium text-gray-900">Avg Job Latency</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.avg_job_latency_ms}ms
            </div>
            <div className="text-xs text-gray-600">
              Target: ≤500ms
            </div>
          </div>

          {/* Last 24h Jobs */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-gray-600" size={20} />
              <span className="font-medium text-gray-900">Last 24h Jobs</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.last_24h_jobs.successful}/{metrics.last_24h_jobs.total}
            </div>
            <div className="text-xs text-gray-600">
              Failed: {metrics.last_24h_jobs.failed}
            </div>
          </div>
        </div>

        {/* Last Purge Run */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Data Purge:</span>
            <span className="font-medium text-gray-900">
              {new Date(metrics.last_purge_run).toLocaleString()}
            </span>
          </div>
          {lastUpdate && (
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>Last Updated:</span>
              <span>{lastUpdate.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpsHealthPanel;
