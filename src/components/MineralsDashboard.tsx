/**
 * Critical Minerals Supply Chain Monitor Dashboard
 *
 * Comprehensive dashboard for monitoring critical minerals supply chain,
 * risk assessment, and market intelligence with real-time alerts.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Globe, Package, Zap, Shield, DollarSign, Plus, Edit, Save, X, Download, Upload, AlertCircle, CheckCircle, Database, Clock, MapPin, Eye, Activity, Info } from 'lucide-react';
import { localStorageManager, type MineralsSupplyRecord } from '../lib/localStorageManager';
import { getMarketBrief, type MarketBriefResponse } from '../lib/llmClient';
import { fetchEdgePostJson, type EdgeFetchOptions } from '../lib/edge';
import { ENDPOINTS } from '../lib/constants';
import { PartialFeatureWarning } from './FeatureStatusBadge';
import { HelpButton } from './HelpButton';

interface MineralsData {
  supplyStatus: Array<{
    mineral: string;
    production: number;
    import: number;
    export: number;
    riskScore: number;
    price: number;
    country: string;
  }>;
  riskAssessment: Array<{
    mineral: string;
    supplyRisk: number;
    geopoliticalRisk: number;
    environmentalRisk: number;
    marketVolatility: number;
    overallScore: number;
  }>;
  alerts: Array<{
    id: string;
    mineral: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    timeframe: string;
  }>;
}

interface DashboardStats {
  totalMinerals: number;
  highRiskCount: number;
  averageRiskScore: number;
  lastUpdate: string;
}

interface MineralsFormData {
  mineral: string;
  production_tonnes_annually: number;
  import_tonnes_annually: number;
  export_tonnes_annually: number;
  price_cad_per_tonne: number;
  strategic_importance: 'critical' | 'important' | 'moderate' | 'low';
  primary_suppliers: Array<{
    country: string;
    percentage_of_supply: number;
    risk_score: number;
  }>;
  supply_risk_factors: string[];
  mitigation_strategies: string[];
}

// Fallback supply data (used only if NRCan API unavailable)
const mockSupplyData = [
  { mineral: 'Lithium', production: 25000, import: 35000, export: 8000, riskScore: 8.5, price: 12500, country: 'Australia' },
  { mineral: 'Cobalt', production: 18000, import: 42000, export: 5000, riskScore: 9.2, price: 18500, country: 'DRC' },
  { mineral: 'Nickel', production: 320000, import: 28000, export: 125000, riskScore: 7.3, price: 8900, country: 'Indonesia' },
  { mineral: 'Graphite', production: 180000, import: 15000, export: 78000, riskScore: 6.1, price: 3200, country: 'China' },
  { mineral: 'Rare Earth', production: 140000, import: 35000, export: 110000, riskScore: 9.8, price: 25000, country: 'China' }
];

const mockRiskData = [
  { mineral: 'Lithium', supplyRisk: 8.2, geopoliticalRisk: 8.5, environmentalRisk: 6.1, marketVolatility: 7.8, overallScore: 8.5 },
  { mineral: 'Cobalt', supplyRisk: 9.1, geopoliticalRisk: 9.5, environmentalRisk: 8.2, marketVolatility: 9.0, overallScore: 9.2 },
  { mineral: 'Nickel', supplyRisk: 7.0, geopoliticalRisk: 7.5, environmentalRisk: 6.8, marketVolatility: 8.2, overallScore: 7.3 },
  { mineral: 'Graphite', supplyRisk: 6.5, geopoliticalRisk: 8.8, environmentalRisk: 5.2, marketVolatility: 5.9, overallScore: 6.1 },
  { mineral: 'Rare Earth', supplyRisk: 9.5, geopoliticalRisk: 9.7, environmentalRisk: 7.8, marketVolatility: 8.9, overallScore: 9.8 }
];

export const MineralsDashboard: React.FC = () => {
  const [mineralsRecords, setMineralsRecords] = useState<MineralsSupplyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMineral, setSelectedMineral] = useState<string | null>(mockSupplyData[0]?.mineral ?? null);
  const [showAddMineral, setShowAddMineral] = useState(false);
  const [editingMineral, setEditingMineral] = useState<string | null>(null);
  
  const [newMineral, setNewMineral] = useState<MineralsFormData>({
    mineral: '',
    production_tonnes_annually: 0,
    import_tonnes_annually: 0,
    export_tonnes_annually: 0,
    price_cad_per_tonne: 0,
    strategic_importance: 'important',
    primary_suppliers: [],
    supply_risk_factors: [],
    mitigation_strategies: []
  });

  const [stats, setStats] = useState<DashboardStats>({
    totalMinerals: 0,
    highRiskCount: 0,
    averageRiskScore: 0,
    lastUpdate: new Date().toLocaleString()
  });

  const [data, setData] = useState<MineralsData>({
    supplyStatus: mockSupplyData,
    riskAssessment: mockRiskData,
    alerts: []
  });

  const insightAbortRef = useRef<AbortController | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [marketInsight, setMarketInsight] = useState<MarketBriefResponse | null>(null);

  // Load minerals data from NRCan open data API
  useEffect(() => {
    const loadMineralsData = async () => {
      setLoading(true);
      try {
        // Fetch from NRCan minerals API
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_EDGE_BASE}/api-v2-minerals-supply`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const apiData = await response.json();
        console.log('[MINERALS] Loaded from NRCan:', apiData);

        // Transform API data to dashboard format
        const supplyStatus = apiData.facilities?.slice(0, 10).map((f: any) => ({
          mineral: f.mineral_type,
          production: f.production_tonnes || 0,
          import: 0, // Would come from trade data
          export: 0,
          riskScore: 5.0,
          price: 0,
          country: f.province
        })) || mockSupplyData;

        const riskAssessment = apiData.risk_assessment?.map((r: any) => ({
          mineral: r.mineral,
          supplyRisk: r.risk_score / 10,
          geopoliticalRisk: r.province_count < 2 ? 9.0 : 5.0,
          environmentalRisk: 6.0,
          marketVolatility: 7.0,
          overallScore: r.risk_score / 10
        })) || mockRiskData;

        // Generate alerts from high-risk minerals
        const alerts = apiData.risk_assessment
          ?.filter((r: any) => r.risk_level === 'High')
          .map((r: any, idx: number) => ({
            id: `alert-${idx}`,
            mineral: r.mineral,
            type: 'warning' as const,
            message: r.reason,
            timeframe: 'Current'
          })) || [];

        const updatedData: MineralsData = {
          supplyStatus,
          riskAssessment,
          alerts
        };

        setData(updatedData);

        setStats({
          totalMinerals: updatedData.supplyStatus.length,
          highRiskCount: updatedData.riskAssessment.filter(item => item.overallScore >= 8).length,
          averageRiskScore: Number((updatedData.riskAssessment.reduce((sum, item) => sum + item.overallScore, 0) / updatedData.riskAssessment.length || 0).toFixed(1)),
          lastUpdate: new Date().toLocaleString()
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading minerals data:', error);
        setLoading(false);
      }
    };

    loadMineralsData();
  }, []);

  // Load market insights using LLM
  const loadMarketInsight = useCallback(async () => {
    if (!selectedMineral) {
      return;
    }

    insightAbortRef.current?.abort();
    const controller = new AbortController();
    insightAbortRef.current = controller;

    setInsightLoading(true);
    try {
      // Use the existing market-brief endpoint but focus on minerals
      const { json } = await fetchEdgePostJson([
        ENDPOINTS.LLM.MARKET_BRIEF,
      ], {
        datasetPath: 'minerals_supply',
        timeframe: 'current',
        focus: `critical minerals supply chain analysis for ${selectedMineral}`
      }, { signal: controller.signal } as EdgeFetchOptions);

      const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;

      if (!controller.signal.aborted) {
        setMarketInsight(payload as MarketBriefResponse);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Market insight load failed:', e);
    } finally {
      if (!controller.signal.aborted) setInsightLoading(false);
    }
  }, [selectedMineral]);

  useEffect(() => {
    if (!selectedMineral) {
      return () => undefined;
    }

    loadMarketInsight();
    return () => insightAbortRef.current?.abort();
  }, [loadMarketInsight, selectedMineral]);

  // Process chart data
  const supplyChartData = React.useMemo(() => data.supplyStatus.map(item => ({
    mineral: item.mineral,
    production: item.production / 1000, // Convert to thousands for display
    import: item.import / 1000,
    export: item.export / 1000
  })), [data.supplyStatus]);

  const riskChartData = React.useMemo(() => data.riskAssessment.map(item => ({
    mineral: item.mineral,
    risk: item.overallScore
  })), [data.riskAssessment]);

  // Performance metrics data
  const performanceData = React.useMemo(() => data.supplyStatus.map((item, index) => ({
    month: `Month ${index + 1}`,
    marketPrice: item.price,
    productionVolume: item.production,
    importVolume: item.import
  })), [data.supplyStatus]);

  const getRiskColor = (score: number) => {
    if (score >= 9) return 'text-danger border-red-200 bg-secondary';
    if (score >= 7) return 'text-warning border-yellow-200 bg-secondary';
    return 'text-success border-green-200 bg-secondary';
  };

  const getRiskIcon = (score: number) => {
    if (score >= 9) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (score >= 7) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Feature Warning */}
      <PartialFeatureWarning featureId="minerals_supply_chain" />
      
      {/* Dashboard Header */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(56, 189, 248, 0.12)' }}
                >
                  <Globe className="h-6 w-6 text-electric" />
                </div>
                <h1 className="hero-title">Critical Minerals Supply Chain Monitor</h1>
              </div>
              <p className="hero-subtitle">
                Global supply chain risk assessment and market intelligence for critical minerals
              </p>
            </div>
            <HelpButton id="minerals.overview" />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Total Minerals</p>
                  <p className="metric-value">{stats.totalMinerals}</p>
                </div>
                <Database className="h-6 w-6 text-electric" />
              </div>
            </div>

            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">High Risk</p>
                  <p className="metric-value text-danger">{stats.highRiskCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-danger" />
              </div>
            </div>

            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Avg Risk Score</p>
                  <p className="metric-value text-warning">{stats.averageRiskScore}/10</p>
                </div>
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>

            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Last Update</p>
                  <p className="metric-value text-sm">{stats.lastUpdate}</p>
                </div>
                <Clock className="h-6 w-6 text-electric" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <div className="card p-6 shadow-sm border border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-primary">Critical Alerts</h2>
          </div>
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${
                alert.type === 'critical' ? 'border-red-200 bg-secondary' :
                alert.type === 'warning' ? 'border-yellow-200 bg-secondary' :
                'border-blue-200 bg-secondary'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getRiskIcon(alert.type === 'critical' ? 10 : alert.type === 'warning' ? 8 : 6)}
                    <div>
                      <div className="font-semibold text-primary">{alert.mineral}</div>
                      <div className="text-sm text-secondary">{alert.message}</div>
                    </div>
                  </div>
                  <div className="text-sm text-tertiary">Within {alert.timeframe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Supply Chain Map/Overview */}
        <div className="card border border-[var(--border-subtle)]">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-electric" />
                Global Supply Sources
              </h3>
              <div className="flex space-x-2">
                {data.supplyStatus.slice(0, 3).map((item) => (
                  <button
                    key={item.mineral}
                    onClick={() => setSelectedMineral(item.mineral)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      selectedMineral === item.mineral
                        ? 'bg-secondary0 text-white border-purple-500'
                        : 'bg-elevated text-secondary border-[var(--border-subtle)] hover:bg-secondary'
                    }`}
                  >
                    {item.mineral}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4">
            {/* Simplified map representation */}
            <div className="bg-secondary rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-electric">{selectedMineral}</div>
                  <div className="text-sm text-secondary">Primary Source</div>
                  <div className="text-lg font-semibold text-primary">
                    {data.supplyStatus.find(item => item.mineral === selectedMineral)?.country || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">
                    ${(data.supplyStatus.find(item => item.mineral === selectedMineral)?.price || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-secondary">Current Price (/ton)</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {data.supplyStatus.map((item) => (
                <div key={item.mineral} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getRiskIcon(item.riskScore)}
                    <span className="font-medium text-primary">{item.mineral}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-secondary">{item.country}</div>
                    <div className="text-xs text-tertiary">Risk: {item.riskScore}/10</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="card border border-[var(--border-subtle)]">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Shield className="h-5 w-5 mr-2 text-danger" />
              Risk Assessment Scores
            </h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mineral" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="risk" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {data.riskAssessment.map((item) => (
                <div key={item.mineral} className={`p-3 rounded-lg border ${getRiskColor(item.overallScore)}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.mineral}</span>
                    <span className="font-bold">{item.overallScore}/10</span>
                  </div>
                  <div className="text-sm mt-1">
                    Geo-political: {item.geopoliticalRisk}/10 • Supply: {item.supplyRisk}/10
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Market Trends */}
        <div className="card border border-[var(--border-subtle)]">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-electric" />
              Market Performance Trends
            </h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="marketPrice" stroke="#3b82f6" strokeWidth={2} name="Price ($/ton)" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-tertiary">
              Price trend data for 6-month period
            </div>
          </div>
        </div>

        {/* AI Market Insights */}
        <div className="card border border-[var(--border-subtle)]">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Eye className="h-5 w-5 mr-2 text-success" />
              AI Market Intelligence
            </h3>
          </div>
          <div className="p-4">
            {insightLoading ? (
              <div className="flex items-center justify-center py-8">
                <Activity className="h-6 w-6 text-green-500 animate-spin mr-2" />
                <span className="text-secondary">Loading market insights...</span>
              </div>
            ) : marketInsight ? (
              <div className="space-y-3">
                <div className="bg-secondary p-3 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">Market Summary</div>
                  <div className="text-sm text-success">{marketInsight.summary}</div>
                </div>
                {marketInsight.drivers && (
                  <div className="bg-secondary p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-1">Key Drivers</div>
                    <ul className="text-sm text-electric space-y-1">
                      {marketInsight.drivers.slice(0, 2).map((driver, index) => (
                        <li key={index}>• {driver}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {marketInsight.forecasts && (
                  <div className="bg-secondary p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-800 mb-1">Market Forecast</div>
                    <div className="text-sm text-electric">{marketInsight.forecasts[0]}</div>
                  </div>
                )}
                <div className="text-xs text-tertiary mt-2">
                  Data sources: Kaggle, Global trade reports • Last update: {new Date().toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="h-8 w-8 text-tertiary mx-auto mb-2" />
                <div className="text-tertiary">Unable to load market insights</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};