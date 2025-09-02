/**
 * Data Visualization Component
 * 
 * Provides multiple interactive charts and graphs simultaneously for different energy datasets
 * using Recharts library. Displays line chart at top, bar chart and pie chart side by side.
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { DatasetType, DatasetInfo } from '../lib/dataManager';

interface DataVisualizationProps {
  data: any[];
  datasetType: DatasetType;
  datasetInfo: DatasetInfo;
}

// Color palette for charts
const CHART_COLORS = [
  '#0ea5e9', // Electric blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange-600
  '#ec4899', // Pink
  '#6366f1'  // Indigo
];

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(2);
};

const formatCurrency = (value: number) => {
  return `$${value.toFixed(2)}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  data,
  datasetType,
  datasetInfo
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Limit data for performance (sample for large datasets)
    const sampleData = data.length > 1000 
      ? data.filter((_, index) => index % Math.ceil(data.length / 1000) === 0)
      : data;

    switch (datasetType) {
      case 'provincial_generation':
        return processProvincialGenerationData(sampleData);
      case 'ontario_demand':
        return processOntarioDemandData(sampleData);
      case 'ontario_prices':
        return processOntarioPricesData(sampleData);
      case 'hf_electricity_demand':
        return processHFElectricityDemandData(sampleData);
      default:
        return null;
    }
  }, [data, datasetType]);

  const renderVisualization = () => {
    if (!chartData) {
      return (
        <div className="h-96 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-lg font-medium">No data available for visualization</div>
            <div className="text-sm">Try adjusting your filters or refresh the dataset</div>
          </div>
        </div>
      );
    }

    switch (datasetType) {
      case 'provincial_generation':
        return renderProvincialGenerationCharts(chartData);
      case 'ontario_demand':
        return renderOntarioDemandCharts(chartData);
      case 'ontario_prices':
        return renderOntarioPricesCharts(chartData);
      case 'hf_electricity_demand':
        return renderHFElectricityDemandCharts(chartData);
      default:
        return <div>Unsupported dataset type</div>;
    }
  };

  return (
    <div className="space-y-6">
      {renderVisualization()}
    </div>
  );
};

// Provincial Generation Data Processing
const processProvincialGenerationData = (data: any[]) => {
  // Group by date and sum megawatt hours
  const dateMap = new Map<string, number>();
  const provinceMap = new Map<string, number>();
  const typeMap = new Map<string, number>();

  data.forEach(row => {
    const date = row.date;
    const province = row.province;
    const type = row.generation_type;
    const mwh = row.megawatt_hours || 0;

    dateMap.set(date, (dateMap.get(date) || 0) + mwh);
    provinceMap.set(province, (provinceMap.get(province) || 0) + mwh);
    typeMap.set(type, (typeMap.get(type) || 0) + mwh);
  });

  return {
    timeSeriesData: Array.from(dateMap.entries())
      .map(([date, mwh]) => ({ date, mwh }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 100), // Limit for performance
    provinceData: Array.from(provinceMap.entries())
      .map(([province, mwh]) => ({ province, mwh }))
      .sort((a, b) => b.mwh - a.mwh),
    typeData: Array.from(typeMap.entries())
      .map(([type, mwh]) => ({ type, mwh }))
      .sort((a, b) => b.mwh - a.mwh)
  };
};

const renderProvincialGenerationCharts = (chartData: any) => {
  const { timeSeriesData, provinceData, typeData } = chartData;

  return (
    <>
      {/* Time Series Chart - Top */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">Generation Over Time</h4>
        <div className="bg-slate-50 rounded-lg p-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#64748b"
              />
              <YAxis 
                tickFormatter={formatNumber}
                stroke="#64748b"
              />
              <Tooltip 
                formatter={(value: any, name: string) => [formatNumber(value as number) + ' MWh', 'Generation']}
                labelFormatter={(label: string) => formatDate(label)}
              />
              <Area 
                type="monotone" 
                dataKey="mwh" 
                stroke={CHART_COLORS[0]} 
                fill={CHART_COLORS[0]} 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar and Pie Charts - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Generation by Province */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Generation by Province</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="province" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  stroke="#64748b"
                />
                <YAxis tickFormatter={formatNumber} stroke="#64748b" />
                <Tooltip formatter={(value: any) => [formatNumber(value as number) + ' MWh', 'Generation']} />
                <Bar dataKey="mwh" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Generation by Type */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Generation by Type</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type.substring(0, 8)}... ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="mwh"
                >
                  {typeData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [formatNumber(value as number) + ' MWh', 'Generation']} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

