import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Factory, DollarSign, Zap, TrendingUp, CheckCircle, Clock, AlertCircle, Award } from 'lucide-react';

interface CCUSProject {
  id: string;
  project_name: string;
  operator: string;
  province_code: string;
  location: string;
  project_type: string;
  status: string;
  capture_capacity_mt_co2_year: number | null;
  storage_capacity_mt_co2_total: number | null;
  cumulative_stored_mt_co2: number | null;
  total_investment_cad: number | null;
  cost_per_tonne_cad: number | null;
  capture_technology: string | null;
  storage_type: string | null;
  co2_source: string | null;
  commercial_operation_date: string | null;
  itc_eligible: boolean;
  notes: string | null;
}

interface CCUSHub {
  id: string;
  hub_name: string;
  province_code: string;
  total_capture_capacity_mt_co2_year: number;
  total_investment_cad: number;
  status: string;
}

interface CCUSPolicy {
  policy_name: string;
  jurisdiction: string;
  policy_type: string;
  incentive_rate: number | null;
  effective_date: string;
}

interface ApiResponse {
  projects: CCUSProject[];
  hubs: CCUSHub[];
  policies: CCUSPolicy[];
  summary: any[];
  statistics: {
    total_projects: number;
    operational_projects: number;
    planning_projects: number;
    operational_capture_capacity_mt_co2_year: number;
    planned_capture_capacity_mt_co2_year: number;
    total_capture_capacity_mt_co2_year: number;
    total_co2_stored_to_date_mt: number;
    total_investment_billions_cad: number;
    operational_investment_billions_cad: number;
    avg_cost_per_tonne_cad: number | null;
    itc_eligible_count: number;
    estimated_itc_value_billions_cad: number;
  };
  metadata: {
    province: string;
    source: string;
    data_quality: string;
  };
}

