/**
 * VPP (Virtual Power Plant) Aggregation Dashboard
 *
 * Strategic Priority: Track VPP platforms for grid flexibility and demand response
 * Key Features:
 * - VPP platform registry (IESO Peak Perks, Blatchford, Solartility)
 * - DER fleet composition (batteries, EVs, thermostats, solar)
 * - Dispatch event performance tracking
 * - Demand response program summary
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Zap, Users, Gauge, Radio, BarChart3 as BarChartIcon } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';

interface VPPPlatform {
  id: string;
  platform_name: string;
  operator: string;
  province_code: string[];
  aggregated_capacity_mw: number;
  enrolled_assets_count: number;
  status: string;
}

interface DispatchEvent {
  event_id: string;
  event_start_time: string;
  target_reduction_mw: number;
  actual_reduction_mw: number;
  performance_percent: number;
}

interface DRProgram {
  program_name: string;
  operator: string;
  enrolled_capacity_mw: number;
  enrolled_participants: number;
  status: string;
}

const VPPAggregationDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVPPData();
  }, []);

  const fetchVPPData = async () => {
    try {
      setLoading(true);
      const result = await fetchEdgeJson(['api-v2-vpp-platforms', 'api/vpp-platforms'], {});
      setData(result.json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch VPP data:', err);
      setError('Failed to load VPP platform data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading VPP platform data...</div></div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;
  }

  if (!data || !data.platforms) {
    return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">No VPP platform data available</div>;
  }

  const platforms = data.platforms || [];
  const dispatchEvents = data.dispatch_events || [];
  const drPrograms = data.demand_response_programs || [];
  const derAssetsSummary = data.der_assets_summary || {};

  // Calculate KPIs
  const totalCapacity = platforms.reduce((sum: number, p: VPPPlatform) => sum + p.aggregated_capacity_mw, 0);
  const totalAssets = platforms.reduce((sum: number, p: VPPPlatform) => sum + p.enrolled_assets_count, 0);
  const activePlatforms = platforms.filter((p: VPPPlatform) => p.status === 'Active').length;
  const recentDispatchEvents = dispatchEvents.length;

  // Platform capacity data
  const platformCapacityData = platforms.map((p: VPPPlatform) => ({
    name: p.platform_name.substring(0, 30),
    capacity: p.aggregated_capacity_mw,
    assets: p.enrolled_assets_count,
  }));

  // DER asset type distribution
  const derTypeData = Object.entries(derAssetsSummary.by_type || {}).map(([type, count]) => ({
    type,
    count,
  }));

  // Dispatch performance over time
  const dispatchPerformanceData = dispatchEvents
    .slice(0, 10)
    .reverse()
    .map((event: DispatchEvent) => ({
      date: new Date(event.event_start_time).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      performance: event.performance_percent,
      target: event.target_reduction_mw,
      actual: event.actual_reduction_mw,
    }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Radio size={32} />
          <h1 className="text-3xl font-bold">VPP & DER Aggregation</h1>
        </div>
        <p className="text-indigo-100">Virtual Power Plant platforms and Distributed Energy Resource fleet tracking - Grid flexibility and demand response</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Aggregated Capacity</p>
              <p className="text-2xl font-bold">{totalCapacity.toFixed(1)} MW</p>
            </div>
            <Zap className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enrolled Assets</p>
              <p className="text-2xl font-bold">{totalAssets.toLocaleString()}</p>
            </div>
            <Users className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Platforms</p>
              <p className="text-2xl font-bold">{activePlatforms}</p>
            </div>
            <Radio className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Dispatch Events</p>
              <p className="text-2xl font-bold">{recentDispatchEvents}</p>
            </div>
            <Activity className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChartIcon size={20} />
            Capacity by Platform
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformCapacityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis label={{ value: 'Capacity (MW)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity" fill="#3b82f6" name="Capacity (MW)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gauge size={20} />
            DER Asset Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={derTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, count }) => `${type} (${count})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {derTypeData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dispatch Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={20} />
          Dispatch Event Performance
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dispatchPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: 'Performance %', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="performance" stroke="#10b981" name="Performance %" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Details Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Radio size={20} />
          VPP Platform Details
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Province</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity (MW)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled Assets</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {platforms.map((platform: VPPPlatform) => (
                <tr key={platform.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{platform.platform_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{platform.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{platform.province_code.join(', ')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{platform.aggregated_capacity_mw.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{platform.enrolled_assets_count.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      platform.status === 'Active' ? 'bg-green-100 text-green-800' :
                      platform.status === 'Pilot' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {platform.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demand Response Programs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users size={20} />
          Demand Response Programs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drPrograms.map((program: DRProgram, idx: number) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-blue-600">{program.program_name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  program.status === 'Active' ? 'bg-green-100 text-green-800' :
                  program.status === 'Enrollment Open' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {program.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1"><strong>Operator:</strong> {program.operator}</p>
              <p className="text-sm text-gray-600 mb-1"><strong>Capacity:</strong> {program.enrolled_capacity_mw.toFixed(1)} MW</p>
              <p className="text-sm text-gray-600"><strong>Participants:</strong> {program.enrolled_participants.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source */}
      <div className="text-sm text-gray-500 text-center">
        Data Source: {data.metadata?.source || 'IESO Peak Perks, EPCOR, Solartility, EnergyHub'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default VPPAggregationDashboard;