// Ontario Demand Data Processing
const processOntarioDemandData = (data: any[]) => {
  // Sort by datetime and limit for time series
  const timeSeriesData = data
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 500) // Limit for performance
    .map(row => ({
      datetime: row.datetime,
      demand_mw: row.total_demand_mw || 0,
      demand_gwh: row.hourly_demand_gwh || 0,
      hour: new Date(row.datetime).getHours()
    }));

  // Group by hour for pattern analysis
  const hourlyPattern = Array.from({ length: 24 }, (_, hour) => {
    const hourData = data.filter(row => new Date(row.datetime).getHours() === hour);
    const avgDemand = hourData.length > 0 
      ? hourData.reduce((sum, row) => sum + (row.total_demand_mw || 0), 0) / hourData.length
      : 0;
    return { hour: `${hour}:00`, demand_mw: avgDemand };
  });

  return { timeSeriesData, hourlyPattern };
};

const renderOntarioDemandCharts = (chartData: any) => {
  const { timeSeriesData, hourlyPattern } = chartData;

  return (
    <>
      {/* Time Series Chart - Top */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">Electricity Demand Over Time</h4>
        <div className="bg-slate-50 rounded-lg p-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="datetime" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="#64748b"
              />
              <YAxis tickFormatter={formatNumber} stroke="#64748b" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'demand_mw') return [formatNumber(value as number) + ' MW', 'Demand (MW)'];
                  return [formatNumber(value as number) + ' GWh', 'Demand (GWh)'];
                }}
                labelFormatter={(value: string) => new Date(value).toLocaleString()}
              />
              <Line 
                type="monotone" 
                dataKey="demand_mw" 
                stroke={CHART_COLORS[1]} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart and Summary - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Hourly Pattern */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Average Demand by Hour</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis tickFormatter={formatNumber} stroke="#64748b" />
                <Tooltip formatter={(value: any) => [formatNumber(value as number) + ' MW', 'Average Demand']} />
                <Bar dataKey="demand_mw" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Statistics */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Demand Statistics</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <div className="space-y-4 h-full flex flex-col justify-center">
              {(() => {
                const maxDemand = Math.max(...timeSeriesData.map((d: any) => d.demand_mw));
                const minDemand = Math.min(...timeSeriesData.map((d: any) => d.demand_mw));
                const avgDemand = timeSeriesData.reduce((sum: number, d: any) => sum + d.demand_mw, 0) / timeSeriesData.length;
                
                return (
                  <>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{formatNumber(maxDemand)} MW</div>
                      <div className="text-sm text-slate-600">Peak Demand</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{formatNumber(avgDemand)} MW</div>
                      <div className="text-sm text-slate-600">Average Demand</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-orange-600">{formatNumber(minDemand)} MW</div>
                      <div className="text-sm text-slate-600">Minimum Demand</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Ontario Prices Data Processing
const processOntarioPricesData = (data: any[]) => {
  // Sort by datetime and limit for time series
  const timeSeriesData = data
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 500) // Limit for performance
    .map(row => ({
      datetime: row.datetime,
      lmp_price: row.lmp_price || 0,
      energy_price: row.energy_price || 0,
      congestion_price: row.congestion_price || 0,
      zone: row.zone
    }));

  // Group by zone for comparison
  const zoneMap = new Map<string, { total: number, count: number }>();
  data.forEach(row => {
    const zone = row.zone;
    const price = row.lmp_price || 0;
    const current = zoneMap.get(zone) || { total: 0, count: 0 };
    zoneMap.set(zone, { total: current.total + price, count: current.count + 1 });
  });

  const zoneData = Array.from(zoneMap.entries())
    .map(([zone, stats]) => ({
      zone,
      avg_price: stats.count > 0 ? stats.total / stats.count : 0
    }))
    .sort((a, b) => b.avg_price - a.avg_price);

  return { timeSeriesData, zoneData };
};

const renderOntarioPricesCharts = (chartData: any) => {
  const { timeSeriesData, zoneData } = chartData;

  return (
    <>
      {/* Time Series Chart - Top */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">LMP Prices Over Time</h4>
        <div className="bg-slate-50 rounded-lg p-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="datetime" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="#64748b"
              />
              <YAxis tickFormatter={formatCurrency} stroke="#64748b" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'lmp_price') return [formatCurrency(value as number), 'LMP Price'];
                  if (name === 'energy_price') return [formatCurrency(value as number), 'Energy Price'];
                  if (name === 'congestion_price') return [formatCurrency(value as number), 'Congestion Price'];
                  return [formatCurrency(value as number), name];
                }}
                labelFormatter={(value: string) => new Date(value).toLocaleString()}
              />
              <Line 
                type="monotone" 
                dataKey="lmp_price" 
                stroke={CHART_COLORS[2]} 
                strokeWidth={2}
                dot={false}
                name="LMP Price"
              />
              <Line 
                type="monotone" 
                dataKey="energy_price" 
                stroke={CHART_COLORS[1]} 
                strokeWidth={1}
                dot={false}
                name="Energy Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart and Price Distribution - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Average Prices by Zone */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Average Prices by Zone</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="zone" stroke="#64748b" />
                <YAxis tickFormatter={formatCurrency} stroke="#64748b" />
                <Tooltip formatter={(value: any) => [formatCurrency(value as number), 'Average Price']} />
                <Bar dataKey="avg_price" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price Statistics */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Price Statistics</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <div className="space-y-4 h-full flex flex-col justify-center">
              {(() => {
                const prices = timeSeriesData.map((d: any) => d.lmp_price);
                const maxPrice = Math.max(...prices);
                const minPrice = Math.min(...prices);
                const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
                
                return (
                  <>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(maxPrice)}</div>
                      <div className="text-sm text-slate-600">Peak Price</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(avgPrice)}</div>
                      <div className="text-sm text-slate-600">Average Price</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(minPrice)}</div>
                      <div className="text-sm text-slate-600">Minimum Price</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// HF Electricity Demand Data Processing
const processHFElectricityDemandData = (data: any[]) => {
  // Sort by datetime and limit for time series
  const timeSeriesData = data
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 500) // Limit for performance
    .map(row => ({
      datetime: row.datetime,
      demand: row.electricity_demand || 0,
      temperature: row.temperature || 0,
      humidity: row.humidity || 0
    }));

  // Temperature vs Demand scatter plot data
  const scatterData = data
    .slice(0, 1000) // Limit for performance
    .map(row => ({
      temperature: row.temperature || 0,
      demand: row.electricity_demand || 0
    }));

  return { timeSeriesData, scatterData };
};

const renderHFElectricityDemandCharts = (chartData: any) => {
  const { timeSeriesData, scatterData } = chartData;

  return (
    <>
      {/* Time Series Chart - Top */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">Electricity Demand and Temperature</h4>
        <div className="bg-slate-50 rounded-lg p-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="datetime" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="#64748b"
              />
              <YAxis yAxisId="left" tickFormatter={formatNumber} stroke="#64748b" />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Demand (kWh)') return [formatNumber(value as number) + ' kWh', 'Demand'];
                  if (name === 'Temperature (°C)') return [value + '°C', 'Temperature'];
                  return [value, name];
                }}
                labelFormatter={(value: string) => new Date(value).toLocaleString()}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="demand" 
                stroke={CHART_COLORS[3]} 
                strokeWidth={2}
                dot={false}
                name="Demand (kWh)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="temperature" 
                stroke={CHART_COLORS[4]} 
                strokeWidth={1}
                dot={false}
                name="Temperature (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter and Statistics - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter Plot - Temperature vs Demand */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Temperature vs Demand Correlation</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="temperature" 
                  name="Temperature"
                  unit="°C"
                  stroke="#64748b"
                />
                <YAxis 
                  type="number" 
                  dataKey="demand" 
                  name="Demand"
                  unit=" kWh"
                  stroke="#64748b"
                  tickFormatter={formatNumber}
                />
                <Tooltip 
                  formatter={([y, x]: [number, number]) => [
                    `${formatNumber(y)} kWh`,
                    `${x}°C`
                  ]}
                  labelFormatter={() => 'Temperature vs Demand'}
                />
                <Scatter 
                  name="Household Demand" 
                  dataKey="demand" 
                  fill={CHART_COLORS[3]}
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demand Statistics */}
        <div>
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Demand & Temperature Stats</h4>
          <div className="bg-slate-50 rounded-lg p-4" style={{ height: '300px' }}>
            <div className="space-y-4 h-full flex flex-col justify-center">
              {(() => {
                const demands = timeSeriesData.map((d: any) => d.demand);
                const temps = timeSeriesData.map((d: any) => d.temperature);
                
                const maxDemand = Math.max(...demands);
                const avgDemand = demands.reduce((sum: number, d: number) => sum + d, 0) / demands.length;
                const avgTemp = temps.reduce((sum: number, t: number) => sum + t, 0) / temps.length;
                
                return (
                  <>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{formatNumber(maxDemand)} kWh</div>
                      <div className="text-sm text-slate-600">Peak Demand</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{formatNumber(avgDemand)} kWh</div>
                      <div className="text-sm text-slate-600">Average Demand</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-orange-600">{avgTemp.toFixed(1)}°C</div>
                      <div className="text-sm text-slate-600">Average Temperature</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
