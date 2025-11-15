/**
 * Enhanced Grid Optimization Dashboard
 * 
 * Real-time grid monitoring and optimization recommendations for Canadian energy infrastructure.
 * Uses real data instead of mock data for production-ready functionality.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, TrendingUp, AlertTriangle, CheckCircle, Settings, Battery, Gauge, Target, Activity, Wifi, WifiOff, Download } from 'lucide-react';
import { enhancedDataService, type RealGridStatus } from '../lib/enhancedDataService';
import { HelpButton } from './HelpButton';

interface GridMetrics {
  totalDemand: number;
  totalSupply: number;
  averageFrequency: number;
  gridStability: 'stable' | 'warning' | 'critical';
  renewablePercentage: number;
  systemEfficiency: number;
}

const CONTAINER_CLASSES = "bg-white rounded-lg shadow p-6";

export const EnhancedGridOptimizationDashboard: React.FC = () => {
  const [gridData, setGridData] = useState<RealGridStatus[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'optimization' | 'forecasting'>('overview');

  useEffect(() => {
    loadGridData();
    const interval = setInterval(loadGridData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadGridData = async () => {
    try {
      const [grid, recs, timeSeries] = await Promise.all([
        Promise.resolve(enhancedDataService.getRealGridStatus()),
        Promise.resolve(enhancedDataService.getGridOptimizationRecommendations()),
        Promise.resolve(enhancedDataService.generateTimeSeriesData(24))
      ]);
      
      setGridData(grid);
      setRecommendations(recs);
      setTimeSeriesData(timeSeries);
    } catch (error) {
      console.error('Error loading grid data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate grid metrics
  const metrics: GridMetrics = useMemo(() => {
    if (gridData.length === 0) {
      return {
        totalDemand: 0,
        totalSupply: 0,
        averageFrequency: 60.0,
        gridStability: 'stable',
        renewablePercentage: 0,
        systemEfficiency: 0
      };
    }

    const totalDemand = gridData.reduce((sum, region) => sum + region.demand, 0);
    const totalSupply = gridData.reduce((sum, region) => sum + region.supply, 0);
    const avgFrequency = gridData.reduce((sum, region) => sum + region.frequency, 0) / gridData.length;
    const avgRenewable = gridData.reduce((sum, region) => sum + region.renewable_percentage, 0) / gridData.length;
    const efficiency = totalDemand > 0 ? (totalDemand / totalSupply) * 100 : 0;
    
    let stability: 'stable' | 'warning' | 'critical' = 'stable';
    if (Math.abs(avgFrequency - 60.0) > 0.05) stability = 'warning';
    if (Math.abs(avgFrequency - 60.0) > 0.1) stability = 'critical';

    return {
      totalDemand,
      totalSupply,
      averageFrequency: avgFrequency,
      gridStability: stability,
      renewablePercentage: avgRenewable,
      systemEfficiency: efficiency
    };
  }, [gridData]);

  // Filter data by region
  const filteredData = useMemo(() => {
    if (selectedRegion === 'all') return gridData;
    return gridData.filter(region => region.region === selectedRegion);
  }, [gridData, selectedRegion]);

  const getStabilityColor = (stability: string) => {
    switch (stability) {
      case 'stable': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-lg shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-300" size={32} />
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold">Grid Optimization Dashboard</h1>
                <p className="text-blue-200">Real-time Canadian Grid Monitoring • AI-Powered Optimization</p>
              </div>
              <HelpButton id="enhanced.grid" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white/10 rounded-lg p-1">
              {['overview', 'optimization', 'forecasting'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg text-sm"
            >
              <option value="all" className="text-black">All Regions</option>
              {gridData.map(region => (
                <option key={region.id} value={region.region} className="text-black">
                  {region.region}
                </option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Total Demand</span>
            </div>
            <div className="text-lg font-bold">{(metrics.totalDemand / 1000).toFixed(1)}GW</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-green-300" />
              <span className="text-sm font-medium">Total Supply</span>
            </div>
            <div className="text-lg font-bold">{(metrics.totalSupply / 1000).toFixed(1)}GW</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Frequency</span>
            </div>
            <div className="text-lg font-bold">{metrics.averageFrequency.toFixed(2)}Hz</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {metrics.gridStability === 'stable' ? <Wifi size={16} className="text-green-300" /> : <WifiOff size={16} className="text-red-300" />}
              <span className="text-sm font-medium">Grid Status</span>
            </div>
            <div className={`text-sm font-bold capitalize ${
              metrics.gridStability === 'stable' ? 'text-green-300' :
              metrics.gridStability === 'warning' ? 'text-yellow-300' : 'text-red-300'
            }`}>
              {metrics.gridStability}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Battery size={16} className="text-emerald-300" />
              <span className="text-sm font-medium">Renewable %</span>
            </div>
            <div className="text-lg font-bold">{metrics.renewablePercentage.toFixed(1)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target size={16} className="text-purple-300" />
              <span className="text-sm font-medium">Efficiency</span>
            </div>
            <div className="text-lg font-bold">{metrics.systemEfficiency.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Grid Status */}
          <div className={CONTAINER_CLASSES}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Regional Grid Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="demand" fill="#3B82F6" name="Demand (MW)" />
                <Bar dataKey="supply" fill="#10B981" name="Supply (MW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Real-time Frequency Monitoring */}
          <div className={CONTAINER_CLASSES}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">24-Hour Demand Profile</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="demand" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Demand (MW)" />
                <Area type="monotone" dataKey="supply" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Supply (MW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'optimization' && recommendations && (
        <div className="space-y-6">
          {/* Optimization Recommendations */}
          <div className={CONTAINER_CLASSES}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">AI-Powered Optimization Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-blue-600" size={20} />
                  <span className="font-medium text-blue-900">Potential Savings</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {(recommendations.potential_savings.annual_mwh / 1000000).toFixed(1)}M MWh/year
                </div>
                <div className="text-sm text-blue-600">
                  ${(recommendations.potential_savings.annual_cost_cad / 1000000).toFixed(0)}M CAD annually
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-600" size={20} />
                  <span className="font-medium text-green-900">CO₂ Reduction</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {(recommendations.potential_savings.co2_reduction_tonnes / 1000).toFixed(0)}k tonnes
                </div>
                <div className="text-sm text-green-600">Annual emissions reduction</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-purple-600" size={20} />
                  <span className="font-medium text-purple-900">Recommendations</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{recommendations.recommendations.length}</div>
                <div className="text-sm text-purple-600">Optimization opportunities</div>
              </div>
            </div>

            <div className="space-y-4">
              {recommendations.recommendations.map((rec: any, index: number) => (
                <div key={rec.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{rec.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className={`px-2 py-1 rounded-full font-medium ${
                          rec.impact === 'high' ? 'bg-red-100 text-red-800' :
                          rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.impact.toUpperCase()} IMPACT
                        </span>
                        <span className="text-slate-600">
                          Implementation: {rec.implementation_time}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        ${(rec.cost / 1000000).toFixed(0)}M
                      </div>
                      <div className="text-sm text-slate-600">Investment</div>
                      <div className="text-sm font-medium text-green-600">
                        {rec.payback.toFixed(1)} year payback
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'forecasting' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Renewable Energy Distribution */}
          <div className={CONTAINER_CLASSES}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Renewable Energy by Region</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filteredData.map(region => ({
                    name: region.region,
                    value: region.renewable_percentage,
                    demand: region.demand
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Price Forecast */}
          <div className={CONTAINER_CLASSES}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">24-Hour Price Forecast</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#F59E0B" strokeWidth={2} name="Price (CAD/MWh)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Regional Details */}
      <div className={CONTAINER_CLASSES}>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Regional Grid Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-900">Region</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900">Demand (MW)</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900">Supply (MW)</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900">Frequency (Hz)</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900">Renewable %</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900">Reserve Margin</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((region) => (
                <tr key={region.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{region.region}</td>
                  <td className="py-3 px-4">{region.demand.toLocaleString()}</td>
                  <td className="py-3 px-4">{region.supply.toLocaleString()}</td>
                  <td className="py-3 px-4">{region.frequency.toFixed(3)}</td>
                  <td className="py-3 px-4">{region.renewable_percentage.toFixed(1)}%</td>
                  <td className="py-3 px-4">{region.reserve_margin.toFixed(1)}%</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      Math.abs(region.frequency - 60.0) < 0.02 ? 'bg-green-100 text-green-800' :
                      Math.abs(region.frequency - 60.0) < 0.05 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.abs(region.frequency - 60.0) < 0.02 ? 'STABLE' :
                       Math.abs(region.frequency - 60.0) < 0.05 ? 'WARNING' : 'CRITICAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGridOptimizationDashboard;
