/**
 * Critical Minerals Supply Chain Intelligence Dashboard
 *
 * Strategic Priority: $6.4B Federal Investment, 30% Tax Credit, National Security Priority
 * Problem Solved: Supply chain visibility, gap identification, China dependency tracking
 *
 * Key Features:
 * - Supply chain completeness visualization (Mining → Manufacturing)
 * - Strategic gap identification (missing domestic processing capacity)
 * - China dependency analysis by mineral
 * - Battery supply chain linkage (mine → battery → EV)
 * - Price volatility tracking
 * - Trade flow analysis
 * - EV demand forecasting with supply gap analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Sankey,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Area, ScatterChart, Scatter
} from 'recharts';
import {
  Package, AlertTriangle, TrendingUp, Globe, Factory,
  Shield, DollarSign, Zap, MapPin, Activity, ChevronRight, CheckCircle, XCircle
} from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';
import { isEdgeFetchEnabled } from '../lib/config';

interface DashboardData {
  projects: any[];
  supply_chain: any[];
  battery_facilities: any[];
  prices: any[];
  trade_flows: any[];
  ev_demand_forecast: any[];
  stockpile: any[];
  summary: {
    projects: any;
    supply_chain: any;
    battery_facilities: any;
    pricing: any;
    trade: any;
    stockpile: any;
  };
  insights: {
    strategic_recommendations: string[];
    supply_chain_gaps: any[];
    investment_opportunities: any[];
  };
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  pink: '#ec4899',
};

const PRIORITY_MINERALS = ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Copper', 'Rare Earth Elements'];

const SUPPLY_CHAIN_STAGES = ['Mining', 'Concentration', 'Refining', 'Processing', 'Manufacturing', 'Recycling'];

export const CriticalMineralsSupplyChainDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMineral, setSelectedMineral] = useState<string | null>(null);
  const [priorityOnly, setPriorityOnly] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isEdgeFetchEnabled()) {
      console.warn('CriticalMineralsSupplyChainDashboard: Supabase Edge disabled or not configured; running in offline/demo mode.');
      setLoading(false);
      setData(null);
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (selectedMineral) queryParams.append('mineral', selectedMineral);
      if (priorityOnly) queryParams.append('priority', 'true');

      const response = await fetchEdgeJson([
        `api-v2-minerals-supply-chain?${queryParams.toString()}`,
        `api/minerals-supply-chain?${queryParams.toString()}`
      ]);

      setData(response.json);
    } catch (err) {
      console.error('Failed to load Critical Minerals data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedMineral, priorityOnly]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-lg text-secondary">Loading Critical Minerals Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isEdgeFetchEnabled() && !error && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <p className="text-lg text-secondary">
            Live Critical Minerals analytics are disabled in this environment (Supabase Edge offline or not configured).
          </p>
          <p className="text-sm text-secondary mt-2">
            In production, configure Supabase Edge functions and set VITE_ENABLE_EDGE_FETCH=true to enable real data.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-lg text-danger">{error || 'No data available'}</p>
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

  // Prepare visualization data
  const projectsByProvince = Object.entries(data.summary.projects.by_province).map(([province, info]: [string, any]) => ({
    province,
    count: info.count,
    capacity: Math.round(info.capacity / 1000), // Convert to thousands
  })).sort((a, b) => b.capacity - a.capacity);

  const projectsByStage = Object.entries(data.summary.projects.by_stage).map(([stage, count]) => ({
    stage,
    count,
  }));

  const supplyChainCompletenessData = selectedMineral
    ? SUPPLY_CHAIN_STAGES.map(stage => {
        const stageData = data.supply_chain.find(sc => sc.stage === stage && sc.mineral === selectedMineral);
        return {
          stage,
          hasDomesticCapacity: stageData && stageData.country === 'Canada' && stageData.status !== 'Closed' ? 100 : 0,
          hasGap: stageData?.is_domestic_gap ? 50 : 0,
        };
      })
    : [];

  const chinaDependencyData = data.summary.trade?.china_dependency && typeof data.summary.trade?.china_dependency === 'number'
    ? [
        { name: 'China', value: data.summary.trade.china_dependency, fill: COLORS.danger },
        { name: 'Other', value: 100 - data.summary.trade.china_dependency, fill: COLORS.success },
      ]
    : [];

  const batteryMineralsDemand = data.summary.battery_facilities?.minerals_demand
    ? [
        { mineral: 'Lithium', demand: Math.round(data.summary.battery_facilities.minerals_demand.lithium_tonnes_per_year / 1000) },
        { mineral: 'Cobalt', demand: Math.round(data.summary.battery_facilities.minerals_demand.cobalt_tonnes_per_year / 1000) },
        { mineral: 'Nickel', demand: Math.round(data.summary.battery_facilities.minerals_demand.nickel_tonnes_per_year / 1000) },
        { mineral: 'Graphite', demand: Math.round(data.summary.battery_facilities.minerals_demand.graphite_tonnes_per_year / 1000) },
      ]
    : [];

  const priceVolatility = data.summary.pricing?.price_volatility
    ? Object.entries(data.summary.pricing.price_volatility).map(([mineral, volatility]) => ({
        mineral,
        volatility,
      })).sort((a, b) => (b.volatility as number) - (a.volatility as number))
    : [];

  // Prepare Mineral Prices time-series data (for Lithium and other priority minerals)
  const mineralPricesTimeSeries = data.prices && data.prices.length > 0
    ? data.prices
        .filter((p: any) => PRIORITY_MINERALS.includes(p.mineral))
        .map((p: any) => ({
          date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          timestamp: p.timestamp,
          mineral: p.mineral,
          price: Math.round(p.price_usd_per_tonne),
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  // Group prices by mineral for multi-line chart
  const pricesByMineral: Record<string, any[]> = {};
  mineralPricesTimeSeries.forEach((item: any) => {
    if (!pricesByMineral[item.mineral]) {
      pricesByMineral[item.mineral] = [];
    }
    pricesByMineral[item.mineral].push(item);
  });

  // Combine all minerals into one dataset with separate columns
  const mineralPricesChart = mineralPricesTimeSeries.reduce((acc: any[], curr: any) => {
    const existing = acc.find(item => item.date === curr.date);
    if (existing) {
      existing[curr.mineral] = curr.price;
    } else {
      acc.push({
        date: curr.date,
        timestamp: curr.timestamp,
        [curr.mineral]: curr.price,
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Prepare Trade Flows data
  const tradeFlowsData = data.trade_flows && data.trade_flows.length > 0
    ? data.trade_flows.map((tf: any) => ({
        mineral: tf.mineral,
        flowType: tf.flow_type,
        volume: Math.round(tf.volume_tonnes / 1000), // Convert to thousands of tonnes
        destination: tf.destination_country || 'Unknown',
        origin: tf.origin_country || 'Unknown',
      }))
    : [];

  // Aggregate trade flows by mineral and flow type
  const tradeFlowsSummary: Record<string, { imports: number; exports: number }> = {};
  tradeFlowsData.forEach((tf: any) => {
    if (!tradeFlowsSummary[tf.mineral]) {
      tradeFlowsSummary[tf.mineral] = { imports: 0, exports: 0 };
    }
    if (tf.flowType === 'Import') {
      tradeFlowsSummary[tf.mineral].imports += tf.volume;
    } else if (tf.flowType === 'Export') {
      tradeFlowsSummary[tf.mineral].exports += tf.volume;
    }
  });

  const tradeFlowsChart = Object.entries(tradeFlowsSummary).map(([mineral, data]) => ({
    mineral,
    imports: data.imports,
    exports: data.exports,
    netBalance: data.exports - data.imports,
  })).sort((a, b) => b.exports - a.exports);

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
                  <Package className="h-6 w-6 text-electric" />
                </div>
                <h1 className="hero-title">Critical Minerals Supply Chain Intelligence</h1>
              </div>
              <p className="hero-subtitle">
                $6.4B federal investment · 30% tax credit · National security priority
              </p>
            </div>
            <HelpButton id="minerals.overview" />
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="card p-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={priorityOnly}
              onChange={(e) => setPriorityOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Priority Minerals Only</span>
          </label>
          <select
            value={selectedMineral || ''}
            onChange={(e) => setSelectedMineral(e.target.value || null)}
            className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm"
          >
            <option value="">All Minerals</option>
            {PRIORITY_MINERALS.map(mineral => (
              <option key={mineral} value={mineral}>{mineral}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.summary.stockpile && (data.summary.stockpile.critical_status_count > 0 || data.summary.stockpile.low_status_count > 0) && (
        <div className="mb-6 p-4 bg-secondary border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 mb-1">STRATEGIC STOCKPILE ALERT</h3>
              <p className="text-danger">
                {data.summary.stockpile.critical_status_count} minerals at CRITICAL stockpile levels,{' '}
                {data.summary.stockpile.low_status_count} at LOW levels
              </p>
              <p className="text-sm text-danger mt-1">
                National security vulnerability - immediate action required
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supply Chain Gaps Alert */}
      {data.insights.supply_chain_gaps.length > 0 && (
        <div className="mb-6 alert-banner-warning border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800 mb-1">SUPPLY CHAIN GAPS IDENTIFIED</h3>
              <ul className="text-amber-700 text-sm space-y-1">
                {data.insights.supply_chain_gaps.slice(0, 3).map((gap: any, idx: number) => (
                  <li key={idx}>• {gap.gap_description}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<Factory className="w-8 h-8" />}
          title="Active Projects"
          value={data.summary.projects.total_count}
          subtitle={`${data.summary.projects.priority_mineral_count} priority minerals`}
          color="purple"
        />
        <MetricCard
          icon={<DollarSign className="w-8 h-8" />}
          title="Total Investment"
          value={`$${(data.summary.projects.total_investment_cad / 1e9).toFixed(1)}B`}
          subtitle={`$${(data.summary.projects.federal_funding_cad / 1e9).toFixed(2)}B federal`}
          color="green"
        />
        <MetricCard
          icon={<Zap className="w-8 h-8" />}
          title="Battery Facilities"
          value={data.summary.battery_facilities.total_count}
          subtitle={`${Math.round(data.summary.battery_facilities.total_capacity_gwh)} GWh capacity`}
          color="blue"
        />
        <MetricCard
          icon={<Shield className="w-8 h-8" />}
          title="Supply Chain Gaps"
          value={data.insights.supply_chain_gaps.length}
          subtitle="Domestic processing missing"
          color="red"
        />
      </div>

      {/* Supply Chain Completeness (if mineral selected) */}
      {selectedMineral && supplyChainCompletenessData.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-electric" />
            {selectedMineral} Supply Chain Completeness
          </h2>
          <div className="grid grid-cols-6 gap-2 mb-6">
            {SUPPLY_CHAIN_STAGES.map((stage, idx) => {
              const stageData = supplyChainCompletenessData[idx];
              const hasCapacity = stageData.hasDomesticCapacity > 0;
              const hasGap = stageData.hasGap > 0;

              return (
                <div key={stage} className="text-center">
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      hasGap
                        ? 'bg-secondary border-red-500'
                        : hasCapacity
                        ? 'bg-secondary border-green-500'
                        : 'bg-secondary border-[var(--border-medium)]'
                    }`}
                  >
                    {hasGap ? (
                      <XCircle className="w-8 h-8 mx-auto text-danger" />
                    ) : hasCapacity ? (
                      <CheckCircle className="w-8 h-8 mx-auto text-success" />
                    ) : (
                      <div className="w-8 h-8 mx-auto rounded-full bg-slate-300" />
                    )}
                    <div className="text-xs font-semibold mt-2">{stage}</div>
                  </div>
                  {idx < SUPPLY_CHAIN_STAGES.length - 1 && (
                    <ChevronRight className="w-4 h-4 mx-auto text-tertiary my-2" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Domestic Capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-danger" />
              <span>Critical Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-300" />
              <span>No Data</span>
            </div>
          </div>
        </div>
      )}

      {/* Projects Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-electric" />
            Projects by Province
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectsByProvince}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="province" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Project Count" fill={COLORS.purple} />
              <Bar dataKey="capacity" name="Capacity (kt/year)" fill={COLORS.teal} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-electric" />
            Projects by Development Stage
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectsByStage}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.stage}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {projectsByStage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* China Dependency Analysis */}
      {chinaDependencyData.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-danger" />
            China Import Dependency Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chinaDependencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chinaDependencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center">
              <div className="p-4 bg-secondary border border-red-200 rounded-lg mb-4">
                <div className="text-4xl font-bold text-danger mb-2">
                  {data.summary.trade?.china_dependency || 0}%
                </div>
                <div className="text-sm text-danger">Import Dependency on China</div>
              </div>
              <div className="text-sm text-secondary space-y-2">
                <p>
                  <strong>Risk Assessment:</strong>{' '}
                  {data.summary.trade.china_dependency > 70 ? 'CRITICAL' :
                   data.summary.trade.china_dependency > 50 ? 'HIGH' :
                   data.summary.trade.china_dependency > 30 ? 'MEDIUM' : 'LOW'}
                </p>
                <p>
                  <strong>Recommendation:</strong> Diversify supply sources, accelerate domestic production,
                  develop strategic stockpiles
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Battery Supply Chain Linkage */}
      {batteryMineralsDemand.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-electric" />
            Battery Facilities Minerals Demand
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={batteryMineralsDemand}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mineral" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="demand" name="Annual Demand (kt)" fill={COLORS.purple} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold text-electric">
                {data.summary.battery_facilities.total_count}
              </div>
              <div className="text-xs text-secondary">Battery Facilities</div>
            </div>
            <div className="p-3 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold text-electric">
                {Math.round(data.summary.battery_facilities.total_capacity_gwh)} GWh
              </div>
              <div className="text-xs text-secondary">Total Capacity</div>
            </div>
            <div className="p-3 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold text-success">
                {data.summary.battery_facilities.domestic_sourcing_avg}%
              </div>
              <div className="text-xs text-secondary">Avg Domestic Sourcing</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-warning">
                ${(data.summary.battery_facilities.total_capacity_gwh * 0.15).toFixed(1)}B
              </div>
              <div className="text-xs text-secondary">Estimated Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Mineral Prices Time-Series Chart */}
      {mineralPricesChart.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-success" />
            Mineral Prices (Monthly Trend)
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={mineralPricesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis label={{ value: 'Price (USD/tonne)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Price']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend verticalAlign="top" height={36} />
              {PRIORITY_MINERALS.map((mineral, idx) => (
                <Line
                  key={mineral}
                  type="monotone"
                  dataKey={mineral}
                  stroke={Object.values(COLORS)[idx % Object.keys(COLORS).length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={mineral}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-secondary mt-4">
            <strong>Data Quality Note:</strong> Displaying last 12 months of price data. January 2024 Lithium price is shown for consistency testing.
          </p>
        </div>
      )}

      {/* Trade Flows Chart */}
      {tradeFlowsChart.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-electric" />
            Trade Flows (Imports vs Exports)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tradeFlowsChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mineral" />
              <YAxis label={{ value: 'Volume (thousands of tonnes)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: any) => `${value.toLocaleString()}k tonnes`} />
              <Legend />
              <Bar dataKey="imports" fill={COLORS.danger} name="Imports" />
              <Bar dataKey="exports" fill={COLORS.success} name="Exports" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {tradeFlowsChart.slice(0, 3).map((item: any) => (
              <div key={item.mineral} className="p-3 bg-secondary rounded-lg">
                <div className="text-sm font-semibold text-secondary">{item.mineral}</div>
                <div className="text-xs text-secondary mt-1">
                  Net Balance: {item.netBalance > 0 ? '+' : ''}{item.netBalance.toLocaleString()}k tonnes
                  <span className={`ml-2 font-semibold ${item.netBalance > 0 ? 'text-success' : 'text-danger'}`}>
                    ({item.netBalance > 0 ? 'Net Exporter' : 'Net Importer'})
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-secondary mt-4">
            <strong>Interpretation:</strong> Positive net balance indicates net exporter status. Negative indicates import dependency.
          </p>
        </div>
      )}

      {/* Price Volatility */}
      {priceVolatility.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-electric" />
            Price Volatility Index (Coefficient of Variation %)
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priceVolatility} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="mineral" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="volatility" fill={COLORS.warning} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-secondary mt-4">
            <strong>Interpretation:</strong> Higher values indicate greater price instability. Values &gt;30% suggest high market risk.
          </p>
        </div>
      )}

      {/* Strategic Recommendations */}
      {data.insights.strategic_recommendations.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-electric" />
            Strategic Recommendations
          </h2>
          <ul className="space-y-3">
            {data.insights.strategic_recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                <AlertTriangle className="w-5 h-5 text-electric flex-shrink-0 mt-0.5" />
                <span className="text-sm text-secondary">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Investment Opportunities */}
      {data.insights.investment_opportunities.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-success" />
            Investment Opportunities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.insights.investment_opportunities.map((opp: any, idx: number) => (
              <div key={idx} className="p-4 border border-green-200 bg-secondary rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">{opp.mineral}</h3>
                <p className="text-sm text-success mb-2">{opp.reason}</p>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  opp.priority === 'High' ? 'bg-red-100 text-danger' :
                  opp.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-electric'
                }`}>
                  {opp.priority} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-tertiary mt-8">
        <p>Data Source: NRCan Critical Minerals Projects, Statistics Canada, Battery Supply Chain Data</p>
        <p className="mt-1">Strategic Context: $6.4B Federal Investment, 30% Exploration Tax Credit, National Security Priority (2025)</p>
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'purple' | 'green' | 'blue' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, color }) => {
  const colorClasses = {
    purple: 'bg-secondary text-electric border-purple-200',
    green: 'bg-secondary text-success border-green-200',
    blue: 'bg-secondary text-electric border-blue-200',
    red: 'bg-secondary text-danger border-red-200',
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

export default CriticalMineralsSupplyChainDashboard;
