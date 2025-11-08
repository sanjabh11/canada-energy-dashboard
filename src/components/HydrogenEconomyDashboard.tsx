/**
 * Hydrogen Economy Hub Dashboard
 *
 * Strategic Priority: $300M Federal Investment, Edmonton/Calgary Hubs
 * Problem Solved: Centralized tracking for Alberta's emerging hydrogen economy
 *
 * Key Features:
 * - Hub comparison (Edmonton vs Calgary capacity, projects, investment)
 * - Hydrogen color distribution (Green vs Blue vs Grey)
 * - Production time-series with carbon intensity tracking
 * - Pricing trends ($/kg) with diesel equivalency
 * - Infrastructure mapping (refueling stations, pipelines)
 * - Strategic projects timeline (Air Products, AZETEC, Calgary-Banff rail)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Fuel, TrendingUp, MapPin, Factory, DollarSign,
  Truck, Calendar, Zap, Cloud, CheckCircle, AlertTriangle
} from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';

interface HydrogenFacility {
  id: string;
  facility_name: string;
  operator: string;
  facility_type: string;
  location_city: string;
  hydrogen_type: string;
  production_method: string;
  design_capacity_kg_per_day: number;
  status: string;
  capital_investment_cad: number;
  ccus_integrated: boolean;
  part_of_hub: string;
}

interface HydrogenProject {
  id: string;
  project_name: string;
  project_type: string;
  lead_proponent: string;
  status: string;
  hydrogen_capacity_kg_per_day: number;
  capital_investment_cad: number;
  federal_funding_cad: number;
  hydrogen_type: string;
  part_of_hub: string;
  expected_completion_date: string;
}

interface DashboardData {
  facilities: HydrogenFacility[];
  projects: HydrogenProject[];
  infrastructure: any[];
  production: any[];
  pricing: any[];
  demand_forecast: any[];
  summary: {
    facilities: {
      total_count: number;
      operational_count: number;
      total_design_capacity_kg_per_day: number;
      operational_capacity_kg_per_day: number;
      by_type: Record<string, { count: number; capacity_kg_per_day: number }>;
      ccus_integrated_count: number;
    };
    projects: {
      total_count: number;
      total_investment_cad: number;
      federal_funding_cad: number;
      by_status: Record<string, number>;
    };
    infrastructure: {
      refueling_stations: number;
      pipelines_km: number;
      total_refueling_capacity: number;
    };
    production: {
      recent_daily_average_kg: number;
      average_carbon_intensity: number;
      average_efficiency: number;
    } | null;
    pricing: {
      current_price_cad_per_kg: number;
      weekly_change_percentage: number;
      yearly_average: number;
    } | null;
  };
  insights: {
    hub_status: {
      edmonton_hub: {
        capacity_kg_per_day: number;
        project_count: number;
        investment_cad: number;
      };
      calgary_hub: {
        capacity_kg_per_day: number;
        project_count: number;
        investment_cad: number;
      };
    };
    color_distribution: {
      green_percentage: number;
      blue_percentage: number;
      grey_percentage: number;
    };
  };
}

const COLORS = {
  green: '#10b981',
  blue: '#3b82f6',
  grey: '#6b7280',
  yellow: '#fbbf24',
  red: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
};

const HYDROGEN_COLORS: Record<string, string> = {
  'Green': COLORS.green,
  'Blue': COLORS.blue,
  'Grey': COLORS.grey,
  'Pink': '#ec4899',
  'Turquoise': COLORS.teal,
};

export const HydrogenEconomyDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState('AB');
  const [selectedHub, setSelectedHub] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('province', selectedProvince);
      queryParams.append('timeseries', 'true');
      if (selectedHub) queryParams.append('hub', selectedHub);

      const response = await fetchEdgeJson([
        `api-v2-hydrogen-hub?${queryParams.toString()}`,
        `api/hydrogen-hub/${selectedProvince}`
      ]);

      setData(response.json);
    } catch (err) {
      console.error('Failed to load Hydrogen Hub data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedProvince, selectedHub]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Fuel className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-lg text-slate-600">Loading Hydrogen Economy Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-lg text-red-600">{error || 'No data available'}</p>
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

  // Prepare visualizations data
  const colorDistribution = [
    { name: 'Green H₂', value: data.insights.color_distribution.green_percentage, fill: HYDROGEN_COLORS['Green'] },
    { name: 'Blue H₂', value: data.insights.color_distribution.blue_percentage, fill: HYDROGEN_COLORS['Blue'] },
    { name: 'Grey H₂', value: data.insights.color_distribution.grey_percentage, fill: HYDROGEN_COLORS['Grey'] },
  ].filter(item => item.value > 0);

  const hubComparison = [
    {
      hub: 'Edmonton',
      capacity: data.insights.hub_status.edmonton_hub.capacity_kg_per_day / 1000, // Convert to tonnes
      projects: data.insights.hub_status.edmonton_hub.project_count,
      investment: data.insights.hub_status.edmonton_hub.investment_cad / 1e9, // Convert to billions
    },
    {
      hub: 'Calgary',
      capacity: data.insights.hub_status.calgary_hub.capacity_kg_per_day / 1000,
      projects: data.insights.hub_status.calgary_hub.project_count,
      investment: data.insights.hub_status.calgary_hub.investment_cad / 1e9,
    },
  ];

  const facilityTypeData = Object.entries(data.summary.facilities.by_type).map(([type, info]) => ({
    type,
    count: info.count,
    capacity: Math.round(info.capacity_kg_per_day / 1000), // tonnes/day
    fill: HYDROGEN_COLORS[type] || COLORS.grey,
  }));

  const projectsByStatus = Object.entries(data.summary.projects.by_status).map(([status, count]) => ({
    status,
    count,
  }));

  // Format pricing data for chart
  const pricingTrend = data.pricing?.slice(0, 12).reverse().map((p: any) => ({
    date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    price: p.price_cad_per_kg,
    diesel_equiv: p.diesel_equivalent_price_per_litre,
  })) || [];

  // Format demand forecast
  const demandForecast = data.demand_forecast?.slice(0, 60).map((d: any) => ({
    date: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    transportation: Math.round(d.transportation_demand_kg / 1000),
    industrial: Math.round(d.industrial_demand_kg / 1000),
    power: Math.round(d.power_generation_demand_kg / 1000),
    total: Math.round(d.total_demand_kg / 1000),
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Fuel className="w-10 h-10 text-green-600" />
          <h1 className="text-4xl font-bold text-slate-800">
            Hydrogen Economy Hub Dashboard
          </h1>
        </div>
        <p className="text-lg text-slate-600 ml-13">
          $300M Federal Investment | Edmonton & Calgary Hubs
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Province:</span>
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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

          <label className="flex items-center gap-2 ml-4">
            <Factory className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Hub:</span>
          </label>
          <select
            value={selectedHub || ''}
            onChange={(e) => setSelectedHub(e.target.value || null)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Hubs</option>
            <option value="Edmonton Hub">Edmonton Hub</option>
            <option value="Calgary Hub">Calgary Hub</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<Factory className="w-8 h-8" />}
          title="Total Facilities"
          value={data.summary.facilities.total_count}
          subtitle={`${data.summary.facilities.operational_count} operational`}
          color="green"
        />
        <MetricCard
          icon={<Zap className="w-8 h-8" />}
          title="Production Capacity"
          value={`${Math.round(data.summary.facilities.total_design_capacity_kg_per_day / 1000)} t/day`}
          subtitle="Design capacity"
          color="blue"
        />
        <MetricCard
          icon={<Calendar className="w-8 h-8" />}
          title="Active Projects"
          value={data.summary.projects.total_count}
          subtitle={`$${(data.summary.projects.total_investment_cad / 1e9).toFixed(1)}B investment`}
          color="purple"
        />
        <MetricCard
          icon={<DollarSign className="w-8 h-8" />}
          title="Current Price"
          value={data.summary.pricing ? `$${data.summary.pricing.current_price_cad_per_kg.toFixed(2)}/kg` : 'N/A'}
          subtitle={data.summary.pricing?.weekly_change_percentage ?
            `${data.summary.pricing.weekly_change_percentage > 0 ? '+' : ''}${data.summary.pricing.weekly_change_percentage.toFixed(1)}% weekly` :
            'No change data'}
          color="amber"
        />
      </div>

      {/* Hub Comparison */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-green-600" />
          Edmonton vs Calgary Hub Comparison
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hubComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hub" />
            <YAxis yAxisId="left" orientation="left" stroke={COLORS.green} />
            <YAxis yAxisId="right" orientation="right" stroke={COLORS.blue} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="capacity" name="Capacity (tonnes/day)" fill={COLORS.green} />
            <Bar yAxisId="right" dataKey="investment" name="Investment ($B)" fill={COLORS.blue} />
            <Bar yAxisId="right" dataKey="projects" name="Project Count" fill={COLORS.purple} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">Edmonton Hub</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Capacity:</span>
                <span className="font-semibold">{(data.insights.hub_status.edmonton_hub.capacity_kg_per_day / 1000).toFixed(0)} t/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Projects:</span>
                <span className="font-semibold">{data.insights.hub_status.edmonton_hub.project_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Investment:</span>
                <span className="font-semibold">${(data.insights.hub_status.edmonton_hub.investment_cad / 1e9).toFixed(1)}B</span>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-2">🏆 Industrial Heartland - Air Products $1.3B Complex</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">Calgary Hub</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Capacity:</span>
                <span className="font-semibold">{(data.insights.hub_status.calgary_hub.capacity_kg_per_day / 1000).toFixed(0)} t/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Projects:</span>
                <span className="font-semibold">{data.insights.hub_status.calgary_hub.project_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Investment:</span>
                <span className="font-semibold">${(data.insights.hub_status.calgary_hub.investment_cad / 1e9).toFixed(1)}B</span>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-2">🚆 Calgary-Banff H₂ Rail + ATCO Demonstrations</p>
          </div>
        </div>
      </div>

      {/* Hydrogen Color Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Cloud className="w-6 h-6 text-green-600" />
            Hydrogen Color Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={colorDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {colorDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Green H₂ (Electrolysis)
              </span>
              <span className="font-bold">{data.insights.color_distribution.green_percentage}%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Blue H₂ (SMR + CCUS)
              </span>
              <span className="font-bold">{data.insights.color_distribution.blue_percentage}%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                Grey H₂ (SMR)
              </span>
              <span className="font-bold">{data.insights.color_distribution.grey_percentage}%</span>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-700">
                <strong>CCUS Integration:</strong> {data.summary.facilities.ccus_integrated_count} facilities with carbon capture (Blue H₂ pathway)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Factory className="w-6 h-6 text-green-600" />
            Facilities by Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={facilityTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity" name="Capacity (tonnes/day)" fill={COLORS.green} />
              <Bar dataKey="count" name="Facility Count" fill={COLORS.blue} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pricing Trends */}
      {pricingTrend.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Hydrogen Pricing Trends (Alberta)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pricingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="price" name="H₂ Price ($/kg)" stroke={COLORS.blue} strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="diesel_equiv" name="Diesel Equiv ($/L)" stroke={COLORS.grey} strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
          {data.summary.pricing && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-slate-600">Current Price</div>
                <div className="text-2xl font-bold text-blue-600">${data.summary.pricing.current_price_cad_per_kg.toFixed(2)}/kg</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-slate-600">Yearly Average</div>
                <div className="text-2xl font-bold text-green-600">${data.summary.pricing.yearly_average.toFixed(2)}/kg</div>
              </div>
              <div className={`p-3 ${data.summary.pricing.weekly_change_percentage >= 0 ? 'bg-red-50' : 'bg-green-50'} rounded-lg`}>
                <div className="text-xs text-slate-600">Weekly Change</div>
                <div className={`text-2xl font-bold ${data.summary.pricing.weekly_change_percentage >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.summary.pricing.weekly_change_percentage >= 0 ? '+' : ''}{data.summary.pricing.weekly_change_percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demand Forecast */}
      {demandForecast.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Hydrogen Demand Forecast by Sector (5-Year Outlook)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={demandForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="transportation" stackId="1" stroke={COLORS.blue} fill={COLORS.blue} name="Transportation" />
              <Area type="monotone" dataKey="industrial" stackId="1" stroke={COLORS.purple} fill={COLORS.purple} name="Industrial" />
              <Area type="monotone" dataKey="power" stackId="1" stroke={COLORS.green} fill={COLORS.green} name="Power Generation" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strategic Projects */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-green-600" />
          Major Hydrogen Projects
        </h2>
        <div className="space-y-4">
          {data.projects.slice(0, 5).map((project) => (
            <div key={project.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{project.project_name}</h3>
                  <p className="text-sm text-slate-600">{project.lead_proponent}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  project.status === 'Operational' ? 'bg-green-100 text-green-700' :
                  project.status === 'Under Construction' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'Planning' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {project.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Type:</span>
                  <div className="font-semibold">{project.project_type}</div>
                </div>
                <div>
                  <span className="text-slate-500">H₂ Type:</span>
                  <div className="font-semibold flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: HYDROGEN_COLORS[project.hydrogen_type] || COLORS.grey }}></div>
                    {project.hydrogen_type}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Investment:</span>
                  <div className="font-semibold">${(project.capital_investment_cad / 1e9).toFixed(2)}B</div>
                </div>
                <div>
                  <span className="text-slate-500">Federal Funding:</span>
                  <div className="font-semibold text-green-600">${(project.federal_funding_cad / 1e6).toFixed(0)}M</div>
                </div>
              </div>
              {project.part_of_hub && (
                <div className="mt-2 text-xs text-slate-500">
                  📍 {project.part_of_hub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Truck className="w-6 h-6 text-green-600" />
          Infrastructure Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {data.summary.infrastructure.refueling_stations}
            </div>
            <div className="text-sm text-slate-600">Refueling Stations</div>
            <div className="text-xs text-slate-500 mt-1">
              {Math.round(data.summary.infrastructure.total_refueling_capacity / 1000)} t/day capacity
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {Math.round(data.summary.infrastructure.pipelines_km)}
            </div>
            <div className="text-sm text-slate-600">Pipeline (km)</div>
            <div className="text-xs text-slate-500 mt-1">
              Distribution network
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {data.facilities.filter(f => f.facility_type === 'Storage').length}
            </div>
            <div className="text-sm text-slate-600">Storage Facilities</div>
            <div className="text-xs text-slate-500 mt-1">
              Capacity buffer
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 mt-8">
        <p>Data Source: Alberta Hydrogen Roadmap, Air Products, ATCO, University of Alberta</p>
        <p className="mt-1">Strategic Context: $300M Federal Investment, Edmonton & Calgary Hydrogen Hubs (2025)</p>
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'green' | 'blue' | 'purple' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
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

export default HydrogenEconomyDashboard;
