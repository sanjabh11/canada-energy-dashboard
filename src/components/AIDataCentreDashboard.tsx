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
  Server, Zap, TrendingUp, AlertTriangle, CheckCircle,
  MapPin, Activity, Gauge, Cloud, Thermometer, DollarSign
} from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';

interface AIDataCentre {
  id: string;
  facility_name: string;
  operator: string;
  location_city: string;
  province: string;
  status: string;
  contracted_capacity_mw: number;
  average_load_mw: number;
  pue_design: number;
  pue_actual: number;
  cooling_technology: string;
  power_source: string;
  renewable_percentage: number;
  capital_investment_cad: number;
  offgrid: boolean;
  latitude: number;
  longitude: number;
}

interface QueueProject {
  id: string;
  project_name: string;
  proponent: string;
  project_type: string;
  requested_capacity_mw: number;
  phase_allocation: string;
  allocated_capacity_mw: number;
  study_phase: string;
  expected_in_service_date: string;
  status: string;
}

interface DashboardData {
  data_centres: AIDataCentre[];
  summary: {
    total_count: number;
    total_contracted_capacity_mw: number;
    operational_capacity_mw: number;
    queued_capacity_mw: number;
    by_status: Record<string, number>;
    by_operator: Record<string, { count: number; total_capacity_mw: number }>;
    average_pue: number;
  };
  grid_impact: {
    current_peak_demand_mw: number;
    total_dc_load_mw: number;
    dc_percentage_of_peak: number;
    total_queue_mw: number;
    dc_queue_mw: number;
    reliability_rating: string;
    phase1_allocated_mw: number;
    phase1_remaining_mw: number;
  };
  power_consumption: any[];
}

interface QueueData {
  queue: QueueProject[];
  summary: {
    total_projects: number;
    total_requested_mw: number;
    phase1_allocated_mw: number;
    phase1_remaining_mw: number;
    by_type: Record<string, { count: number; total_mw: number }>;
    by_phase: Record<string, { count: number; total_mw: number; allocated_mw: number }>;
  };
  insights: {
    data_centre_dominance: {
      dc_projects: number;
      dc_mw: number;
      dc_percentage_of_queue: number;
    };
    phase1_allocation_status: {
      limit_mw: number;
      allocated_mw: number;
      remaining_mw: number;
      utilization_percentage: number;
      is_fully_allocated: boolean;
    };
    grid_reliability_concern: {
      queue_to_peak_ratio: number;
      message: string;
    };
  };
}

interface QueueHistorySnapshot {
  id: string;
  snapshot_date: string;
  snapshot_month: string;
  total_projects: number;
  total_requested_mw: number;
  total_allocated_mw: number;
  dc_projects: number;
  dc_requested_mw: number;
  dc_allocated_mw: number;
  dc_percentage_of_queue: number;
  phase1_allocated_mw: number;
  phase1_remaining_mw: number;
  phase1_utilization_percent: number;
  queue_to_peak_ratio: number;
  average_wait_time_days: number;
  by_project_type: Record<string, { count: number; total_mw: number }>;
  data_source: string;
  notes: string;
}

interface QueueHistoryData {
  history: QueueHistorySnapshot[];
  metadata: {
    last_updated: string;
    data_source: string;
    snapshots_available: number;
  };
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
};

const STATUS_COLORS: Record<string, string> = {
  'Operational': COLORS.success,
  'Under Construction': COLORS.warning,
  'Interconnection Queue': COLORS.primary,
  'Proposed': '#94a3b8',
  'Commissioning': COLORS.teal,
};

