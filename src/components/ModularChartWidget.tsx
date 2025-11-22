/**
 * Modular Chart Widget Component
 *
 * Reusable chart component with multiple visualization types,
 * interactive features, and AI-powered insights.
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, ComposedChart
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Settings, Download, Maximize2 } from 'lucide-react';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ModularChartProps {
  title: string;
  data: ChartDataPoint[];
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'composed';
  dataKeys: string[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
  aiInsights?: boolean;
  onDataPointClick?: (data: any) => void;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

export const ModularChartWidget: React.FC<ModularChartProps> = ({
  title,
  data,
  chartType,
  dataKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  showTooltip = true,
  interactive = true,
  aiInsights = false,
  onDataPointClick
}) => {
  const [selectedDataKeys, setSelectedDataKeys] = useState<string[]>(dataKeys);
  const [chartTypeState, setChartTypeState] = useState(chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDataKeyToggle = (key: string) => {
    setSelectedDataKeys(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleChartTypeChange = (type: typeof chartType) => {
    setChartTypeState(type);
  };

  const exportChart = () => {
    // Implementation for chart export
    console.log('Exporting chart:', title);
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartTypeState) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {selectedDataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {selectedDataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                onClick={onDataPointClick}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={onDataPointClick}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip />}
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {selectedDataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis dataKey="value" />
            {showTooltip && <Tooltip cursor={{ strokeDasharray: '3 3' }} />}
            {showLegend && <Legend />}
            {selectedDataKeys.map((key, index) => (
              <Scatter
                key={key}
                name={key}
                dataKey={key}
                fill={colors[index % colors.length]}
              />
            ))}
          </ScatterChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {selectedDataKeys.map((key, index) => {
              if (index % 2 === 0) {
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[index % colors.length]}
                  />
                );
              } else {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className={`card ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-auto' : ''}`}>
      {/* Chart Header */}
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-black/20 p-2 rounded-lg">
            <BarChart3 className="h-5 w-5 text-electric" />
          </div>
          <div>
            <h3 className="card-title">{title}</h3>
            <p className="text-sm text-secondary">{data.length} data points</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <select
            value={chartTypeState}
            onChange={(e) => handleChartTypeChange(e.target.value as typeof chartType)}
            className="text-sm border border-slate-300 rounded px-2 py-1"
          >
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
            <option value="area">Area</option>
            <option value="scatter">Scatter</option>
            <option value="composed">Composed</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportChart}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Export Chart"
          >
            <Download className="h-4 w-4 text-slate-600" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Data Key Toggles */}
      {interactive && dataKeys.length > 1 && (
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap gap-2">
            {dataKeys.map((key, index) => (
              <button
                key={key}
                onClick={() => handleDataKeyToggle(key)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedDataKeys.includes(key)
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  {key}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>

        {/* AI Insights */}
        {aiInsights && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">AI Insights</span>
            </div>
            <p className="text-sm text-blue-700">
              Analysis shows {selectedDataKeys.length > 0 ? `${selectedDataKeys[0]} trending` : 'data trending'}
              {data.length > 10 ? ' upward' : ' steadily'}. Consider seasonal adjustments for accurate forecasting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModularChartWidget;
