/**
 * AI Data Centre Energy Dashboard
 *
 * Strategic Priority: Alberta's $100B AI Data Centre Strategy
 * Problem Solved: AESO's 10GW+ interconnection queue management crisis
 *
 * Key Features:
 * - Real-time data centre power consumption tracking
 * - AESO interconnection queue visualization
 * - Phase 1 allocation monitoring (1,200 MW limit)
 * - Grid impact analysis (% of peak demand)
 * - Operator breakdown and PUE efficiency tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, ComposedChart, Area
} from 'recharts';
import {
  Server, Zap, TrendingUp, AlertTriangle,
  MapPin, Activity, Gauge, Cloud, DollarSign
} from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';
import { isEdgeFetchEnabled } from '../lib/config';
import { AIDemandScenarioSlider } from './AIDemandScenarioSlider';
import DataTrustNotice from './DataTrustNotice';
import { runMlForecast } from '../lib/mlForecastingClient';
import { DataFreshnessBadge } from './ui/DataFreshnessBadge';
import { buildDataProvenance } from '../lib/foundation';
import { loadDashboardSnapshot, saveDashboardSnapshot } from '../lib/dashboardSnapshotCache';
import { DataFreshnessIndicator } from './ui/DataFreshnessBadge';
import {
  type DashboardData, type QueueData, type QueueHistoryData, type MetricCardProps,
  COLORS, STATUS_COLORS, getProvinceName,
} from './ai-datacentre/types';

interface AIDataCentreDashboardSnapshot {
  dcData: DashboardData;
  queueData: QueueData | null;
  queueHistory: QueueHistoryData | null;
}

const AI_DATA_CENTRE_SNAPSHOT_KEY = 'dashboard_snapshot_ai_data_centre';

export const AIDataCentreDashboard: React.FC = () => {
  const [dcData, setDcData] = useState<DashboardData | null>(null);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [edgeDisabled, setEdgeDisabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [usingCachedSnapshot, setUsingCachedSnapshot] = useState(false);
  const [sourceUnavailable, setSourceUnavailable] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('AB'); // Alberta focus
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [selectedDataCentre, setSelectedDataCentre] = useState<DashboardData['data_centres'][0] | null>(null);
  const [byopInsights, setByopInsights] = useState<any>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEdgeDisabled(false);
    setUsingCachedSnapshot(false);
    setSourceUnavailable(false);

    try {
      if (!isEdgeFetchEnabled()) {
        console.warn('AIDataCentreDashboard: Supabase Edge disabled or not configured; no seeded fallback will be used.');
        const cachedSnapshot = loadDashboardSnapshot<AIDataCentreDashboardSnapshot>(AI_DATA_CENTRE_SNAPSHOT_KEY);
        if (cachedSnapshot) {
          setDcData(cachedSnapshot.payload.dcData);
          setQueueData(cachedSnapshot.payload.queueData);
          setQueueHistory(cachedSnapshot.payload.queueHistory);
          setLastUpdated(
            cachedSnapshot.payload.dcData.metadata?.last_updated
              ?? cachedSnapshot.payload.queueData?.metadata?.last_updated
              ?? cachedSnapshot.payload.queueHistory?.metadata?.last_updated
              ?? cachedSnapshot.cachedAt,
          );
          setUsingCachedSnapshot(true);
        } else {
          setDcData(null);
          setQueueData(null);
          setQueueHistory(null);
          setEdgeDisabled(true);
          setLastUpdated(null);
          setSourceUnavailable(true);
        }
        setLoading(false);
        return;
      }

      const [dcResponse, queueResponse, historyResponse] = await Promise.all([
        fetchEdgeJson([
          `api-v2-ai-datacentres?province=${selectedProvince}&timeseries=true`,
          `api/ai-datacentres/${selectedProvince}`
        ]).then(r => r.json),
        fetchEdgeJson([
          `api-v2-aeso-queue?status=Active&province=${selectedProvince}`,
          `api/aeso-queue/active?province=${selectedProvince}`
        ]).then(r => r.json),
        fetchEdgeJson([
          `api-v2-aeso-queue?history=true&province=${selectedProvince}`,
          `api/aeso-queue/history?province=${selectedProvince}`
        ]).then(r => r.json),
      ]);

      setDcData(dcResponse);
      setQueueData(queueResponse);
      setQueueHistory(historyResponse);
      setLastUpdated(dcResponse?.metadata?.last_updated ?? queueResponse?.metadata?.last_updated ?? historyResponse?.metadata?.last_updated ?? null);
      saveDashboardSnapshot(AI_DATA_CENTRE_SNAPSHOT_KEY, {
        dcData: dcResponse,
        queueData: queueResponse,
        queueHistory: historyResponse,
      });
    } catch (err) {
      console.error('Failed to load AI Data Centre data:', err);
      const cachedSnapshot = loadDashboardSnapshot<AIDataCentreDashboardSnapshot>(AI_DATA_CENTRE_SNAPSHOT_KEY);
      if (cachedSnapshot) {
        setDcData(cachedSnapshot.payload.dcData);
        setQueueData(cachedSnapshot.payload.queueData);
        setQueueHistory(cachedSnapshot.payload.queueHistory);
        setLastUpdated(
          cachedSnapshot.payload.dcData.metadata?.last_updated
            ?? cachedSnapshot.payload.queueData?.metadata?.last_updated
            ?? cachedSnapshot.payload.queueHistory?.metadata?.last_updated
            ?? cachedSnapshot.cachedAt,
        );
        setUsingCachedSnapshot(true);
      } else {
        console.warn('AIDataCentreDashboard: API call failed and no cached source-backed snapshot is available.');
        setDcData(null);
        setQueueData(null);
        setQueueHistory(null);
        setEdgeDisabled(true);
        setLastUpdated(null);
        setSourceUnavailable(true);
      }
      setError(null); // Clear any error
    } finally {
      setLoading(false);
    }
  }, [selectedProvince]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!dcData || selectedProvince !== 'AB') return;
    const baseLoadMw = Math.max(40, Number(dcData.grid_impact?.total_dc_load_mw ?? dcData.summary.total_contracted_capacity_mw ?? 120) * 0.12);
    runMlForecast({
      domain: 'byop_load',
      province: selectedProvince,
      horizon_hours: 24,
      scenario: {
        baseLoadMw,
        flexibilityPct: 20,
        onSiteGenerationMw: Math.max(15, baseLoadMw * 0.35),
        storageCapacityMwh: Math.max(60, baseLoadMw * 1.4),
        storagePowerMw: Math.max(20, baseLoadMw * 0.3),
        utilityImportCapMw: Math.max(30, baseLoadMw * 0.82),
        priceSignalCadPerMwh: 155,
      },
    }).then(({ data }) => setByopInsights(data)).catch((error) => {
      console.warn('BYOP forecast adapter failed:', error);
      setByopInsights(null);
    });
  }, [dcData, selectedProvince]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="text-center">
          <Server className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-lg text-secondary">Loading AI Data Centre Dashboard...</p>
        </div>
      </div>
    );
  }

  // No more early returns for edgeDisabled or error - we now use fallback data
  // and show a banner instead

  if (!dcData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary px-6">
        <div className="max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-1 h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-2xl font-semibold text-amber-950">AI Data Centre source-backed snapshot unavailable</h1>
              <p className="mt-2 text-sm text-amber-900">
                This dashboard no longer falls back to seeded demo facility or queue data. No live edge response or cached source-backed snapshot is available for the selected province.
              </p>
              <p className="mt-2 text-sm text-amber-800">
                Required upstream sources include the AI data centre registry, AESO queue snapshot, and queue history feeds.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={loadDashboardData}
                  className="rounded-lg bg-secondary0 px-5 py-2 text-white hover:bg-electric"
                >
                  Retry
                </button>
                {sourceUnavailable && (
                  <span className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900">
                    Waiting for a live response or a previously cached real snapshot.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if province has data
  const hasProvinceData = dcData.data_centres.length > 0 || dcData.summary.total_count > 0;
  const isAlberta = selectedProvince === 'AB';
  const queueInsights = isAlberta && queueData ? queueData.insights : null;
  const queueSummary = isAlberta && queueData ? queueData.summary : null;
  const currentQueueValue = queueSummary?.total_requested_mw != null
    ? `${Math.round(queueSummary.total_requested_mw)} MW`
    : 'N/A';
  const currentQueueSubtitle = queueSummary
    ? `${queueSummary.total_projects} projects`
    : isAlberta
      ? 'Queue data unavailable'
      : 'Queue data available for Alberta only';

  // Prepare data for visualizations
  const statusData = Object.entries(dcData.summary.by_status).map(([status, count]) => ({
    status,
    count,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));

  const operatorData = Object.entries(dcData.summary.by_operator)
    .map(([operator, data]) => ({
      operator,
      capacity: Math.round(data.total_capacity_mw),
      count: data.count,
    }))
    .sort((a, b) => b.capacity - a.capacity);

  const queueByType = queueSummary
    ? Object.entries(queueSummary.by_type)
      .map(([type, data]) => ({
        type,
        projects: data.count,
        capacity_mw: Math.round(data.total_mw),
      }))
      .sort((a, b) => b.capacity_mw - a.capacity_mw)
    : [];

  const gridImpactData = [
    { name: 'Current DC Load', value: dcData.grid_impact.total_dc_load_mw, fill: COLORS.success },
    { name: 'DC in Queue', value: dcData.grid_impact.dc_queue_mw, fill: COLORS.warning },
    { name: 'Other Queue', value: dcData.grid_impact.total_queue_mw - dcData.grid_impact.dc_queue_mw, fill: COLORS.primary },
    { name: 'Available', value: dcData.grid_impact.current_peak_demand_mw - dcData.grid_impact.total_dc_load_mw, fill: '#e2e8f0' },
  ];

  const aiDashboardFreshness = buildDataProvenance({
    source: edgeDisabled
      ? 'Sample AI data centre + AESO queue dataset'
      : usingCachedSnapshot
        ? `${dcData.metadata?.data_source || queueData?.metadata?.data_source || 'AI data centre + AESO queue APIs'} (cached snapshot)`
        : selectedProvince !== 'AB'
          ? `${dcData.metadata?.data_source || 'AI data centre registry'} (${getProvinceName(selectedProvince)} registry view)`
        : dcData.metadata?.data_source || queueData?.metadata?.data_source || 'AI data centre + AESO queue APIs',
    lastUpdated: edgeDisabled
      ? null
      : dcData.metadata?.last_updated || queueData?.metadata?.last_updated || queueHistory?.metadata?.last_updated || lastUpdated,
    isFallback: edgeDisabled || usingCachedSnapshot,
    staleAfterHours: 24,
    note: edgeDisabled
      ? 'Facility, capacity, and queue metrics are currently sourced from the seeded demo dataset.'
      : usingCachedSnapshot
        ? 'Facility and queue metrics are restored from the last successful cached snapshot for this browser.'
        : isAlberta
          ? 'Facility registry and Alberta queue analytics are loaded from edge-backed sources.'
          : 'Facility registry is source-backed for the selected province, while queue analytics remain Alberta-only and do not apply to this provincial view.',
  });

  return (
    <div className="min-h-screen bg-primary p-6">
      {/* Header */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(56, 189, 248, 0.12)' }}
                >
                  <Server className="h-6 w-6 text-electric" />
                </div>
                <h1 className="hero-title">AI Data Centre Energy Dashboard</h1>
              </div>
              <p className="hero-subtitle">
                {selectedProvince === 'AB'
                  ? "Alberta's $100B AI Strategy · AESO interconnection queue crisis management"
                  : `${getProvinceName(selectedProvince)} AI Data Centre Infrastructure`
                }
              </p>
              <div className="mt-3">
                <DataFreshnessBadge
                  timestamp={aiDashboardFreshness.lastUpdated}
                  status={aiDashboardFreshness.freshnessStatus}
                  source={aiDashboardFreshness.source}
                  showRelative={false}
                />
              </div>
            </div>
            <HelpButton id="ai-datacentre.overview" />
          </div>
        </div>
      </section>

      {/* Demo Mode Banner - shown when API is unavailable */}
      {edgeDisabled && (
        <DataTrustNotice
          mode="mock"
          title="Sample infrastructure data active"
          message="This AI data centre view is currently using sample queue and facility data. Treat capacity, demand, and queue analytics as illustrative until live upstream feeds are connected."
          className="mb-6"
        />
      )}

      {/* Cached Snapshot Banner - shown when using browser-local cached data */}
      {usingCachedSnapshot && !edgeDisabled && (
        <DataTrustNotice
          mode="fallback"
          title="Cached snapshot data in use"
          message="This AI data centre view is restored from the last successful cached snapshot stored in this browser. Live upstream feeds are currently unavailable. Metrics reflect the last known state and may be stale."
          className="mb-6"
        />
      )}

      {!edgeDisabled && !usingCachedSnapshot && !isAlberta && (
        <DataTrustNotice
          mode="fallback"
          title="Registry-only provincial view"
          message={`${getProvinceName(selectedProvince)} currently shows source-backed facility registry data only. Queue allocation, phase-1 capacity, and Alberta-specific AESO queue analytics remain Alberta-only and should not be read as provincial live queue coverage.`}
          className="mb-6"
        />
      )}

      {/* Filters and Tab Switcher */}
      <div className="card p-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-electric" />
              <span className="text-sm font-medium">Province:</span>
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AB">Alberta</option>
              <option value="BC">British Columbia</option>
              <option value="ON">Ontario</option>
              <option value="QC">Quebec</option>
              <option value="MB">Manitoba</option>
              <option value="SK">Saskatchewan</option>
              <option value="NS">Nova Scotia</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland and Labrador</option>
              <option value="PE">Prince Edward Island</option>
              <option value="NT">Northwest Territories</option>
              <option value="NU">Nunavut</option>
              <option value="YT">Yukon</option>
            </select>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'current'
                  ? 'bg-electric text-white'
                  : 'bg-secondary text-secondary hover:bg-slate-200'
                  }`}
              >
                Current Queue
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'history'
                  ? 'bg-electric text-white'
                  : 'bg-secondary text-secondary hover:bg-slate-200'
                  }`}
              >
                Queue Growth (2023-2025)
              </button>
            </div>
            <div className="px-4 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-sm font-semibold min-w-[132px] text-center">
              {currentQueueValue}
            </div>
          </div>
        </div>
      </div>

      {/* Current Queue View */}
      {activeTab === 'current' && (
        <>
          {/* No Data Message for non-Alberta provinces */}
          {!hasProvinceData && !isAlberta && (
            <div className="mb-6 p-6 bg-secondary border border-[var(--border-subtle)] rounded-lg text-center">
              <Server className="w-12 h-12 mx-auto mb-4 text-tertiary" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                No AI Data Centre Data Available for {getProvinceName(selectedProvince)}
              </h3>
              <p className="text-secondary">
                AI data centre tracking is currently focused on Alberta due to the $100B AI strategy initiative.
                Data for other provinces will be added as projects are announced.
              </p>
            </div>
          )}

          {/* Critical Alerts Banner - Alberta only */}
          {queueInsights && queueInsights.grid_reliability_concern.queue_to_peak_ratio > 50 && (
            <div className="mb-6 p-4 bg-secondary border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800 mb-1">GRID RELIABILITY ALERT</h3>
                  <p className="text-danger">
                    {queueInsights.grid_reliability_concern.message}
                  </p>
                  <p className="text-sm text-danger mt-1">
                    Queue requests = {queueInsights.grid_reliability_concern.queue_to_peak_ratio}% of current provincial peak demand
                  </p>
                </div>
              </div>
            </div>
          )}

          {queueInsights && queueInsights.phase1_allocation_status.is_fully_allocated && (
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-800 mb-1">PHASE 1 CAPACITY FULLY ALLOCATED</h3>
                  <p className="text-amber-700">
                    AESO's Phase 1 limit of 1,200 MW has been reached. New projects must wait for Phase 2.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={<Server className="w-8 h-8" />}
              title="Total Facilities"
              value={dcData.summary.total_count}
              subtitle={`${dcData.summary.by_status['Operational'] || 0} operational`}
              color="blue"
              freshnessTimestamp={dcData.metadata?.last_updated}
              freshnessStatus={aiDashboardFreshness.freshnessStatus}
            />
            <MetricCard
              icon={<Zap className="w-8 h-8" />}
              title="Total Capacity"
              value={`${Math.round(dcData.summary.total_contracted_capacity_mw)} MW`}
              subtitle={`${Math.round(dcData.summary.operational_capacity_mw)} MW operational`}
              color="green"
              freshnessTimestamp={dcData.metadata?.last_updated}
              freshnessStatus={aiDashboardFreshness.freshnessStatus}
            />
            <MetricCard
              icon={<Activity className="w-8 h-8" />}
              title="Queue Requests"
              value={currentQueueValue}
              subtitle={currentQueueSubtitle}
              color="amber"
              freshnessTimestamp={queueData?.metadata?.last_updated}
              freshnessStatus={aiDashboardFreshness.freshnessStatus}
            />
            <MetricCard
              icon={<DollarSign className="w-8 h-8" />}
              title="Total Investment"
              value={dcData?.data_centres?.length ? `$${(dcData.data_centres.reduce((sum, dc) => sum + (dc.capital_investment_cad || 0), 0) / 1e9).toFixed(1)}B` : '$0.0B'}
              subtitle="Capital committed"
              color="purple"
              freshnessTimestamp={dcData.metadata?.last_updated}
              freshnessStatus={aiDashboardFreshness.freshnessStatus}
            />
          </div>

          {/* Phase 1 Allocation Status - Alberta only */}
          {queueInsights && (
            <div className="card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <Gauge className="w-6 h-6 text-electric" />
                  AESO Phase 1 Allocation Status (1,200 MW Limit)
                </h2>
                <HelpButton id="ai-datacentre.phase1" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart
                      innerRadius="30%"
                      outerRadius="100%"
                      data={[{
                        name: 'Utilization',
                        value: queueInsights.phase1_allocation_status.utilization_percentage,
                        fill: queueInsights.phase1_allocation_status.utilization_percentage > 90
                          ? COLORS.danger
                          : queueInsights.phase1_allocation_status.utilization_percentage > 70
                            ? COLORS.warning
                            : COLORS.success,
                      }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
                        {queueInsights.phase1_allocation_status.utilization_percentage}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                    <span className="font-semibold text-secondary">Phase 1 Limit</span>
                    <span className="text-xl font-bold text-electric">1,200 MW</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                    <span className="font-semibold text-secondary">Allocated</span>
                    <span className="text-xl font-bold text-warning">
                      {queueInsights.phase1_allocation_status.allocated_mw} MW
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                    <span className="font-semibold text-secondary">Remaining</span>
                    <span className="text-xl font-bold text-success">
                      {queueInsights.phase1_allocation_status.remaining_mw} MW
                    </span>
                  </div>
                  {queueInsights.phase1_allocation_status.is_fully_allocated && (
                    <div className="p-3 bg-secondary border border-red-200 rounded-lg">
                      <p className="text-sm text-danger font-medium">
                        ⚠️ Capacity exhausted - projects moved to Phase 2
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid Impact Analysis - Show only when data exists */}
          {(hasProvinceData || isAlberta) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="card p-6">
                <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-electric" />
                  {isAlberta ? 'Grid Impact Analysis' : `${getProvinceName(selectedProvince)} Grid Impact`}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gridImpactData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value} MW`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gridImpactData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Peak Demand</span>
                    <span className="font-bold">{dcData.grid_impact.current_peak_demand_mw} MW</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">DC % of Peak</span>
                    <span className="font-bold text-electric">
                      {dcData.grid_impact.dc_percentage_of_peak?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Reliability Rating</span>
                    <span className={`font-bold ${dcData.grid_impact.reliability_rating === 'Normal' ? 'text-success' :
                      dcData.grid_impact.reliability_rating === 'Adequate' ? 'text-electric' :
                        dcData.grid_impact.reliability_rating === 'Strained' ? 'text-warning' :
                          'text-danger'
                      }`}>
                      {dcData.grid_impact.reliability_rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-electric" />
                  Data Centre Operators
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={operatorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="operator" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="capacity" name="Capacity (MW)" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AESO Queue Breakdown - Alberta only */}
          {queueInsights && (
            <div className="card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <Server className="w-6 h-6 text-electric" />
                  AESO Interconnection Queue Breakdown
                </h2>
                <HelpButton id="ai-datacentre.queue" />
              </div>
              <div className="mb-4 p-4 bg-secondary rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">AI Data Centre Dominance</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-electric">
                      {queueInsights.data_centre_dominance.dc_projects}
                    </div>
                    <div className="text-sm text-secondary">DC Projects</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-electric">
                      {Math.round(queueInsights.data_centre_dominance.dc_mw)} MW
                    </div>
                    <div className="text-sm text-secondary">DC Capacity</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-electric">
                      {queueInsights.data_centre_dominance.dc_percentage_of_queue}%
                    </div>
                    <div className="text-sm text-secondary">% of Total Queue</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={queueByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="capacity_mw" name="Requested Capacity (MW)" fill={COLORS.primary} />
                  <Bar dataKey="projects" name="Project Count" fill={COLORS.teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data Centre Registry Table */}
          {hasProvinceData && (
            <div className="card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-electric" />
                  {getProvinceName(selectedProvince)} AI Data Centre Registry
                </h2>
                <HelpButton id="ai-datacentre.pue" className="ml-2" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Facility
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Operator
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                        Capacity (MW)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                        PUE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Power Source
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                        Renewable %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
                    {dcData.data_centres.map((dc) => (
                      <tr 
                        key={dc.id} 
                        className="hover:bg-secondary cursor-pointer transition-colors"
                        onClick={() => setSelectedDataCentre(dc)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-primary">
                          {dc.facility_name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                          {dc.operator}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                          {dc.location_city}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                            style={{
                              backgroundColor: STATUS_COLORS[dc.status] + '20',
                              color: STATUS_COLORS[dc.status],
                            }}
                          >
                            {dc.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-primary">
                          {Math.round(dc.contracted_capacity_mw)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-secondary">
                          {dc.pue_actual || dc.pue_design || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                          {dc.power_source}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          {dc.renewable_percentage > 0 ? (
                            <span className="text-success font-medium">{dc.renewable_percentage}%</span>
                          ) : (
                            <span className="text-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Data Centre Detail Panel */}
              {selectedDataCentre && (
                <div className="mt-6 p-6 bg-secondary rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary">{selectedDataCentre.facility_name}</h3>
                      <p className="text-sm text-secondary mt-1">{selectedDataCentre.operator} • {selectedDataCentre.location_city}, {selectedDataCentre.province}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDataCentre(null)}
                      className="text-tertiary hover:text-primary transition-colors"
                      aria-label="Close details"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-primary rounded">
                      <div className="text-xs text-tertiary">Contracted Capacity</div>
                      <div className="text-lg font-semibold text-primary">{Math.round(selectedDataCentre.contracted_capacity_mw)} MW</div>
                    </div>
                    <div className="p-3 bg-primary rounded">
                      <div className="text-xs text-tertiary">PUE</div>
                      <div className="text-lg font-semibold text-primary">{selectedDataCentre.pue_actual || selectedDataCentre.pue_design || 'N/A'}</div>
                    </div>
                    <div className="p-3 bg-primary rounded">
                      <div className="text-xs text-tertiary">Power Source</div>
                      <div className="text-lg font-semibold text-primary">{selectedDataCentre.power_source}</div>
                    </div>
                    <div className="p-3 bg-primary rounded">
                      <div className="text-xs text-tertiary">Renewable %</div>
                      <div className="text-lg font-semibold text-success">
                        {selectedDataCentre.renewable_percentage > 0 ? `${selectedDataCentre.renewable_percentage}%` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-tertiary">Status:</span>
                    <span
                      className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[selectedDataCentre.status] + '20',
                        color: STATUS_COLORS[selectedDataCentre.status],
                      }}
                    >
                      {selectedDataCentre.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Historical Queue Growth View */}
      {activeTab === 'history' && (
        <>
          {!isAlberta ? (
            <div className="bg-secondary border-l-4 border-teal-400 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-electric flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-primary mb-2">Queue History Not Available</h3>
                  <p className="text-secondary">
                    Historical queue growth is currently available for Alberta only.
                  </p>
                </div>
              </div>
            </div>
          ) : !queueHistory || !queueHistory.history || queueHistory.history.length === 0 ? (
            <div className="bg-secondary border-l-4 border-yellow-400 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-yellow-800 mb-2">Queue History Data Not Available</h3>
                  <p className="text-warning mb-3">
                    The AESO queue history tracking feature requires the database migration to be run.
                  </p>
                  <div className="bg-secondary p-4 rounded border border-yellow-200">
                    <p className="text-sm text-secondary mb-2"><strong>To enable this feature:</strong></p>
                    <ol className="text-sm text-secondary list-decimal ml-5 space-y-1">
                      <li>Open Supabase SQL Editor</li>
                      <li>Run migration: <code className="bg-secondary px-2 py-1 rounded">supabase/migrations/20251112005_aeso_queue_history.sql</code></li>
                      <li>Disable RLS: <code className="bg-secondary px-2 py-1 rounded">ALTER TABLE aeso_queue_history DISABLE ROW LEVEL SECURITY;</code></li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Historical Overview Banner */}
              <div className="mb-6 p-6 bg-secondary border-l-4 border-electric rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-8 h-8 text-electric flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2">AESO Queue Growth: AI Boom Analysis (2023-2025)</h3>
                    <p className="text-secondary mb-3">
                      Tracking the explosive growth of AI data centre interconnection requests following the ChatGPT launch and Alberta's $100B AI strategy.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-secondary p-3 rounded-lg">
                        <div className="text-sm text-secondary">Snapshots Tracked</div>
                        <div className="text-2xl font-bold text-electric">{queueHistory.metadata.snapshots_available}</div>
                        <div className="text-xs text-tertiary">Jan 2023 - Mar 2025</div>
                      </div>
                      <div className="bg-secondary p-3 rounded-lg">
                        <div className="text-sm text-secondary">AI DC Growth</div>
                        <div className="text-2xl font-bold text-electric">
                          {queueHistory.history[queueHistory.history.length - 1].dc_projects - queueHistory.history[0].dc_projects}×
                        </div>
                        <div className="text-xs text-tertiary">2 → {queueHistory.history[queueHistory.history.length - 1].dc_projects} projects</div>
                      </div>
                      <div className="bg-secondary p-3 rounded-lg">
                        <div className="text-sm text-secondary">Queue Growth</div>
                        <div className="text-2xl font-bold text-warning">
                          {Math.round((queueHistory.history[queueHistory.history.length - 1].total_requested_mw / queueHistory.history[0].total_requested_mw - 1) * 100)}%
                        </div>
                        <div className="text-xs text-tertiary">6.8 GW → {(queueHistory.history[queueHistory.history.length - 1].total_requested_mw / 1000).toFixed(1)} GW</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Total Queue Growth */}
                <div className="card p-6">
                  <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-electric" />
                    Total Queue Growth (GW)
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={queueHistory.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="snapshot_month"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis label={{ value: 'Capacity (GW)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value: any) => `${(value / 1000).toFixed(2)} GW`}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="total_requested_mw"
                        name="Total Queue"
                        fill={COLORS.primary}
                        stroke={COLORS.primary}
                        opacity={0.3}
                      />
                      <Line
                        type="monotone"
                        dataKey="dc_requested_mw"
                        name="AI Data Centres"
                        stroke={COLORS.danger}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-secondary">
                      <strong>Key Insight:</strong> AI data centres grew from {queueHistory.history[0].dc_requested_mw} MW (Jan 2023)
                      to {Math.round(queueHistory.history[queueHistory.history.length - 1].dc_requested_mw)} MW (Mar 2025),
                      a {Math.round((queueHistory.history[queueHistory.history.length - 1].dc_requested_mw / queueHistory.history[0].dc_requested_mw - 1) * 100)}% increase.
                    </p>
                  </div>
                </div>

                {/* AI Data Centre Dominance */}
                <div className="card p-6">
                  <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                    <Server className="w-6 h-6 text-electric" />
                    AI Data Centre Market Share
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={queueHistory.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="snapshot_month"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="left"
                        label={{ value: 'Projects', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: '% of Queue', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="dc_projects"
                        name="DC Projects"
                        fill={COLORS.primary}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="dc_percentage_of_queue"
                        name="% of Total Queue"
                        stroke={COLORS.danger}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-secondary">
                      <strong>Crisis Point:</strong> AI data centres now represent {queueHistory.history[queueHistory.history.length - 1].dc_percentage_of_queue}%
                      of the total queue (up from {queueHistory.history[0].dc_percentage_of_queue}% in Jan 2023).
                    </p>
                  </div>
                </div>

                {/* Phase 1 Allocation Timeline */}
                <div className="card p-6">
                  <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                    <Gauge className="w-6 h-6 text-electric" />
                    Phase 1 Allocation (1,200 MW Limit)
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={queueHistory.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="snapshot_month"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis label={{ value: 'MW', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="phase1_allocated_mw" name="Allocated" fill={COLORS.warning} stackId="a" />
                      <Bar dataKey="phase1_remaining_mw" name="Remaining" fill={COLORS.success} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-secondary">
                      <strong>Limit Reached:</strong> Phase 1 capacity fully allocated by {
                        queueHistory.history.find(h => h.phase1_utilization_percent >= 100)?.snapshot_month || 'Q2 2024'
                      }.
                      New projects must wait for Phase 2 approval.
                    </p>
                  </div>
                </div>

                {/* Queue to Peak Demand Ratio */}
                <div className="card p-6">
                  <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-electric" />
                    Grid Reliability Concern
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={queueHistory.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="snapshot_month"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis label={{ value: 'Queue / Peak Demand (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value: any) => `${value}%`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="queue_to_peak_ratio"
                        name="Queue as % of Peak"
                        stroke={COLORS.danger}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={() => 100}
                        name="100% Threshold"
                        stroke="#000"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-secondary">
                      <strong>Grid Crisis:</strong> Queue now at {queueHistory.history[queueHistory.history.length - 1].queue_to_peak_ratio}%
                      of Alberta's peak demand (12,100 MW). Major grid expansion required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Historical Data Table */}
              <div className="card p-6 mb-8">
                <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-electric" />
                  Monthly Snapshot History
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                          Month
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                          Total Projects
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                          Total Queue (GW)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                          DC Projects
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                          DC Capacity (GW)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-tertiary uppercase tracking-wider">
                          DC % of Queue
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
                      {queueHistory.history.map((snapshot, idx) => (
                        <tr key={snapshot.id} className={`hover:bg-secondary ${idx === queueHistory.history.length - 1 ? 'bg-secondary font-semibold' : ''}`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                            {snapshot.snapshot_month}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-primary">
                            {snapshot.total_projects}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-primary">
                            {(snapshot.total_requested_mw / 1000).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-electric">
                            {snapshot.dc_projects}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-electric">
                            {(snapshot.dc_requested_mw / 1000).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${snapshot.dc_percentage_of_queue > 30 ? 'bg-red-100 text-red-800' :
                              snapshot.dc_percentage_of_queue > 15 ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {snapshot.dc_percentage_of_queue.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-secondary max-w-md">
                            {snapshot.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* AI Demand Scenario Slider (Gap #14) */}
      <div className="mt-8">
        <AIDemandScenarioSlider initialDemand={15} maxDemand={100} showDetails={true} />
      </div>

      {byopInsights?.analysis && (
        <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">BYOP Load Coordination</h3>
              <p className="text-sm text-secondary">
                {byopInsights.meta?.model_version} scenario for Alberta AI data centre import shaping.
              </p>
            </div>
            <p className="text-xs text-cyan-200">
              Confidence {(Number(byopInsights.meta?.confidence_score ?? 0) * 100).toFixed(0)}% · scenario-based
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <div className="rounded-xl border border-cyan-500/20 bg-secondary p-4">
              <div className="text-xs uppercase tracking-wide text-tertiary">Peak Import</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{Number(byopInsights.analysis.peakImportMw ?? 0).toFixed(1)} MW</div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-secondary p-4">
              <div className="text-xs uppercase tracking-wide text-tertiary">Grid Reduction</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{Number(byopInsights.analysis.gridReductionMw ?? 0).toFixed(1)} MW</div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-secondary p-4">
              <div className="text-xs uppercase tracking-wide text-tertiary">Policy Sensitivity</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{(Number(byopInsights.analysis.policySensitivity ?? 0) * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-secondary p-4">
              <div className="text-xs uppercase tracking-wide text-tertiary">Onsite Generation</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{Number(byopInsights.analysis.agentSummary?.onsiteGeneration?.ratedMw ?? 0).toFixed(1)} MW</div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-secondary p-4">
              <div className="text-xs uppercase tracking-wide text-tertiary">Utility Import Cap</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{Number(byopInsights.analysis.agentSummary?.utility?.importCapMw ?? 0).toFixed(1)} MW</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-secondary">
            Agent outputs are rolled into the macro-load view so the dashboard can show the grid impact of self-supplied capacity before site-verified telemetry is available.
          </p>
          <p className="mt-4 text-xs text-secondary">
            This panel lifts BYOP from queue observation into an operational macro-load scenario. It does not claim actual self-supply penetration without site-verified telemetry.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-tertiary mt-8">
        <p>Data Source: AESO Interconnection Queue, Alberta Electric System Operator</p>
        <p className="mt-1">Strategic Context: Alberta's $100B AI Data Centre Strategy (2025)</p>
        {activeTab === 'history' && (
          <p className="mt-1 text-electric font-medium">Historical snapshots: Jan 2023 - Mar 2025 (8 snapshots tracked)</p>
        )}
      </div>
    </div>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, color, freshnessTimestamp, freshnessStatus }) => {
  const colorClasses = {
    blue: 'bg-secondary text-electric border-blue-200',
    green: 'bg-secondary text-success border-green-200',
    amber: 'bg-amber-50 text-warning border-amber-200',
    purple: 'bg-secondary text-electric border-purple-200',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6 shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">{title}</h3>
        </div>
        {(freshnessTimestamp || freshnessStatus) && (
          <DataFreshnessIndicator
            timestamp={freshnessTimestamp}
            status={freshnessStatus}
            staleThresholdMinutes={360}
            className="ml-auto"
          />
        )}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-sm opacity-80">{subtitle}</p>
    </div>
  );
};

export default AIDataCentreDashboard;
