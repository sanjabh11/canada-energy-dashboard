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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvince] = useState('AB'); // Alberta focus

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dcResponse, queueResponse] = await Promise.all([
        fetchEdgeJson([
          `api-v2-ai-datacentres?province=${selectedProvince}&timeseries=true`,
          `api/ai-datacentres/${selectedProvince}`
        ]).then(r => r.json),
        fetchEdgeJson([
          'api-v2-aeso-queue?status=Active',
          'api/aeso-queue/active'
        ]).then(r => r.json),
      ]);

      setDcData(dcResponse);
      setQueueData(queueResponse);
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Server className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-lg text-slate-600">Loading AI Data Centre Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-lg text-red-600">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Server className="w-10 h-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-slate-800">
            AI Data Centre Energy Dashboard
          </h1>
        </div>
        <p className="text-lg text-slate-600 ml-13">
          Alberta's $100B AI Strategy | AESO Queue Crisis Management
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {queueData.insights.grid_reliability_concern.queue_to_peak_ratio > 50 && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 mb-1">GRID RELIABILITY ALERT</h3>
              <p className="text-red-700">
                {queueData.insights.grid_reliability_concern.message}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Queue requests = {queueData.insights.grid_reliability_concern.queue_to_peak_ratio}% of current provincial peak demand
              </p>
            </div>
          </div>
        </div>
      )}

      {queueData.insights.phase1_allocation_status.is_fully_allocated && (
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
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
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Gauge className="w-6 h-6 text-blue-600" />
          AESO Phase 1 Allocation Status (1,200 MW Limit)
        </h2>
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
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="font-semibold text-slate-700">Phase 1 Limit</span>
              <span className="text-xl font-bold text-blue-600">1,200 MW</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
              <span className="font-semibold text-slate-700">Allocated</span>
              <span className="text-xl font-bold text-amber-600">
                {queueData.insights.phase1_allocation_status.allocated_mw} MW
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="font-semibold text-slate-700">Remaining</span>
              <span className="text-xl font-bold text-green-600">
                {queueData.insights.phase1_allocation_status.remaining_mw} MW
              </span>
            </div>
            {queueData.insights.phase1_allocation_status.is_fully_allocated && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Capacity exhausted - projects moved to Phase 2
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
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
              <span className="text-slate-600">Peak Demand</span>
              <span className="font-bold">{dcData.grid_impact.current_peak_demand_mw} MW</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">DC % of Peak</span>
              <span className="font-bold text-blue-600">
                {dcData.grid_impact.dc_percentage_of_peak?.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Reliability Rating</span>
              <span className={`font-bold ${
                dcData.grid_impact.reliability_rating === 'Normal' ? 'text-green-600' :
                dcData.grid_impact.reliability_rating === 'Adequate' ? 'text-blue-600' :
                dcData.grid_impact.reliability_rating === 'Strained' ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {dcData.grid_impact.reliability_rating}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
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
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-600" />
          AESO Interconnection Queue Breakdown
        </h2>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">AI Data Centre Dominance</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {queueData.insights.data_centre_dominance.dc_projects}
              </div>
              <div className="text-sm text-slate-600">DC Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(queueData.insights.data_centre_dominance.dc_mw)} MW
              </div>
              <div className="text-sm text-slate-600">DC Capacity</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {queueData.insights.data_centre_dominance.dc_percentage_of_queue}%
              </div>
              <div className="text-sm text-slate-600">% of Total Queue</div>
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
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          Alberta AI Data Centre Registry
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Facility
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Capacity (MW)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  PUE
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Power Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {dcData.data_centres.map((dc) => (
                <tr key={dc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {dc.facility_name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                    {dc.operator}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                    {Math.round(dc.contracted_capacity_mw)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-slate-700">
                    {dc.pue_actual || dc.pue_design || 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      {dc.power_source}
                      {dc.renewable_percentage > 0 && (
                        <span className="text-xs text-green-600 font-medium">
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

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 mt-8">
        <p>Data Source: AESO Interconnection Queue, Alberta Electric System Operator</p>
        <p className="mt-1">Strategic Context: Alberta's $100B AI Data Centre Strategy (2025)</p>
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
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6 shadow-md`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-sm opacity-80">{subtitle}</p>
    </div>
  );
};

export default AIDataCentreDashboard;
