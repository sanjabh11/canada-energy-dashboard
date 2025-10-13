/**
 * Storage Dispatch Log Component
 * 
 * Displays recent battery storage dispatch decisions with:
 * - Action history (charge/discharge/hold)
 * - SoC changes and bounds validation
 * - Reasoning for each decision
 * - Expected vs actual revenue
 * - Alignment with curtailment events
 */

import React, { useEffect, useState } from 'react';
import { Battery, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DataQualityBadge } from './DataQualityBadge';

interface DispatchAction {
  id: string;
  timestamp: string;
  battery_id: string;
  province: string;
  action: 'charge' | 'discharge' | 'hold';
  soc_before: number;
  soc_after: number;
  power_mw: number;
  reason: string;
  expected_revenue_cad: number;
  actual_revenue_cad?: number;
  curtailment_event_id?: string;
  price_signal?: number;
}

interface AlignmentMetrics {
  total_curtailment_events: number;
  storage_responses: number;
  alignment_percent: number;
  avg_response_time_minutes: number;
}

export const StorageDispatchLog: React.FC<{
  province?: string;
  limit?: number;
  showMetrics?: boolean;
}> = ({
  province = 'ON',
  limit = 20,
  showMetrics = true
}) => {
  const [actions, setActions] = useState<DispatchAction[]>([]);
  const [alignment, setAlignment] = useState<AlignmentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'storage_dispatch_log' | 'storage_dispatch_logs'>('storage_dispatch_logs');

  useEffect(() => {
    fetchDispatchLog();
    if (showMetrics) {
      fetchAlignmentMetrics();
    }
  }, [province, limit]);

  const fetchDispatchLog = async () => {
    try {
      setLoading(true);
      // Attempt 1: singular table (scheduler path)
      let source: 'singular' | 'plural' = 'singular';
      const mapped: DispatchAction[] = [];

      // Try singular first; province filter may not exist on this table, so catch errors
      let singularOk = false;
      try {
        const q = supabase
          .from('storage_dispatch_log')
          .select('*')
          .eq('province', province)
          .limit(limit);
        const { data: singData, error: singErr } = await q;

        if (!singErr && (singData?.length ?? 0) > 0) {
          singularOk = true;
          for (const r of singData!) {
            mapped.push({
              id: (r as any).id,
              timestamp: (r as any).decision_timestamp || (r as any).timestamp || (r as any).created_at || new Date().toISOString(),
              battery_id: (r as any).battery_id || 'unknown',
              province: province,
              action: (r as any).action,
              soc_before: (r as any).soc_before_pct ?? (r as any).soc_before_percent ?? (r as any).soc_before ?? 0,
              soc_after: (r as any).soc_after_pct ?? (r as any).soc_after_percent ?? (r as any).soc_after ?? 0,
              power_mw: (r as any).magnitude_mw ?? (r as any).power_mw ?? 0,
              reason: (r as any).reasoning ?? (r as any).reason ?? '',
              expected_revenue_cad: (r as any).expected_revenue_cad ?? 0,
              actual_revenue_cad: (r as any).actual_revenue_cad ?? null,
              curtailment_event_id: (r as any).curtailment_event_id ?? undefined,
              price_signal: (r as any).grid_price_cad_per_mwh ?? (r as any).market_price_cad_per_mwh ?? null,
            });
          }
        }
      } catch (_) {
        // ignore and fallback
      }

      // Attempt 2: plural table (engine path)
      if (!singularOk) {
        source = 'plural';
        // Try with timestamp ordering first; if it errors, retry without ordering
        let pluralData: any[] | null = null;
        let pluralErr: any = null;
        try {
          const { data, error } = await supabase
            .from('storage_dispatch_logs')
            .select('*')
            .eq('province', province)
            .order('timestamp', { ascending: false })
            .limit(limit);
          pluralData = data ?? null;
          pluralErr = error ?? null;
        } catch (e) {
          pluralErr = e;
        }

        if (pluralErr) {
          const { data } = await supabase
            .from('storage_dispatch_logs')
            .select('*')
            .eq('province', province)
            .limit(limit);
          pluralData = data ?? null;
        }

        for (const r of pluralData ?? []) {
          mapped.push({
            id: (r as any).id,
            timestamp: (r as any).timestamp || (r as any).decision_timestamp || (r as any).created_at || new Date().toISOString(),
            battery_id: (r as any).battery_id || (r as any).battery || 'unknown',
            province: (r as any).province || province,
            action: (r as any).action,
            soc_before: (r as any).soc_before_percent ?? (r as any).soc_before_pct ?? (r as any).soc_before ?? 0,
            soc_after: (r as any).soc_after_percent ?? (r as any).soc_after_pct ?? (r as any).soc_after ?? 0,
            power_mw: (r as any).power_mw ?? (r as any).magnitude_mw ?? 0,
            reason: (r as any).reason ?? (r as any).reasoning ?? '',
            expected_revenue_cad: (r as any).expected_revenue_cad ?? 0,
            actual_revenue_cad: (r as any).actual_revenue_cad ?? null,
            curtailment_event_id: (r as any).curtailment_event_id ?? undefined,
            price_signal: (r as any).market_price_cad_per_mwh ?? (r as any).grid_price_cad_per_mwh ?? null,
          });
        }
      }

      setActions(mapped);
      setDataSource(source === 'singular' ? 'storage_dispatch_log' : 'storage_dispatch_logs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatch log');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlignmentMetrics = async () => {
    try {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get curtailment events
      const { data: events } = await supabase
        .from('curtailment_events')
        .select('id, occurred_at')
        .eq('province', province)
        .gte('occurred_at', startDate);

      // Get storage actions
      const { data: storageActions } = await supabase
        .from('storage_dispatch_logs')
        .select('timestamp, action, curtailment_event_id')
        .eq('province', province)
        .eq('action', 'charge')
        .gte('timestamp', startDate);

      if (events && storageActions) {
        // Calculate alignment
        let alignedCount = 0;
        let totalResponseTime = 0;

        events.forEach(event => {
          const eventTime = new Date(event.occurred_at).getTime();
          const response = storageActions.find(action => {
            const actionTime = new Date(action.timestamp).getTime();
            const timeDiff = Math.abs(actionTime - eventTime) / (1000 * 60); // minutes
            return timeDiff < 30; // Within 30 minutes
          });

          if (response) {
            alignedCount++;
            const responseTime = Math.abs(
              new Date(response.timestamp).getTime() - eventTime
            ) / (1000 * 60);
            totalResponseTime += responseTime;
          }
        });

        setAlignment({
          total_curtailment_events: events.length,
          storage_responses: alignedCount,
          alignment_percent: (alignedCount / events.length) * 100,
          avg_response_time_minutes: alignedCount > 0 ? totalResponseTime / alignedCount : 0
        });
      }
    } catch (err) {
      console.error('Failed to calculate alignment:', err);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'charge': return <TrendingUp className="text-blue-600" size={18} />;
      case 'discharge': return <TrendingDown className="text-green-600" size={18} />;
      case 'hold': return <Minus className="text-gray-600" size={18} />;
      default: return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'charge': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'discharge': return 'bg-green-50 border-green-200 text-green-800';
      case 'hold': return 'bg-gray-50 border-gray-200 text-gray-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const validateSoCBounds = (action: DispatchAction): boolean => {
    // SoC should stay within 10-90% for optimal battery health
    return action.soc_after >= 10 && action.soc_after <= 90;
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Battery size={20} className="text-blue-600" />
          Storage Dispatch Log
        </h3>
        <DataQualityBadge
          provenance={{
            type: 'real_stream',
            source: dataSource,
            timestamp: new Date().toISOString(),
            confidence: 1,
            completeness: 1
          }}
          sampleCount={actions.length}
        />
      </div>

      {/* Alignment Metrics */}
      {showMetrics && alignment && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">Curtailment Events</div>
            <div className="text-2xl font-bold text-blue-900">
              {alignment.total_curtailment_events}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1">Storage Responses</div>
            <div className="text-2xl font-bold text-green-900">
              {alignment.storage_responses}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">Alignment</div>
            <div className="text-2xl font-bold text-purple-900">
              {alignment.alignment_percent.toFixed(0)}%
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1">Avg Response Time</div>
            <div className="text-2xl font-bold text-orange-900">
              {alignment.avg_response_time_minutes.toFixed(0)}m
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Actions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Battery</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SoC Change</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bounds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {actions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No dispatch actions recorded yet
                </td>
              </tr>
            ) : (
              actions.map((action) => {
                const isValid = validateSoCBounds(action);
                const revenueActual = action.actual_revenue_cad ?? action.expected_revenue_cad;
                const revenueVariance = action.actual_revenue_cad
                  ? ((action.actual_revenue_cad / action.expected_revenue_cad - 1) * 100)
                  : 0;

                return (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(action.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {action.battery_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getActionColor(action.action)}`}>
                        {getActionIcon(action.action)}
                        {action.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="font-mono">
                        {action.soc_before}% → {action.soc_after}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Math.abs(action.power_mw).toFixed(1)} MW
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {action.reason}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign size={12} className="text-green-600" />
                        <span className="font-medium">{revenueActual.toFixed(0)}</span>
                        {action.actual_revenue_cad && (
                          <span className={`text-xs ${revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({revenueVariance >= 0 ? '+' : ''}{revenueVariance.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isValid ? (
                        <CheckCircle size={16} className="text-green-600" aria-label="SoC within optimal bounds (10-90%)" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" aria-label="SoC outside optimal bounds" />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <CheckCircle size={14} className="text-green-600" />
          <span>SoC within bounds (10-90%)</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle size={14} className="text-red-600" />
          <span>SoC outside optimal range</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign size={14} className="text-green-600" />
          <span>Revenue: Expected (Actual ±variance)</span>
        </div>
      </div>
    </div>
  );
};
