import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingDown, TrendingUp, Zap, Leaf, Factory, AlertCircle } from 'lucide-react';
import { HelpButton } from './HelpButton';

interface EmissionsData {
  province_code: string;
  reporting_year: number;
  total_emissions_tco2e: number;
  electricity_generation_tco2e: number;
  emissions_intensity_gco2_per_kwh: number;
  emissions_per_capita_tco2e: number;
}

interface EmissionsFactor {
  fuel_type: string;
  lifecycle_emissions_gco2_per_kwh: number;
  direct_emissions_gco2_per_kwh: number;
}

interface CarbonTarget {
  jurisdiction: string;
  target_year: number;
  target_type: string;
  reduction_percentage: number;
  legal_status: string;
}

interface AvoidedEmissions {
  province_code: string;
  reporting_year: number;
  total_avoided_tco2e: number;
  clean_generation_gwh: number;
}

interface ApiResponse {
  emissions: EmissionsData[];
  emissions_factors: EmissionsFactor[];
  targets: CarbonTarget[];
  avoided_emissions: AvoidedEmissions[];
  summary: any[];
  statistics: {
    total_emissions_tco2e: number;
    total_avoided_tco2e: number;
    net_emissions_tco2e: number;
    avg_grid_intensity_gco2_per_kwh: number;
  };
  metadata: {
    province: string;
    year: string;
    source: string;
  };
}

const CarbonEmissionsDashboard: React.FC = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('2023');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    fetchData();
  }, [selectedProvince, selectedYear]);

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
      if (selectedYear !== 'All') params.append('year', selectedYear);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/api-v2-carbon-emissions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch carbon emissions data:', err);
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
          <p className="text-gray-600">Loading carbon emissions data...</p>
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

  const provinces = ['All', 'AB', 'SK', 'ON', 'QC', 'BC', 'MB', 'NS', 'NB', 'NL', 'PE'];
  const years = ['All', '2023', '2022', '2021', '2020', '2019'];

  // Prepare data for province comparison chart
  const provinceData = data.emissions
    .filter(e => e.reporting_year === parseInt(selectedYear === 'All' ? '2023' : selectedYear))
    .map(e => ({
      province: e.province_code,
      intensity: e.emissions_intensity_gco2_per_kwh,
      total: e.total_emissions_tco2e / 1000000, // Convert to Mt
      electricity: e.electricity_generation_tco2e / 1000000,
      perCapita: e.emissions_per_capita_tco2e,
    }))
    .sort((a, b) => b.intensity - a.intensity);

  // Prepare data for emissions factors pie chart
  const emissionsFactorsData = data.emissions_factors.map(f => ({
    name: f.fuel_type,
    value: f.lifecycle_emissions_gco2_per_kwh,
  }));

  // Prepare trend data (if multiple years available)
  const trendData = data.emissions
    .filter(e => selectedProvince === 'All' || e.province_code === selectedProvince)
    .reduce((acc, e) => {
      const existing = acc.find(item => item.year === e.reporting_year);
      if (existing) {
        existing.total += e.total_emissions_tco2e / 1000000;
        existing.electricity += e.electricity_generation_tco2e / 1000000;
      } else {
        acc.push({
          year: e.reporting_year,
          total: e.total_emissions_tco2e / 1000000,
          electricity: e.electricity_generation_tco2e / 1000000,
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => a.year - b.year);

  // Prepare avoided emissions data
  const avoidedData = data.avoided_emissions.map(a => ({
    province: a.province_code,
    avoided: a.total_avoided_tco2e / 1000000,
    cleanGen: a.clean_generation_gwh,
  }));

  const COLORS = ['#DC2626', '#EA580C', '#F59E0B', '#84CC16', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6'];

  // Calculate key metrics
  const currentYearEmissions = data.emissions
    .filter(e => e.reporting_year === parseInt(selectedYear === 'All' ? '2023' : selectedYear))
    .reduce((sum, e) => sum + e.total_emissions_tco2e, 0) / 1000000;

  const cleanestProvince = provinceData.length > 0 ? provinceData[provinceData.length - 1] : null;
  const dirtiestProvince = provinceData.length > 0 ? provinceData[0] : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Carbon Emissions Tracking</h1>
          <HelpButton id="carbon-emissions" />
        </div>
        <p className="text-green-100">
          Greenhouse gas emissions from electricity generation across Canada
        </p>
        <p className="text-sm text-green-200 mt-2">
          Data Source: {data.metadata.source}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {provinces.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'All Provinces' : p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {years.map(y => (
                <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>
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
              <p className="text-sm text-gray-600">Total Emissions ({selectedYear})</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currentYearEmissions.toFixed(1)} Mt
              </p>
              <p className="text-xs text-gray-500 mt-1">Million tonnes CO2e</p>
            </div>
            <Factory className="text-gray-400" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-gray-600">Avg Grid Intensity</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.statistics.avg_grid_intensity_gco2_per_kwh?.toFixed(0) ?? 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">gCO2/kWh</p>
              </div>
              <HelpButton id="carbon.grid-intensity" className="ml-1" />
            </div>
            <Zap className="text-yellow-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cleanest Province</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {cleanestProvince?.province ?? 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {cleanestProvince?.intensity.toFixed(0)} gCO2/kWh
              </p>
            </div>
            <Leaf className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-gray-600">Avoided Emissions</p>
                <p className="text-2xl font-bold text-teal-600 mt-1">
                  {(data.statistics.total_avoided_tco2e / 1000000).toFixed(1)} Mt
                </p>
                <p className="text-xs text-gray-500 mt-1">From clean energy</p>
              </div>
              <HelpButton id="carbon.avoided-emissions" className="ml-1" />
            </div>
            <TrendingDown className="text-teal-500" size={40} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Province Comparison - Grid Intensity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Grid Intensity by Province ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={provinceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="province" />
              <YAxis label={{ value: 'gCO2/kWh', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="intensity" fill="#10B981" name="Grid Intensity" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Emissions Factors by Fuel Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Lifecycle Emissions by Fuel Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={emissionsFactorsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {emissionsFactorsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Emissions Trend */}
        {trendData.length > 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Emissions Trend {selectedProvince !== 'All' ? `(${selectedProvince})` : '(All Provinces)'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Million tonnes CO2e', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#DC2626" name="Total Emissions" strokeWidth={2} />
                <Line type="monotone" dataKey="electricity" stroke="#F59E0B" name="Electricity Only" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Avoided Emissions by Province */}
        {avoidedData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Avoided Emissions by Province (2023)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avoidedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="province" />
                <YAxis label={{ value: 'Million tonnes CO2e avoided', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="avoided" fill="#06B6D4" name="Avoided Emissions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Carbon Reduction Targets Table */}
      {data.targets.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Carbon Reduction Targets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jurisdiction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reduction %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Legal Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.targets.map((target, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {target.jurisdiction}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {target.target_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {target.target_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {target.reduction_percentage ? `${target.reduction_percentage}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        target.legal_status === 'Legislated'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {target.legal_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Quality Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="text-blue-600 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium">Data Quality: 100% Real</p>
            <p className="text-sm text-blue-700 mt-1">
              All emissions data sourced from Environment and Climate Change Canada (ECCC) and IPCC 2021 Guidelines.
              Provincial emissions updated annually. Emissions factors based on lifecycle assessments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarbonEmissionsDashboard;
