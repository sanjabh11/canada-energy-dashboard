/**
 * Storage Dispatch Dashboard
 * 
 * Visualizes battery storage dispatch decisions, SoC trends,
 * and renewable absorption for award evidence.
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Battery, TrendingUp, Zap, DollarSign, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ProvenanceBadge, DataQualityBadge } from './ProvenanceBadge';
import { cn } from '@/lib/utils';
import { HelpButton } from './HelpButton';

interface BatteryState {
  soc_percent: number;
  soc_mwh: number;
  capacity_mwh: number;
  power_rating_mw: number;
  last_updated: string;
}

interface DispatchLog {
  id: string;
  action: 'charge' | 'discharge' | 'hold';
  power_mw: number;
  soc_before_percent: number;
  soc_after_percent: number;
  reason: string;
  expected_revenue_cad: number;
  renewable_absorption: boolean;
  curtailment_mitigation: boolean;
  dispatched_at: string;
}

const StorageDispatchDashboard: React.FC = () => {
  const [province, setProvince] = useState('ON');
  const [batteryState, setBatteryState] = useState<BatteryState | null>(null);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [alignmentMetrics, setAlignmentMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const provinces = ['ON', 'AB', 'BC', 'QC'];

  useEffect(() => {
    loadDispatchData();
  }, [province]);

  const loadDispatchData = async () => {
    setLoading(true);
    try {
      // Load battery state and alignment metrics from API
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_EDGE_BASE}/api-v2-storage-dispatch/status?province=${province}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );
        if (response.ok) {
          const statusData = await response.json();
          setBatteryState(statusData.battery);
          setAlignmentMetrics({
            alignment_pct: statusData.alignment_pct_renewable_absorption,
            soc_bounds_ok: statusData.soc_bounds_ok,
            actions_count: statusData.actions_count
          });
        }
      } catch (error) {
        console.error('Failed to fetch status from API:', error);
        // Fallback to direct database query
        const { data: stateData } = await supabase
          .from('batteries_state')
          .select('*')
          .eq('province', province)
          .order('last_updated', { ascending: false })
          .limit(1)
          .single();
        setBatteryState(stateData);
      }

      // Load dispatch logs
      const { data: logsData } = await supabase
        .from('storage_dispatch_logs')
        .select('*')
        .eq('province', province)
        .order('dispatched_at', { ascending: false })
        .limit(50);

      setLogs(logsData || []);
    } catch (error) {
      console.error('Failed to load dispatch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const chargeEvents = logs.filter(l => l.action === 'charge').length;
  const dischargeEvents = logs.filter(l => l.action === 'discharge').length;
  const renewableAbsorption = logs.filter(l => l.renewable_absorption).length;
  const totalRevenue = logs.reduce((sum, l) => sum + (l.expected_revenue_cad || 0), 0);

  // Prepare chart data
  const socTrendData = logs.slice(0, 20).reverse().map(log => ({
    time: new Date(log.dispatched_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    soc: log.soc_after_percent,
    action: log.action,
  }));

  const actionDistribution = [
    { name: 'Charge', value: chargeEvents, fill: '#10b981' },
    { name: 'Discharge', value: dischargeEvents, fill: '#ef4444' },
    { name: 'Hold', value: logs.length - chargeEvents - dischargeEvents, fill: '#94a3b8' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Battery Storage Dispatch</h1>
              <p className="text-slate-600 mt-2">Rule-Based Optimization for Curtailment Mitigation</p>
            </div>
            <HelpButton id="storage.dispatch.overview" />
          </div>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white"
          >
            {provinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Current State KPIs */}
        {batteryState && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Battery className="h-8 w-8 text-blue-600" />
                <span className="text-sm text-slate-600">Current SoC</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{batteryState.soc_percent.toFixed(1)}%</div>
              <div className="text-sm text-slate-500 mt-1">{batteryState.soc_mwh.toFixed(1)} / {batteryState.capacity_mwh} MWh</div>
              {alignmentMetrics?.soc_bounds_ok !== undefined && (
                <div className="mt-2">
                  {alignmentMetrics.soc_bounds_ok ? (
                    <span className="text-xs text-green-600 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" /> Bounds OK
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Out of bounds
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <span className="text-sm text-slate-600">Renewable Alignment</span>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {alignmentMetrics?.alignment_pct?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-sm text-slate-500 mt-1">
                {renewableAbsorption} of {logs.length} cycles
              </div>
              {(alignmentMetrics?.alignment_pct || 0) >= 35 && (
                <div className="mt-2">
                  <span className="text-xs text-green-600 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Target met! 🏆
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-8 w-8 text-purple-600" />
                <span className="text-sm text-slate-600">Total Actions</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {alignmentMetrics?.actions_count || logs.length}
              </div>
              <div className="text-sm text-slate-500 mt-1">{chargeEvents} charge, {dischargeEvents} discharge</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-orange-600" />
                <span className="text-sm text-slate-600">Total Revenue</span>
              </div>
              <div className="text-3xl font-bold text-orange-600">${totalRevenue.toFixed(0)}</div>
              <div className="text-sm text-slate-500 mt-1">Expected arbitrage</div>
            </div>
          </div>
        )}

        {/* Award Evidence Summary */}
        {alignmentMetrics && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900">Storage Dispatch Award Evidence</div>
                <div className="text-sm text-green-700 mt-1">
                  <strong>{alignmentMetrics.alignment_pct?.toFixed(1)}%</strong> of dispatch cycles aligned with renewable absorption. 
                  SoC bounds: <strong>{alignmentMetrics.soc_bounds_ok ? 'OK' : 'Violated'}</strong>. 
                  Total actions logged: <strong>{alignmentMetrics.actions_count}</strong>.
                  {(alignmentMetrics.alignment_pct || 0) >= 35 && ' ✅ Exceeds 35% target for award submission.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Provenance & Quality Badges */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-3">
            <ProvenanceBadge type="real_stream" source="Rule-Based Dispatch Engine" />
            <DataQualityBadge completeness={100} sampleCount={logs.length} />
            {renewableAbsorption > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-300">
                🌱 {renewableAbsorption} Renewable Absorption Events
              </span>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SoC Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">State of Charge Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={socTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} label={{ value: 'SoC %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="soc" stroke="#3b82f6" strokeWidth={2} name="SoC %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Action Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Action Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actionDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Dispatch Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Dispatch Decisions</h3>
          <div className="space-y-3">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-start space-x-3">
                  {log.action === 'charge' && <Battery className="h-5 w-5 text-green-600 mt-0.5" />}
                  {log.action === 'discharge' && <Zap className="h-5 w-5 text-orange-600 mt-0.5" />}
                  {log.action === 'hold' && <Activity className="h-5 w-5 text-gray-600 mt-0.5" />}
                  <div>
                    <div className="font-medium text-slate-900 capitalize">{log.action} - {log.power_mw.toFixed(1)} MW</div>
                    <div className="text-sm text-slate-600">{log.reason}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      SoC: {log.soc_before_percent.toFixed(1)}% → {log.soc_after_percent.toFixed(1)}%
                      {log.renewable_absorption && ' • 🌱 Renewable Absorption'}
                      {log.curtailment_mitigation && ' • ⚡ Curtailment Mitigation'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900">${log.expected_revenue_cad.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">{new Date(log.dispatched_at).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageDispatchDashboard;