export const AIDataCentreDashboard: React.FC = () => {
  const [dcData, setDcData] = useState<DashboardData | null>(null);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState('AB'); // Alberta focus
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dcResponse, queueResponse, historyResponse] = await Promise.all([
        fetchEdgeJson([
          `api-v2-ai-datacentres?province=${selectedProvince}&timeseries=true`,
          `api/ai-datacentres/${selectedProvince}`
        ]).then(r => r.json),
        fetchEdgeJson([
          'api-v2-aeso-queue?status=Active',
          'api/aeso-queue/active'
        ]).then(r => r.json),
        fetchEdgeJson([
          'api-v2-aeso-queue?history=true',
          'api/aeso-queue/history'
        ]).then(r => r.json),
      ]);

      setDcData(dcResponse);
      setQueueData(queueResponse);
      setQueueHistory(historyResponse);
    } catch (err) {
      console.error('Failed to load AI Data Centre data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedProvince]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-lg text-danger">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-6 py-2 bg-secondary0 text-white rounded-lg hover:bg-electric"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dcData || !queueData) return null;

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

  const queueByType = Object.entries(queueData.summary.by_type)
    .map(([type, data]) => ({
      type,
      projects: data.count,
      capacity_mw: Math.round(data.total_mw),
    }))
    .sort((a, b) => b.capacity_mw - a.capacity_mw);

  const phase1Utilization = [
    {
      name: 'Phase 1 Allocation',
      allocated: queueData.insights.phase1_allocation_status.allocated_mw,
      remaining: queueData.insights.phase1_allocation_status.remaining_mw,
      utilization: queueData.insights.phase1_allocation_status.utilization_percentage,
    }
  ];

  const gridImpactData = [
    { name: 'Current DC Load', value: dcData.grid_impact.total_dc_load_mw, fill: COLORS.success },
    { name: 'DC in Queue', value: dcData.grid_impact.dc_queue_mw, fill: COLORS.warning },
    { name: 'Other Queue', value: dcData.grid_impact.total_queue_mw - dcData.grid_impact.dc_queue_mw, fill: COLORS.primary },
    { name: 'Available', value: dcData.grid_impact.current_peak_demand_mw - dcData.grid_impact.total_dc_load_mw, fill: '#e2e8f0' },
  ];

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
                Alberta's $100B AI Strategy · AESO interconnection queue crisis management
              </p>
            </div>
            <HelpButton id="ai-datacentre.overview" />
          </div>
        </div>
      </section>

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
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'current'
                  ? 'bg-electric text-white'
                  : 'bg-secondary text-secondary hover:bg-slate-200'
              }`}
            >
              Current Queue
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'bg-electric text-white'
                  : 'bg-secondary text-secondary hover:bg-slate-200'
              }`}
            >
              Queue Growth (2023-2025)
            </button>
          </div>
        </div>
      </div>

      {/* Current Queue View */}
      {activeTab === 'current' && (
        <>
          {/* Critical Alerts Banner */}
          {queueData.insights.grid_reliability_concern.queue_to_peak_ratio > 50 && (
        <div className="mb-6 p-4 bg-secondary border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 mb-1">GRID RELIABILITY ALERT</h3>
              <p className="text-danger">
                {queueData.insights.grid_reliability_concern.message}
              </p>
              <p className="text-sm text-danger mt-1">
                Queue requests = {queueData.insights.grid_reliability_concern.queue_to_peak_ratio}% of current provincial peak demand
              </p>
            </div>
          </div>
        </div>
      )}

      {queueData.insights.phase1_allocation_status.is_fully_allocated && (
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
        />
        <MetricCard
          icon={<Zap className="w-8 h-8" />}
          title="Total Capacity"
          value={`${Math.round(dcData.summary.total_contracted_capacity_mw)} MW`}
          subtitle={`${Math.round(dcData.summary.operational_capacity_mw)} MW operational`}
          color="green"
        />
        <MetricCard
          icon={<Activity className="w-8 h-8" />}
          title="Queue Requests"
          value={`${Math.round(queueData.summary.total_requested_mw)} MW`}
          subtitle={`${queueData.summary.total_projects} projects`}
          color="amber"
        />
        <MetricCard
          icon={<DollarSign className="w-8 h-8" />}
          title="Total Investment"
          value={`$${(dcData.data_centres.reduce((sum, dc) => sum + (dc.capital_investment_cad || 0), 0) / 1e9).toFixed(1)}B`}
          subtitle="Capital committed"
          color="purple"
        />
      </div>

      {/* Phase 1 Allocation Status */}
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
                  value: queueData.insights.phase1_allocation_status.utilization_percentage,
                  fill: queueData.insights.phase1_allocation_status.utilization_percentage > 90
                    ? COLORS.danger
                    : queueData.insights.phase1_allocation_status.utilization_percentage > 70
                    ? COLORS.warning
                    : COLORS.success,
                }]}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="value" cornerRadius={10} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
                  {queueData.insights.phase1_allocation_status.utilization_percentage}%
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
                {queueData.insights.phase1_allocation_status.allocated_mw} MW
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
              <span className="font-semibold text-secondary">Remaining</span>
              <span className="text-xl font-bold text-success">
                {queueData.insights.phase1_allocation_status.remaining_mw} MW
              </span>
            </div>
            {queueData.insights.phase1_allocation_status.is_fully_allocated && (
              <div className="p-3 bg-secondary border border-red-200 rounded-lg">
                <p className="text-sm text-danger font-medium">
                  ⚠️ Capacity exhausted - projects moved to Phase 2
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-electric" />
            Grid Impact Analysis
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
              <span className={`font-bold ${
                dcData.grid_impact.reliability_rating === 'Normal' ? 'text-success' :
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

      {/* AESO Queue Breakdown */}
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
                {queueData.insights.data_centre_dominance.dc_projects}
              </div>
              <div className="text-sm text-secondary">DC Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-electric">
                {Math.round(queueData.insights.data_centre_dominance.dc_mw)} MW
              </div>
              <div className="text-sm text-secondary">DC Capacity</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-electric">
                {queueData.insights.data_centre_dominance.dc_percentage_of_queue}%
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

      {/* Data Centre Registry Table */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <MapPin className="w-6 h-6 text-electric" />
            Alberta AI Data Centre Registry
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
              </tr>
            </thead>
            <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
              {dcData.data_centres.map((dc) => (
                <tr key={dc.id} className="hover:bg-secondary">
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
                    <div className="flex items-center gap-2">
                      {dc.power_source}
                      {dc.renewable_percentage > 0 && (
                        <span className="text-xs text-success font-medium">
                          ({dc.renewable_percentage}% renewable)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Historical Queue Growth View */}
      {activeTab === 'history' && (
        <>
          {!queueHistory || !queueHistory.history || queueHistory.history.length === 0 ? (
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
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          snapshot.dc_percentage_of_queue > 30 ? 'bg-red-100 text-red-800' :
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

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'bg-secondary text-electric border-blue-200',
    green: 'bg-secondary text-success border-green-200',
    amber: 'bg-amber-50 text-warning border-amber-200',
    purple: 'bg-secondary text-electric border-purple-200',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6 shadow-md`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">{title}</h3>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-sm opacity-80">{subtitle}</p>
    </div>
  );
};

export default AIDataCentreDashboard;
