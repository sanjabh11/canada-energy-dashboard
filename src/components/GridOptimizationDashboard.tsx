import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, TrendingUp, AlertTriangle, CheckCircle, Settings, Battery, Gauge, Target, Activity, Wifi, WifiOff } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { useStreamingData } from '../hooks/useStreamingData';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import { CONTAINER_CLASSES } from '../lib/ui/layout';
import { realDataService } from '../lib/realDataService';

// Interfaces for Grid Optimization Dashboard
export interface GridStatus {
  id: string;
  region: string;
  demand: number;
  supply: number;
  frequency: number;
  voltage: number;
  congestion: number;
  timestamp: string;
  status: 'stable' | 'warning' | 'critical';
}

export interface OptimizationRecommendation {
  id: string;
  type: 'demand_response' | 'generation_adjustment' | 'congestion_relief' | 'voltage_control';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: number;
  implementationTime: number;
  confidence: number;
  timestamp: string;
}

export interface StabilityMetrics {
  frequencyStability: number;
  voltageStability: number;
  congestionIndex: number;
  reserveMargin: number;
  lastUpdated: string;
}

const GridOptimizationDashboard: React.FC = () => {
  const [gridStatus, setGridStatus] = useState<GridStatus[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [stabilityMetrics, setStabilityMetrics] = useState<StabilityMetrics | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('Ontario');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackData, setIsFallbackData] = useState(false);

  // Use real IESO data for Ontario
  const { data: iesoData, connectionStatus, isUsingRealData } = useStreamingData('ontario-demand');

  // Use WebSocket for real-time grid updates
  const {
    messages: wsMessages,
    connectionStatus: wsConnectionStatus,
    isConnected: wsConnected,
    sendMessage: sendWsMessage
  } = useWebSocketConsultation('grid-optimization');

  // Load initial data
  const mapToGridStatus = useCallback((record: any, fallbackRegion: string, defaultIndex: number): GridStatus | null => {
    if (!record) return null;

    const demand = Number(record.demand_mw ?? record.demand ?? record.ontario_demand ?? record.load ?? NaN);
    const supply = Number(record.supply_mw ?? record.supply ?? record.generation ?? NaN);

    const hasDemand = Number.isFinite(demand);
    const hasSupply = Number.isFinite(supply);

    if (!hasDemand && !hasSupply) {
      return null;
    }

    const resolvedDemand = hasDemand ? demand : 0;
    const resolvedSupply = hasSupply ? supply : resolvedDemand * 1.05;

    const frequency = Number(record.frequency_hz ?? record.frequency ?? 60);
    const voltage = Number(record.voltage_kv ?? record.voltage ?? 120);
    const congestion = Number(record.congestion_index ?? record.congestion ?? 0);
    const status = (record.status || (congestion > 0.25 ? 'warning' : 'stable')) as GridStatus['status'];

    return {
      id: record.id || `grid_${record.captured_at || defaultIndex}`,
      region: record.region || fallbackRegion,
      demand: resolvedDemand,
      supply: resolvedSupply,
      frequency,
      voltage,
      congestion,
      timestamp: record.captured_at || record.timestamp || record.last_updated || new Date().toISOString(),
      status
    };
  }, []);

  const loadGridData = useCallback(async () => {
    try {
      setLoading(true);

      const regionQuery = encodeURIComponent(selectedRegion);

      const [gridStatusResult, stabilityResult, recommendationsResult] = await Promise.all([
        fetchEdgeJson([
          `api-v2-grid-status?region=${regionQuery}`,
          'api/grid/status'
        ]),
        fetchEdgeJson([
          `api-v2-grid-stability-metrics?region=${regionQuery}`,
          'api/grid/stability-metrics'
        ]),
        fetchEdgeJson([
          `api-v2-grid-optimization-recommendations?region=${regionQuery}`,
          'api/grid/optimization-recommendations'
        ])
      ]);

      const statusRecordsRaw = Array.isArray(gridStatusResult.json?.records)
        ? gridStatusResult.json.records
        : Array.isArray(gridStatusResult.json)
          ? gridStatusResult.json
          : [];

      const mappedStatus: GridStatus[] = statusRecordsRaw
        .map((record: any, index: number) => mapToGridStatus(record, selectedRegion, index))
        .filter((item): item is GridStatus => item !== null);
      setGridStatus(mappedStatus);

      const stabilityPayload = Array.isArray(stabilityResult.json)
        ? stabilityResult.json[0]
        : stabilityResult.json;

      if (stabilityPayload) {
        setStabilityMetrics({
          frequencyStability: Number(stabilityPayload.frequency_stability ?? stabilityPayload.frequencyStability ?? 0),
          voltageStability: Number(stabilityPayload.voltage_stability ?? stabilityPayload.voltageStability ?? 0),
          congestionIndex: Number(stabilityPayload.congestion_index ?? stabilityPayload.congestionIndex ?? 0),
          reserveMargin: Number(stabilityPayload.reserve_margin ?? stabilityPayload.reserveMargin ?? 0),
          lastUpdated: stabilityPayload.last_updated || stabilityPayload.lastUpdated || new Date().toISOString()
        });
      } else {
        setStabilityMetrics(null);
      }

      const recommendationItems = Array.isArray(recommendationsResult.json?.recommendations)
        ? recommendationsResult.json.recommendations
        : Array.isArray(recommendationsResult.json)
          ? recommendationsResult.json
          : [];

      const processedRecommendations: OptimizationRecommendation[] = recommendationItems.map((rec: any, index: number) => ({
        id: rec.id || `recommendation_${rec.generated_at || index}`,
        type: (rec.recommendation_type || rec.type || 'demand_response') as OptimizationRecommendation['type'],
        priority: (rec.priority || 'medium') as OptimizationRecommendation['priority'],
        description: rec.description || 'Optimization recommendation',
        expectedImpact: Number(rec.expected_impact_percent ?? rec.expectedImpact ?? 0),
        implementationTime: Number(rec.implementation_time_minutes ?? rec.implementationTime ?? 0),
        confidence: typeof rec.confidence === 'number' ? rec.confidence : Number(rec.confidence ?? 0),
        timestamp: rec.generated_at || rec.timestamp || new Date().toISOString()
      }));
      setRecommendations(processedRecommendations);
      setIsFallbackData(false);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isEdgeDisabled = message.includes('VITE_ENABLE_EDGE_FETCH=false');
      if (!isEdgeDisabled) {
        console.error('Failed to load grid data', err);
      }

      setError(
        isEdgeDisabled
          ? 'Supabase Edge fetch disabled via configuration. Using local grid dataset.'
          : 'Using locally generated grid dataset while Supabase APIs are unavailable.'
      );
      setIsFallbackData(true);

      const fallbackStatus = await realDataService.getGridStatus();
      setGridStatus(
        fallbackStatus.map((record, index) =>
          mapToGridStatus(
            {
              id: record.id,
              region: record.region,
              demand_mw: record.load_mw,
              supply_mw: record.generation_mw,
              frequency_hz: record.grid_frequency_hz,
              voltage_kv: 120,
              congestion_index:
                record.congestion_level === 'high'
                  ? 0.6
                  : record.congestion_level === 'medium'
                  ? 0.35
                  : 0.15,
              status: record.voltage_stability,
              captured_at: record.timestamp,
            },
            record.region,
            index,
          ) ?? null,
        ).filter((item): item is GridStatus => item !== null),
      );

      const reserveMargin = fallbackStatus[0]?.reserve_margin_percent ?? 8;
      setStabilityMetrics({
        frequencyStability: 0.95,
        voltageStability: 0.9,
        congestionIndex: 0.25,
        reserveMargin,
        lastUpdated: fallbackStatus[0]?.timestamp ?? new Date().toISOString(),
      });

      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [mapToGridStatus, selectedRegion]);

  useEffect(() => {
    loadGridData();
  }, [selectedRegion, loadGridData]);

  // Process real-time IESO data
  const processIESOData = useCallback((data: any[]) => {
    if (data.length === 0) return;

    const latestData = data[data.length - 1];
    const mapped = mapToGridStatus(latestData, selectedRegion, Date.now());
    if (!mapped) return;

    setGridStatus(prev => [mapped, ...prev].slice(0, 100));
  }, [mapToGridStatus, selectedRegion]);

  useEffect(() => {
    if (iesoData.length > 0) {
      processIESOData(iesoData);
    }
  }, [iesoData, processIESOData]);

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (gridStatus.length === 0) return null;

    const latest = gridStatus[0];
    const avgDemand = gridStatus.slice(0, 24).reduce((sum, s) => sum + s.demand, 0) / Math.min(24, gridStatus.length);
    const avgSupply = gridStatus.slice(0, 24).reduce((sum, s) => sum + s.supply, 0) / Math.min(24, gridStatus.length);

    return {
      currentDemand: latest.demand,
      currentSupply: latest.supply,
      reserveMargin: ((latest.supply - latest.demand) / latest.demand) * 100,
      frequencyDeviation: Math.abs(60 - latest.frequency),
      voltageDeviation: Math.abs(120 - latest.voltage),
      avgDemand,
      avgSupply,
      criticalAlerts: recommendations.filter(r => r.priority === 'critical').length,
      highPriorityActions: recommendations.filter(r => r.priority === 'high').length
    };
  }, [gridStatus, recommendations]);

  // Prepare chart data
  const demandSupplyData = useMemo(() => {
    return gridStatus.slice(0, 24).reverse().map((status, index) => ({
      time: `${24 - index}h ago`,
      demand: status.demand,
      supply: status.supply,
      reserve: status.supply - status.demand
    }));
  }, [gridStatus]);

  const stabilityData = useMemo(() => {
    return gridStatus.slice(0, 12).reverse().map((status, index) => ({
      time: `${12 - index}h ago`,
      frequency: status.frequency,
      voltage: status.voltage,
      congestion: status.congestion
    }));
  }, [gridStatus]);

  const recommendationsByPriority = useMemo(() => {
    const priorityCount = recommendations.reduce((acc, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(priorityCount).map(([priority, count]) => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count,
      color: priority === 'critical' ? '#ef4444' : priority === 'high' ? '#f59e0b' : priority === 'medium' ? '#3b82f6' : '#10b981'
    }));
  }, [recommendations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={CONTAINER_CLASSES.page}>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Grid Optimization Dashboard
          </h1>
          <p className="text-slate-600">
            Real-time grid monitoring, stability analysis, and optimization recommendations
          </p>
          {error && (
            <div
              className={`mt-4 rounded-lg p-4 ${
                isFallbackData
                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-start space-x-3">
                <AlertTriangle
                  className={`h-5 w-5 ${isFallbackData ? 'text-amber-600' : 'text-red-600'}`}
                />
                <div>
                  <h3
                    className={`font-semibold mb-1 ${
                      isFallbackData ? 'text-amber-800' : 'text-red-800'
                    }`}
                  >
                    {isFallbackData ? 'Fallback Dataset Active' : 'Data Load Issue'}
                  </h3>
                  <p className={`${isFallbackData ? 'text-amber-700' : 'text-red-700'} text-sm`}>{error}</p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                dashboardMetrics?.reserveMargin && dashboardMetrics.reserveMargin > 10 ? 'bg-green-100 text-green-700' :
                dashboardMetrics?.reserveMargin && dashboardMetrics.reserveMargin > 5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {dashboardMetrics?.reserveMargin && dashboardMetrics.reserveMargin > 10 ? <CheckCircle className="h-3 w-3" /> :
                 dashboardMetrics?.reserveMargin && dashboardMetrics.reserveMargin > 5 ? <AlertTriangle className="h-3 w-3" /> :
                 <AlertTriangle className="h-3 w-3" />}
                <span>{dashboardMetrics?.reserveMargin && dashboardMetrics.reserveMargin > 10 ? 'HEALTHY' :
                       dashboardMetrics?.reserveMargin && dashboardMetrics.reserveMargin > 5 ? 'MONITOR' : 'CRITICAL'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reserve Margin</h3>
            <p className="text-3xl font-bold text-blue-600">
              {dashboardMetrics?.reserveMargin?.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {dashboardMetrics?.currentSupply?.toLocaleString()} MW supply vs {dashboardMetrics?.currentDemand?.toLocaleString()} MW demand
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Gauge className="h-6 w-6 text-green-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                dashboardMetrics?.frequencyDeviation && dashboardMetrics.frequencyDeviation < 0.05 ? 'bg-green-100 text-green-700' :
                dashboardMetrics?.frequencyDeviation && dashboardMetrics.frequencyDeviation < 0.1 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {dashboardMetrics?.frequencyDeviation && dashboardMetrics.frequencyDeviation < 0.05 ? <CheckCircle className="h-3 w-3" /> :
                 <AlertTriangle className="h-3 w-3" />}
                <span>{dashboardMetrics?.frequencyDeviation && dashboardMetrics.frequencyDeviation < 0.05 ? 'STABLE' : 'DEVIATION'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Frequency</h3>
            <p className="text-3xl font-bold text-green-600">
              {gridStatus[0]?.frequency?.toFixed(3)} Hz
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Target: 60.000 Hz
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                dashboardMetrics?.criticalAlerts === 0 ? 'bg-green-100 text-green-700' :
                dashboardMetrics?.criticalAlerts && dashboardMetrics.criticalAlerts < 3 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                <AlertTriangle className="h-3 w-3" />
                <span>{dashboardMetrics?.criticalAlerts || 0} CRITICAL</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Active Alerts</h3>
            <p className="text-3xl font-bold text-purple-600">
              {recommendations.length}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {dashboardMetrics?.highPriorityActions || 0} high priority actions needed
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                wsConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Data Source</h3>
            <p className="text-3xl font-bold text-orange-600">
              {isUsingRealData ? 'IESO' : 'MOCK'}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {connectionStatus === 'connected' ? 'Real-time streaming' : 'Cached data'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Demand vs Supply Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Demand vs Supply (24h)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={demandSupplyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value.toLocaleString()} MW`, '']} />
                <Legend />
                <Area type="monotone" dataKey="demand" stackId="1" stroke="#ef4444" fill="#fee2e2" />
                <Area type="monotone" dataKey="supply" stackId="2" stroke="#10b981" fill="#d1fae5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stability Metrics Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Grid Stability Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stabilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="freq" orientation="left" domain={[59.9, 60.1]} />
                <YAxis yAxisId="volt" orientation="right" domain={[118, 122]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="freq" type="monotone" dataKey="frequency" stroke="#3b82f6" strokeWidth={2} name="Frequency (Hz)" />
                <Line yAxisId="volt" type="monotone" dataKey="voltage" stroke="#f59e0b" strokeWidth={2} name="Voltage (V)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Optimization Recommendations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">AI Optimization Recommendations</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No optimization recommendations at this time</p>
                </div>
              ) : (
                recommendations.slice(0, 5).map((rec) => (
                  <div key={rec.id} className={`p-4 rounded-lg border ${
                    rec.priority === 'critical' ? 'border-red-200 bg-red-50' :
                    rec.priority === 'high' ? 'border-yellow-200 bg-yellow-50' :
                    rec.priority === 'medium' ? 'border-blue-200 bg-blue-50' :
                    'border-green-200 bg-green-50'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900">{rec.description}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'high' ? 'bg-yellow-100 text-yellow-700' :
                        rec.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Expected Impact: {rec.expectedImpact > 0 ? '+' : ''}{rec.expectedImpact}%</span>
                      <span>Time: {rec.implementationTime}min</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Confidence: {Math.round(rec.confidence * 100)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendations by Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Recommendations by Priority</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={recommendationsByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ priority, count }) => `${priority}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {recommendationsByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex items-center justify-end space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              wsConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-slate-600">
              {wsConnected ? 'Real-time WebSocket Connected' : 'WebSocket Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className="text-slate-600">
              {connectionStatus === 'connected' ? 'IESO Data Stream Active' : 'IESO Data Stream Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridOptimizationDashboard;