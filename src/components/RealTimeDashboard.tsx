/**
 * Real-Time Energy Dashboard Component
 * 
 * 4-panel dashboard matching the original working layout:
 * - Ontario Hourly Demand (line chart + temperature)
 * - Provincial Generation Mix (horizontal bar chart)  
 * - Alberta Supply & Demand (dual-line chart + price)
 * - Weather Correlation (scatter plot + city table)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Zap, Activity, Thermometer, Database, Wifi, Clock, CheckCircle, AlertCircle,
  TrendingUp, DollarSign, Cloud, MapPin 
} from 'lucide-react';
import { 
  energyDataManager, 
  DATASETS, 
  type DatasetType,
  type ConnectionStatus,
  type OntarioDemandRecord,
  type ProvincialGenerationRecord,
  type OntarioPricesRecord,
  type HFElectricityDemandRecord
} from '../lib/dataManager';
import ExplainChartButton from './ExplainChartButton';
import { getTransitionKpis, type TransitionKpisResponse } from '../lib/llmClient';
import TransitionReportPanel from './TransitionReportPanel';
import DataQualityPanel from './DataQualityPanel';
import { fetchEdgePostJson, type EdgeFetchOptions } from '../lib/edge';
import { ENDPOINTS } from '../lib/constants';

interface DashboardData {
  ontarioDemand: OntarioDemandRecord[];
  provincialGeneration: ProvincialGenerationRecord[];
  ontarioPrices: OntarioPricesRecord[];
  weatherData: HFElectricityDemandRecord[];
}

interface DashboardStats {
  dataSources: number;
  coverage: number;
  updateFreq: string;
  architecture: string;
}

export const RealTimeDashboard: React.FC = () => {
  // Local constant to avoid magic strings (P5); move to constants in follow‑up task if reused elsewhere
  const INSIGHTS_DATASET = 'provincial_generation' as const;
  const INSIGHTS_TIMEFRAME = 'recent' as const;

  const [data, setData] = useState<DashboardData>({
    ontarioDemand: [],
    provincialGeneration: [],
    ontarioPrices: [],
    weatherData: []
  });
  
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const [stats, setStats] = useState<DashboardStats>({
    dataSources: 4,
    coverage: 13,
    updateFreq: 'Real-time',
    architecture: 'Resilient'
  });

  // KPIs from server
  const [kpis, setKpis] = useState<TransitionKpisResponse | null>(null);
  const kpiAbortRef = useRef<AbortController | null>(null);

  // Abort controller ref to cancel overlapping loads
  const loadAbortRef = useRef<AbortController | null>(null);

  // Analytics Insight state
  interface AnalyticsInsight {
    summary: string;
    key_findings?: string[];
    policy_implications?: string[];
    confidence?: string | number;
    sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  }
  const [insight, setInsight] = useState<AnalyticsInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const insightAbortRef = useRef<AbortController | null>(null);

  // Load all dashboard data concurrently with cancellation support
  const loadDashboardData = useCallback(async () => {
    // Cancel any in-flight load
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    try {
      const signal = controller.signal;
      const [ontarioDemand, provincialGeneration, ontarioPrices, weatherData] = await Promise.all([
        energyDataManager.loadData('ontario_demand', { maxRows: 100, signal }),
        energyDataManager.loadData('provincial_generation', { maxRows: 100, signal }),
        energyDataManager.loadData('ontario_prices', { maxRows: 50, signal }),
        energyDataManager.loadData('hf_electricity_demand', { maxRows: 50, signal })
      ]);

      if (signal.aborted) return; // avoid state updates after abort

      setData({
        ontarioDemand,
        provincialGeneration,
        ontarioPrices,
        weatherData
      });
      
      // Update connection statuses after data loading completes
      setConnectionStatuses(energyDataManager.getAllConnectionStatuses());
      setLastUpdate(new Date());
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // expected during cancellation
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      // Initialize all connections
      await Promise.all(
        DATASETS.map(dataset => energyDataManager.initializeConnection(dataset.key))
      );
      
      // Load initial data (this will also update statuses)
      await loadDashboardData();
    };

    initializeDashboard();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData(); // This will also update statuses
    }, 30000);

    return () => {
      clearInterval(interval);
      loadAbortRef.current?.abort();
    };
  }, [loadDashboardData]);

  // Load Transition KPIs (server-side computation)
  useEffect(() => {
    kpiAbortRef.current?.abort();
    const controller = new AbortController();
    kpiAbortRef.current = controller;
    (async () => {
      try {
        const data = await getTransitionKpis('provincial_generation', 'recent', { signal: controller.signal });
        if (!controller.signal.aborted) setKpis(data);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.warn('KPI load failed', e);
      }
    })();
    return () => controller.abort();
  }, []);

  // Load Analytics Insight (server-side LLM summarized analytics)
  const loadAnalyticsInsight = useCallback(async () => {
    insightAbortRef.current?.abort();
    const controller = new AbortController();
    insightAbortRef.current = controller;
    setInsightLoading(true);
    setInsightError(null);
    try {
      const { json } = await fetchEdgePostJson([
        ENDPOINTS.LLM.ANALYTICS_INSIGHT,
      ], {
        datasetPath: INSIGHTS_DATASET,
        timeframe: INSIGHTS_TIMEFRAME,
        queryType: 'overview'
      }, { signal: controller.signal } as EdgeFetchOptions);
      const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
      if (!controller.signal.aborted) setInsight(payload as AnalyticsInsight);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setInsightError(e?.message || 'Failed to load insights');
    } finally {
      if (!controller.signal.aborted) setInsightLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsInsight();
    return () => insightAbortRef.current?.abort();
  }, [loadAnalyticsInsight]);

  // Process Ontario Demand data for chart
  const ontarioDemandChartData = data.ontarioDemand
    .slice(0, 20)
    .map(record => ({
      time: new Date(record.datetime).toLocaleTimeString('en-CA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      demand: Math.round(record.total_demand_mw),
      temperature: 24 // Mock temperature - would come from weather data integration
    }));

  // Process Provincial Generation data for horizontal bar chart
  const provinceGenerationChartData = data.provincialGeneration
    .reduce((acc: any[], record) => {
      const existing = acc.find(item => item.type === record.generation_type);
      if (existing) {
        existing.mwh += record.megawatt_hours;
      } else {
        acc.push({
          type: record.generation_type.replace('_', ' ').toUpperCase(),
          mwh: record.megawatt_hours
        });
      }
      return acc;
    }, [])
    .slice(0, 6);

  // Process Alberta Supply & Demand data
  const albertaChartData = data.ontarioPrices
    .slice(0, 20)
    .map((record, index) => ({
      time: new Date(record.datetime).toLocaleTimeString('en-CA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      supply: 14706 + (Math.random() - 0.5) * 1000, // Mock supply data
      demand: 12842 + (Math.random() - 0.5) * 800,  // Mock demand data
      price: record.lmp_price
    }));

  // Process Weather Correlation data
  const weatherCorrelationData = data.weatherData
    .slice(0, 30)
    .map(record => ({
      temperature: record.temperature,
      correlation: Math.min(1, record.electricity_demand / 1000) // Normalize to correlation
    }));

  // Calculate current values
  const currentDemand = data.ontarioDemand[0]?.total_demand_mw || 14033;
  const currentTemperature = 24; // Mock temperature
  const totalGeneration = data.provincialGeneration.reduce((sum, record) => sum + record.megawatt_hours, 0);
  const currentSupply = 14706; // Mock supply
  const currentDemandAlberta = 12842; // Mock demand
  const currentPrice = data.ontarioPrices[0]?.lmp_price || 41.43;
  const averageCorrelation = 0.95; // Mock correlation

  const connectedSources = connectionStatuses.filter(s => s.status === 'connected').length;
  const sourceText = (key: DatasetType) => {
    try {
      const s = energyDataManager.getConnectionStatus(key);
      if (!s) return 'Unknown';
      return s.source === 'stream' ? 'Stream' : 'Fallback';
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-blue-500 p-3 rounded-lg">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Real-Time Energy Dashboard</h1>
            <p className="text-slate-600">Live monitoring of Canadian energy systems with resilient data architecture</p>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Database className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm text-blue-600 font-medium">Data Sources</div>
              <div className="text-xl font-bold text-blue-800">{connectedSources} Active</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
            <MapPin className="h-6 w-6 text-green-600" />
            <div>
              <div className="text-sm text-green-600 font-medium">Coverage</div>
              <div className="text-xl font-bold text-green-800">{stats.coverage} Provinces</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
            <Activity className="h-6 w-6 text-purple-600" />
            <div>
              <div className="text-sm text-purple-600 font-medium">Update Freq</div>
              <div className="text-xl font-bold text-purple-800">{stats.updateFreq}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-orange-600" />
            <div>
              <div className="text-sm text-orange-600 font-medium">Architecture</div>
              <div className="text-xl font-bold text-orange-800">{stats.architecture}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Panel Dashboard Grid */}
      {/* Transition KPIs */}
      {kpis?.kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <div className="text-sm text-indigo-600">Total Generation (sample)</div>
            <div className="text-2xl font-bold text-indigo-800">{kpis.kpis.total_mwh !== null ? Math.round(kpis.kpis.total_mwh).toLocaleString() : '—'} MWh</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="text-sm text-emerald-600">Top Source</div>
            <div className="text-2xl font-bold text-emerald-800">{kpis.kpis.top_source ? kpis.kpis.top_source.type.toUpperCase() : '—'}</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="text-sm text-amber-600">Renewable Share</div>
            <div className="text-2xl font-bold text-amber-800">{kpis.kpis.renewable_share !== null ? `${(kpis.kpis.renewable_share * 100).toFixed(1)}%` : '—'}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Ontario Hourly Demand */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Ontario Hourly Demand
              </h3>
              <div className="text-right">
                <div className="text-sm text-slate-600">Current Demand</div>
                <div className="text-xl font-bold text-blue-600">{currentDemand.toLocaleString()} MW</div>
              </div>
              <div className="ml-4">
                <ExplainChartButton datasetPath="ontario_demand" panelId="panel_ontario_demand" timeframe="24h" />
              </div>
            </div>
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-slate-600">Temperature</span>
                <span className="text-sm font-semibold text-orange-600">{currentTemperature}°C</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ontarioDemandChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="demand" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-slate-500">
              Data: {data.ontarioDemand.length} records • Source: {sourceText('ontario_demand')}
            </div>
          </div>
        </div>

        {/* Panel 2: Provincial Generation Mix */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-green-600" />
                Provincial Generation Mix
              </h3>
              <div className="text-right">
                <div className="text-sm text-slate-600">Total Generation</div>
                <div className="text-xl font-bold text-green-600">{Math.round(totalGeneration).toLocaleString()} MWh</div>
              </div>
              <div className="ml-4">
                <ExplainChartButton datasetPath="provincial_generation" panelId="panel_provincial_generation" timeframe="24h" />
              </div>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={provinceGenerationChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="mwh" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-slate-500">
              Data: {data.provincialGeneration.length} records • Source: {sourceText('provincial_generation')}
            </div>
          </div>
        </div>

        {/* Panel 3: Alberta Supply & Demand */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Alberta Supply & Demand
              </h3>
              <div className="col-span-3 flex justify-end">
                <ExplainChartButton datasetPath="ontario_prices" panelId="panel_alberta_supply_demand" timeframe="24h" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-600">Supply</div>
                <div className="font-bold text-purple-600">{currentSupply.toLocaleString()} MW</div>
              </div>
              <div>
                <div className="text-slate-600">Demand</div>
                <div className="font-bold text-blue-600">{currentDemandAlberta.toLocaleString()} MW</div>
              </div>
              <div>
                <div className="text-slate-600">Price</div>
                <div className="font-bold text-orange-600">${currentPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={albertaChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="supply" stroke="#7c3aed" strokeWidth={2} name="Supply" />
                <Line type="monotone" dataKey="demand" stroke="#2563eb" strokeWidth={2} name="Demand" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-slate-500">
              Data: {data.ontarioPrices.length} records • Source: {sourceText('ontario_prices')}
            </div>
          </div>
        </div>

        {/* Panel 4: Weather Correlation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Cloud className="h-5 w-5 mr-2 text-orange-600" />
                Weather Correlation
              </h3>
              <div className="text-right">
                <div className="text-sm text-slate-600">Average Correlation</div>
                <div className="text-xl font-bold text-orange-600">{averageCorrelation.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={140}>
              <ScatterChart data={weatherCorrelationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="temperature" name="Temperature" unit="°C" />
                <YAxis dataKey="correlation" name="Correlation" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* City Data Table */}
            <div className="mt-4 space-y-1">
              {[
                { city: 'Calgary', temp: '20.9°C', correlation: '0.98' },
                { city: 'Montreal', temp: '23.5°C', correlation: '0.95' },
                { city: 'Ottawa', temp: '26.3°C', correlation: '0.96' },
                { city: 'Edmonton', temp: '21.4°C', correlation: '0.95' },
                { city: 'Toronto', temp: '23.3°C', correlation: '0.95' }
              ].map((item, index) => (
                <div key={index} className="flex justify-between text-xs py-1">
                  <span className="text-slate-600">{item.city}</span>
                  <span className="text-slate-800">{item.temp}</span>
                  <span className="text-orange-600 font-medium">{item.correlation}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-2 text-xs text-slate-500">
              Data: {data.weatherData.length} records • Source: {sourceText('hf_electricity_demand')}
            </div>
          </div>
        </div>
      </div>

      {/* LLM Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TransitionReportPanel datasetPath="provincial_generation" timeframe="recent" />
        <DataQualityPanel datasetPath="provincial_generation" timeframe="recent" />
        {/* Insights Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-indigo-600" />
              Insights
            </h3>
            <button
              onClick={loadAnalyticsInsight}
              className="text-sm text-indigo-600 hover:text-indigo-800"
              disabled={insightLoading}
            >
              {insightLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="p-4 space-y-3">
            {insightError && (
              <div className="text-sm text-red-600">{insightError}</div>
            )}
            {!insight && !insightError && (
              <div className="text-sm text-slate-500">Loading insights…</div>
            )}
            {insight && (
              <>
                <p className="text-slate-800 text-sm leading-relaxed">{insight.summary}</p>
                {Array.isArray(insight.key_findings) && insight.key_findings.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Key findings</div>
                    <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {insight.key_findings.slice(0, 4).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(insight.policy_implications) && insight.policy_implications.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Policy implications</div>
                    <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {insight.policy_implications.slice(0, 4).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Confidence: {String(insight.confidence ?? '—')}</span>
                  <span>
                    Citations: {Array.isArray(insight.sources) ? insight.sources.length : 0}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="bg-slate-50 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600">
              Last updated: {lastUpdate.toLocaleTimeString()} • 
              {loading ? ' Refreshing...' : ' Live streaming active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
