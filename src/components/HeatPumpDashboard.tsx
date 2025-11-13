/**
 * Heat Pump Deployment Dashboard
 *
 * Strategic Priority: Track residential electrification for federal building decarbonization
 * Key Features:
 * - Rebate program finder by province
 * - Deployment statistics (installations by province)
 * - Oil-to-heat-pump conversion tracking
 * - GHG reduction metrics
 * - Cost calculator with rebates
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, DollarSign, Home, Leaf, TrendingUp, Search, BarChart3 as BarChartIcon } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';

interface RebateProgram {
  id: string;
  program_name: string;
  program_level: string;
  province_code: string;
  max_rebate_cad: number;
  income_qualified_bonus: number;
  status: string;
  eligibility_requirements: string;
}

interface DeploymentStats {
  province_code: string;
  tracking_year: number;
  total_installations: number;
  cumulative_installations: number;
  penetration_rate_percent: number;
}

const HeatPumpDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  useEffect(() => {
    fetchHeatPumpData();
  }, []);

  const fetchHeatPumpData = async () => {
    try {
      setLoading(true);
      const result = await fetchEdgeJson(['api-v2-heat-pump-programs', 'api/heat-pump-programs'], {});
      setData(result.json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch heat pump data:', err);
      setError('Failed to load heat pump program data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading heat pump program data...</div></div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;
  }

  if (!data || !data.programs) {
    return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">No heat pump program data available</div>;
  }

  const programs = data.programs || [];
  const deploymentStats = data.deployment_stats || [];

  // Calculate KPIs
  const activePrograms = programs.filter((p: RebateProgram) => p.status === 'Active').length;
  const avgRebate = programs.length > 0
    ? programs.reduce((sum: number, p: RebateProgram) => sum + p.max_rebate_cad, 0) / programs.length
    : 0;
  const totalInstallations = deploymentStats.reduce((sum: number, s: DeploymentStats) =>
    sum + s.cumulative_installations, 0);
  const estimatedGHGReduction = totalInstallations * 3.5; // Rough estimate: 3.5 tonnes CO2e per conversion

  // Installations by province
  const installationsByProvince = deploymentStats
    .filter((s: DeploymentStats) => s.tracking_year === Math.max(...deploymentStats.map((d: DeploymentStats) => d.tracking_year)))
    .map((s: DeploymentStats) => ({
      province: s.province_code,
      installations: s.cumulative_installations,
      penetration: s.penetration_rate_percent,
    }));

  // Deployment trends over time
  const deploymentTrends = deploymentStats
    .sort((a: DeploymentStats, b: DeploymentStats) => a.tracking_year - b.tracking_year)
    .map((s: DeploymentStats) => ({
      year: s.tracking_year,
      installations: s.total_installations,
      cumulative: s.cumulative_installations,
      province: s.province_code,
    }));

  // Filter programs by selected province
  const filteredPrograms = selectedProvince
    ? programs.filter((p: RebateProgram) => p.province_code === selectedProvince)
    : programs;

  const totalRebate = filteredPrograms.reduce((sum: number, p: RebateProgram) => sum + p.max_rebate_cad, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Thermometer size={32} />
          <h1 className="text-3xl font-bold">Heat Pump Deployment Tracker</h1>
        </div>
        <p className="text-orange-100">Residential heating electrification - Rebate programs and deployment statistics for building decarbonization</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Rebate Programs</p>
              <p className="text-2xl font-bold">{activePrograms}</p>
            </div>
            <Search className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Rebate Amount</p>
              <p className="text-2xl font-bold">${(avgRebate / 1000).toFixed(1)}k</p>
            </div>
            <DollarSign className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Installations</p>
              <p className="text-2xl font-bold">{(totalInstallations / 1000).toFixed(0)}k</p>
            </div>
            <Home className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total GHG Reduction</p>
              <p className="text-2xl font-bold">{(estimatedGHGReduction / 1000).toFixed(0)}k tonnes</p>
            </div>
            <Leaf className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* Interactive Rebate Finder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search size={20} />
          Rebate Program Finder
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Province:</label>
          <select
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
          >
            <option value="">All Provinces</option>
            <option value="ON">Ontario</option>
            <option value="QC">Quebec</option>
            <option value="BC">British Columbia</option>
            <option value="AB">Alberta</option>
            <option value="MB">Manitoba</option>
            <option value="SK">Saskatchewan</option>
            <option value="NS">Nova Scotia</option>
            <option value="NB">New Brunswick</option>
            <option value="PE">Prince Edward Island</option>
            <option value="NL">Newfoundland and Labrador</option>
          </select>
        </div>

        {filteredPrograms.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-lg font-semibold text-blue-900">
              Total Available Rebates: <span className="text-2xl">${totalRebate.toLocaleString()}</span>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Combine federal and provincial programs to maximize savings
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((program: RebateProgram) => (
            <div key={program.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-blue-600">{program.program_name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  program.status === 'Active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {program.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Level:</strong> {program.program_level}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Province:</strong> {program.province_code}
              </p>
              <p className="text-lg font-bold text-green-600 mb-1">
                Up to ${program.max_rebate_cad.toLocaleString()}
              </p>
              {program.income_qualified_bonus > 0 && (
                <p className="text-sm text-orange-600">
                  + ${program.income_qualified_bonus.toLocaleString()} low-income bonus
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChartIcon size={20} />
            Installations by Province
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={installationsByProvince}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="province" />
              <YAxis label={{ value: 'Installations', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="installations" fill="#3b82f6" name="Cumulative Installations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Deployment Trends Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deploymentTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Installations', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="installations" stroke="#10b981" name="Annual Installations" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rebate Programs Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          All Rebate Programs
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Province</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Rebate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Low-Income Bonus</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programs.map((program: RebateProgram) => (
                <tr key={program.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{program.program_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{program.program_level}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{program.province_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-semibold text-green-600">
                    ${program.max_rebate_cad.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {program.income_qualified_bonus > 0 ? `$${program.income_qualified_bonus.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      program.status === 'Active' ? 'bg-green-100 text-green-800' :
                      program.status === 'Coming Soon' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {program.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Source */}
      <div className="text-sm text-gray-500 text-center">
        Data Source: {data.metadata?.source || 'NRCan, Provincial Energy Programs'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default HeatPumpDashboard;