const CCUSProjectsDashboard: React.FC = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    fetchData();
  }, [selectedProvince, selectedStatus]);

  const fetchData = async () => {
    if (!SUPABASE_URL) {
      setError('Supabase URL not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProvince !== 'All') params.append('province', selectedProvince);
      if (selectedStatus !== 'All') params.append('status', selectedStatus);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/api-v2-ccus-projects?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch CCUS data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CCUS project data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Data</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-600 p-8">
        No data available
      </div>
    );
  }

  const provinces = ['All', 'AB', 'SK', 'ON', 'QC', 'BC', 'MB'];
  const statuses = ['All', 'Operational', 'Construction', 'Planning', 'Feasibility Study'];

  // Prepare data for capacity chart
  const capacityData = data.projects
    .filter(p => p.capture_capacity_mt_co2_year)
    .sort((a, b) => (b.capture_capacity_mt_co2_year || 0) - (a.capture_capacity_mt_co2_year || 0))
    .slice(0, 10)
    .map(p => ({
      name: p.project_name.length > 30 ? p.project_name.substring(0, 30) + '...' : p.project_name,
      capacity: p.capture_capacity_mt_co2_year,
      operator: p.operator,
    }));

  // Prepare data for status distribution
  const statusData = Object.entries(
    data.projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({ name: status, value: count }));

  // Prepare data for investment by operator
  const investmentData = Object.entries(
    data.projects.reduce((acc, p) => {
      const operator = p.operator.split('(')[0].trim(); // Get main operator name
      acc[operator] = (acc[operator] || 0) + (p.total_investment_cad || 0);
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([operator, investment]) => ({
      operator: operator.length > 25 ? operator.substring(0, 25) + '...' : operator,
      investment: investment / 1000.0, // Convert millions to billions
    }))
    .sort((a, b) => b.investment - a.investment)
    .slice(0, 10);

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operational': return 'bg-green-100 text-green-800';
      case 'Construction': return 'bg-blue-100 text-blue-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Feasibility Study': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">CCUS Project Tracker</h1>
        <p className="text-blue-100">
          Carbon Capture, Utilization & Storage Projects Across Canada
        </p>
        <p className="text-sm text-blue-200 mt-2">
          Alberta's $30B Investment Strategy | Pathways Alliance | Quest | ACTL
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Province
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {provinces.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'All Provinces' : p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Capture Capacity</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.statistics.total_capture_capacity_mt_co2_year.toFixed(1)} Mt/yr
              </p>
              <p className="text-xs text-green-600 mt-1">
                {data.statistics.operational_capture_capacity_mt_co2_year.toFixed(1)} Mt/yr operational
              </p>
            </div>
            <Factory className="text-blue-400" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${data.statistics.total_investment_billions_cad.toFixed(1)}B
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ${data.statistics.operational_investment_billions_cad.toFixed(1)}B operational
              </p>
            </div>
            <DollarSign className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CO2 Stored to Date</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.statistics.total_co2_stored_to_date_mt.toFixed(1)} Mt
              </p>
              <p className="text-xs text-teal-600 mt-1">
                {data.statistics.operational_projects} operational projects
              </p>
            </div>
            <Zap className="text-teal-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Cost per Tonne</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${data.statistics.avg_cost_per_tonne_cad?.toFixed(0) ?? 'N/A'}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {data.statistics.itc_eligible_count} ITC-eligible
              </p>
            </div>
            <Award className="text-indigo-500" size={40} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capture Capacity by Project */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Capture Capacity by Project</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={capacityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Mt CO2/year', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip />
              <Bar dataKey="capacity" fill="#3B82F6" name="Capacity (Mt CO2/yr)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Investment by Operator */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Total Investment by Operator</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={investmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="operator" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Investment (Billions CAD)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="investment" fill="#10B981" name="Investment ($B CAD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">CCUS Projects ({data.projects.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/tonne</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ITC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {project.status === 'Operational' && <CheckCircle className="text-green-500" size={16} />}
                      {project.status === 'Planning' && <Clock className="text-yellow-500" size={16} />}
                      {project.project_name}
                    </div>
                    {project.notes && (
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">
                        {project.notes.substring(0, 100)}...
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.operator.length > 30
                      ? project.operator.substring(0, 30) + '...'
                      : project.operator
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.province_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.capture_capacity_mt_co2_year
                      ? `${project.capture_capacity_mt_co2_year.toFixed(1)} Mt/yr`
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.total_investment_cad
                      ? `$${(project.total_investment_cad / 1000.0).toFixed(2)}B`
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.cost_per_tonne_cad
                      ? `$${project.cost_per_tonne_cad.toFixed(0)}`
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.itc_eligible ? (
                      <span className="text-green-600 font-medium">✓ Yes</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CCUS Hubs */}
      {data.hubs.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">CCUS Regional Hubs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Province</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Investment</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.hubs.map((hub) => (
                  <tr key={hub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{hub.hub_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{hub.province_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(hub.status)}`}>
                        {hub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {hub.total_capture_capacity_mt_co2_year.toFixed(1)} Mt/yr
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${(hub.total_investment_cad / 1000.0).toFixed(2)}B
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Federal ITC Notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Award className="text-indigo-600 mt-0.5" size={24} />
          <div className="flex-1">
            <h4 className="text-indigo-900 font-semibold mb-2">Federal CCUS Investment Tax Credit</h4>
            <p className="text-sm text-indigo-800">
              The federal government offers refundable tax credits for CCUS projects: <strong>60% for Direct Air Capture</strong>,
              <strong> 50% for CO2 capture equipment</strong>, and <strong>37.5% for transport & storage infrastructure</strong>.
              {data.statistics.itc_eligible_count} projects ({((data.statistics.itc_eligible_count / data.statistics.total_projects) * 100).toFixed(0)}%) are ITC-eligible,
              with an estimated total ITC value of <strong>${data.statistics.estimated_itc_value_billions_cad.toFixed(1)}B</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Data Quality Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm text-green-900 font-medium">Data Quality: {data.metadata.data_quality}</p>
            <p className="text-sm text-green-700 mt-1">
              {data.metadata.source}.
              Includes Quest (operational since 2015), Alberta Carbon Trunk Line (world's largest CO2 pipeline),
              Pathways Alliance (targeting 22 Mt CO2/year), and all major Canadian CCUS projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CCUSProjectsDashboard;
