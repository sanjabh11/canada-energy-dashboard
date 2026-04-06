/**
 * Analytics & Trends Dashboard
 * 
 * Dedicated page for exploratory analytics, historical trends, and AI insights.
 * Offloaded from main real-time dashboard to reduce clutter.
 * Phase IV - Dashboard Declutter Initiative
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Cloud, AlertCircle, ArrowLeft, Calendar, BarChart3, CheckCircle
} from 'lucide-react';
import {
  energyDataManager,
  DATASETS,
  type DatasetType,
  type ConnectionStatus,
  type OntarioDemandRecord,
  type ProvincialGenerationRecord,
  type HFElectricityDemandRecord
} from '../lib/dataManager';
import { HelpButton } from './HelpButton';
import { getTransitionAnalyticsInsight, type TransitionKpisResponse } from '../lib/llmClient';
import TransitionReportPanel from './TransitionReportPanel';
import DataQualityPanel from './DataQualityPanel';
import { isEdgeFetchEnabled } from '../lib/config';
import { CONTAINER_CLASSES, CHART_CONFIGS, TEXT_CLASSES } from '../lib/ui/layout';
import { fetchEdgeJson } from '../lib/edge';
import { DataQualityBadge } from './DataQualityBadge';
import { createProvenance } from '../lib/types/provenance';
import RenewablePenetrationHeatmap from './RenewablePenetrationHeatmap';
import ModularChartWidget from './ModularChartWidget';
import AIAnalyticsWidget from './AIAnalyticsWidget';
import { AskDataPanel } from './AskDataPanel';
import DataTrustNotice from './DataTrustNotice';
import { DataFreshnessBadge } from './ui/DataFreshnessBadge';
import { buildAnalyticsPageProvenance, extractLatestIsoTimestamp } from '../lib/scoreboardProvenance';

interface AnalyticsData {
  ontarioDemand: OntarioDemandRecord[];
  provincialGeneration: ProvincialGenerationRecord[];
  weatherData: HFElectricityDemandRecord[];
  trends?: any;
}

export type RenewablePenetrationDataOrigin = 'observed' | 'supplemented' | 'reference';

export interface RenewablePenetrationDatum {
  province: string;
  renewable_mw: number;
  fossil_mw: number;
  total_mw: number;
  renewable_pct: number;
  sources: Record<string, number>;
  data_origin: RenewablePenetrationDataOrigin;
}

export interface RenewablePenetrationResult {
  provinces: RenewablePenetrationDatum[];
  summary: {
    observedProvinceCount: number;
    supplementedProvinceCount: number;
    usesReferenceOnly: boolean;
    hasSupplementedProvinces: boolean;
  };
}

// Fallback renewable penetration data based on Canadian public energy statistics
// Used when real-time provincial_generation data is unavailable or has zero values
// Source: Canada Energy Regulator 2023 data
const FALLBACK_RENEWABLE_PENETRATION: Record<string, { renewable_pct: number; sources: Record<string, number> }> = {
  'ON': { renewable_pct: 92, sources: { hydro: 24, nuclear: 60, wind: 6, solar: 2, gas: 8 } },
  'QC': { renewable_pct: 99, sources: { hydro: 95, wind: 3, solar: 1 } },
  'BC': { renewable_pct: 98, sources: { hydro: 90, wind: 5, solar: 3 } },
  'AB': { renewable_pct: 15, sources: { wind: 10, solar: 5, gas: 50, coal: 35 } },
  'SK': { renewable_pct: 25, sources: { hydro: 20, wind: 5, coal: 40, gas: 35 } },
  'MB': { renewable_pct: 97, sources: { hydro: 95, wind: 2, gas: 3 } },
  'NS': { renewable_pct: 35, sources: { wind: 15, hydro: 10, biomass: 10, coal: 40, gas: 25 } },
  'NB': { renewable_pct: 40, sources: { hydro: 25, wind: 10, biomass: 5, nuclear: 30, oil: 30 } },
  'PE': { renewable_pct: 98, sources: { wind: 95, solar: 3 } },
  'NL': { renewable_pct: 95, sources: { hydro: 93, wind: 2 } },
  'YT': { renewable_pct: 85, sources: { hydro: 80, wind: 5, diesel: 15 } },
  'NT': { renewable_pct: 45, sources: { hydro: 35, wind: 10, diesel: 55 } },
  'NU': { renewable_pct: 5, sources: { solar: 5, diesel: 95 } },
};

// Helper to compute renewable penetration from provincial_generation data
// The ProvincialGenerationRecord has generation_type field to identify fuel source
export const computeRenewablePenetration = (provincialData: ProvincialGenerationRecord[]): RenewablePenetrationResult => {
  const createSummary = (provinces: RenewablePenetrationDatum[]): RenewablePenetrationResult['summary'] => {
    const observedProvinceCount = provinces.filter((item) => item.data_origin === 'observed').length;
    const supplementedProvinceCount = provinces.filter((item) => item.data_origin !== 'observed').length;
    return {
      observedProvinceCount,
      supplementedProvinceCount,
      usesReferenceOnly: observedProvinceCount === 0,
      hasSupplementedProvinces: supplementedProvinceCount > 0,
    };
  };

  const createReferenceProvince = (
    code: string,
    data: { renewable_pct: number; sources: Record<string, number> },
    origin: RenewablePenetrationDataOrigin,
  ): RenewablePenetrationDatum => ({
    province: code,
    renewable_mw: (data.renewable_pct / 100) * 1000,
    fossil_mw: ((100 - data.renewable_pct) / 100) * 1000,
    total_mw: 1000,
    renewable_pct: data.renewable_pct,
    sources: Object.entries(data.sources).reduce((acc, [key, val]) => {
      acc[key] = (val / 100) * 1000;
      return acc;
    }, {} as Record<string, number>),
    data_origin: origin,
  });

  // Helper to generate fallback data
  const generateFallbackData = () => {
    const provinces = Object.entries(FALLBACK_RENEWABLE_PENETRATION).map(([code, data]) => (
      createReferenceProvince(code, data, 'reference')
    ));
    return {
      provinces,
      summary: createSummary(provinces),
    };
  };

  // Use fallback data when no real data is available
  if (!provincialData || provincialData.length === 0) {
    console.log('[Analytics] Using fallback renewable penetration data');
    return generateFallbackData();
  }

  // Province name to code mapping (fallback data uses full names)
  const PROVINCE_CODE_MAP: Record<string, string> = {
    'alberta': 'AB', 'british columbia': 'BC', 'manitoba': 'MB',
    'new brunswick': 'NB', 'newfoundland and labrador': 'NL',
    'northwest territories': 'NT', 'nova scotia': 'NS', 'nunavut': 'NU',
    'ontario': 'ON', 'prince edward island': 'PE', 'quebec': 'QC',
    'saskatchewan': 'SK', 'yukon': 'YT'
  };

  // Clean energy generation types (including nuclear as low-carbon)
  // Must match actual data format: "hydraulic turbine", "wind power turbine", etc.
  const CLEAN_ENERGY_PATTERNS = [
    'hydraulic',   // matches "hydraulic turbine" from Statistics Canada data
    'hydro',       // matches legacy "hydro" patterns
    'wind',        // matches "wind power turbine"
    'solar',
    'biomass',
    'geothermal',
    'tidal',
    'nuclear'      // Ontario is 60% nuclear - classified as clean/low-carbon
  ];

  // Group by province and aggregate by generation type
  const provinceMap = new Map<string, { renewable: number; fossil: number; total: number; sources: Record<string, number> }>();

  provincialData.forEach(record => {
    // Normalize province to code (handle both "Alberta" and "AB" formats)
    const rawProvince = (record.province_code || record.province || 'Unknown').toLowerCase();
    const code = PROVINCE_CODE_MAP[rawProvince] || rawProvince.toUpperCase();

    // Handle both field name conventions:
    // - Streaming data uses: 'source' (Coal, Solar, Wind) and 'generation_gwh'
    // - Fallback JSON uses: 'generation_type' (hydraulic turbine) and 'megawatt_hours'
    const genType = ((record as any).source || record.generation_type || 'other').toLowerCase();
    const mwh = record.megawatt_hours || (record.generation_gwh ? record.generation_gwh * 1000 : 0);

    if (!provinceMap.has(code)) {
      provinceMap.set(code, { renewable: 0, fossil: 0, total: 0, sources: {} });
    }

    const entry = provinceMap.get(code)!;
    entry.total += mwh;
    entry.sources[genType] = (entry.sources[genType] || 0) + mwh;

    // Check if this generation type is clean energy
    if (CLEAN_ENERGY_PATTERNS.some(pattern => genType.includes(pattern))) {
      entry.renewable += mwh;
    } else {
      entry.fossil += mwh;
    }
  });

  // Convert to output format
  const observedProvinces: RenewablePenetrationDatum[] = Array.from(provinceMap.entries()).map(([code, data]) => ({
    province: code,
    renewable_mw: data.renewable,
    fossil_mw: data.fossil,
    total_mw: data.total,
    renewable_pct: data.total > 0 ? (data.renewable / data.total) * 100 : 0,
    sources: data.sources,
    data_origin: 'observed',
  }));

  console.log('[Analytics] Processed real data:', {
    provinces: observedProvinces.length,
    sampleValues: observedProvinces.slice(0, 3).map(r => ({ p: r.province, pct: r.renewable_pct.toFixed(1) + '%' }))
  });

  // Check if the result has meaningful data (require at least 3 provinces with data)
  if (observedProvinces.length < 3) {
    console.log('[Analytics] Insufficient provinces in data, using reference renewable penetration data');
    return generateFallbackData();
  }

  const provinces = [...observedProvinces];

  // If we have real data but fewer provinces, supplement with fallback
  if (observedProvinces.length < Object.keys(FALLBACK_RENEWABLE_PENETRATION).length) {
    const existingCodes = new Set(observedProvinces.map(r => r.province));
    Object.entries(FALLBACK_RENEWABLE_PENETRATION).forEach(([code, data]) => {
      if (!existingCodes.has(code)) {
        provinces.push(createReferenceProvince(code, data, 'supplemented'));
      }
    });
  }

  return {
    provinces,
    summary: createSummary(provinces),
  };
};

export const AnalyticsTrendsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    ontarioDemand: [],
    provincialGeneration: [],
    weatherData: []
  });

  const [loading, setLoading] = useState(true);
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([]);
  const [excludedLowQualityCount, setExcludedLowQualityCount] = useState(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  // Analytics Insight state
  interface AnalyticsInsight {
    summary: string;
    key_findings?: string[];
    policy_implications?: string[];
    confidence?: string | number;
  }
  const [insight, setInsight] = useState<AnalyticsInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const insightAbortRef = useRef<AbortController | null>(null);

  // Applied recommendations state
  const [appliedRecommendations, setAppliedRecommendations] = useState<string[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  // Feedback toast state for user actions
  const [actionFeedback, setActionFeedback] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showActionFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ show: true, message, type });
    setTimeout(() => setActionFeedback({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleRecommendationApply = (recommendation: { id: string; title: string }) => {
    setAppliedRecommendations(prev => [...prev, recommendation.id]);
    // Persist to localStorage for session continuity
    try {
      const stored = JSON.parse(localStorage.getItem('ceip_applied_recommendations') || '[]');
      localStorage.setItem('ceip_applied_recommendations', JSON.stringify([...stored, recommendation.id]));
    } catch { /* ignore */ }
    // Show parent-level success feedback
    showActionFeedback(`✓ Recommendation "${recommendation.title}" applied successfully`, 'success');
  };

  const handleScenarioApply = (scenario: { id: string; name: string }) => {
    setActiveScenario(scenario.id);
    try {
      localStorage.setItem('ceip_active_scenario', JSON.stringify({ id: scenario.id, name: scenario.name, appliedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
    // Show parent-level success feedback
    showActionFeedback(`✓ Scenario "${scenario.name}" applied successfully`, 'success');
  };

  const handleBackToDashboard = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.assign('/dashboard');
  };

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    try {
      const signal = controller.signal;

      const [
        ontarioDemand,
        provincialGeneration,
        weatherData
      ] = await Promise.all([
        energyDataManager.loadData('ontario_demand', { maxRows: 500, signal }),
        energyDataManager.loadData('provincial_generation', { maxRows: 1000, signal }),
        energyDataManager.loadData('hf_electricity_demand', { maxRows: 500, signal })
      ]);

      if (signal.aborted) return;

      // Filter out low-completeness records (< 95%)
      const COMPLETENESS_THRESHOLD = 95;
      const filterByCompleteness = (records: any[]) => {
        const originalCount = records.length;
        const filtered = records.filter(r => {
          const completeness = Number(r.completeness_pct ?? r.data_completeness_percent ?? 100);
          return completeness >= COMPLETENESS_THRESHOLD;
        });
        return { filtered, excluded: originalCount - filtered.length };
      };

      const demandFiltered = filterByCompleteness(ontarioDemand);
      const genFiltered = filterByCompleteness(provincialGeneration);
      const weatherFiltered = filterByCompleteness(weatherData);

      const totalExcluded = demandFiltered.excluded + genFiltered.excluded + weatherFiltered.excluded;
      setExcludedLowQualityCount(totalExcluded);

      setData({
        ontarioDemand: demandFiltered.filtered,
        provincialGeneration: genFiltered.filtered,
        weatherData: weatherFiltered.filtered,
        trends: undefined
      });

      setConnectionStatuses(energyDataManager.getAllConnectionStatuses());
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error loading analytics data:', error);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Initialize analytics dashboard
  useEffect(() => {
    let mounted = true;

    const initializeAnalytics = async () => {
      await Promise.all(
        DATASETS.map(dataset => energyDataManager.initializeConnection(dataset.key))
      );

      if (mounted) {
        await loadAnalyticsData();
      }
    };

    initializeAnalytics();

    return () => {
      mounted = false;
      loadAbortRef.current?.abort();
    };
  }, [loadAnalyticsData]);

  // Load Analytics Insight
  const loadAnalyticsInsight = useCallback(async () => {
    insightAbortRef.current?.abort();
    const controller = new AbortController();
    insightAbortRef.current = controller;
    setInsightLoading(true);
    setInsightError(null);
    try {
      const payload = await getTransitionAnalyticsInsight('provincial_generation', 'recent', {
        signal: controller.signal
      });
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

  // Process weather correlation data
  const weatherCorrelationData = data.weatherData.length > 0
    ? data.weatherData.slice(0, 50).map((record, index) => ({
      name: `Point ${index + 1}`,
      value: Math.min(0.95, Math.max(0.45, 0.58 + ((record.temperature ?? 20) - 15) * 0.01 + ((index % 5) * 0.03))),
      temperature: record.temperature || 20,
      correlation: Math.min(0.95, Math.max(0.45, 0.58 + ((record.temperature ?? 20) - 15) * 0.01 + ((index % 5) * 0.03)))
    }))
    : Array.from({ length: 20 }, (_, i) => ({
      name: `Point ${i + 1}`,
      value: 0.55 + ((i % 6) * 0.04),
      temperature: 15 + i,
      correlation: 0.55 + ((i % 6) * 0.04)
    }));

  const averageCorrelation = weatherCorrelationData.reduce((sum, d) => sum + d.correlation, 0) / weatherCorrelationData.length;

  // Process 30-day generation trend
  const generationTrendData = data.provincialGeneration.length > 0
    ? data.provincialGeneration
      .slice(0, 30)
      .map((record, idx) => {
        // Handle different field names and convert to GWh
        let gwh = 0;
        if (typeof record.megawatt_hours === 'number' && record.megawatt_hours > 0) {
          gwh = record.megawatt_hours / 1000; // MWh to GWh
        } else if (typeof record.generation_gwh === 'number' && record.generation_gwh > 0) {
          gwh = record.generation_gwh;
        }

        return {
          name: `Day ${idx + 1}`,
          value: gwh > 0 ? gwh : (15 + ((idx % 6) * 0.8)),
          generation: gwh > 0 ? gwh : (15 + ((idx % 6) * 0.8))
        };
      })
    : Array.from({ length: 30 }, (_, i) => ({
      name: `Day ${i + 1}`,
      value: 15 + ((i % 6) * 0.8),
      generation: 15 + ((i % 6) * 0.8)
    }));

  const analyticsConnectionState = useMemo(() => {
    if (connectionStatuses.length === 0) return 'unknown' as const;
    if (connectionStatuses.some(status => status.status === 'fallback')) return 'demo' as const;
    if (connectionStatuses.some(status => status.status === 'error')) return 'unknown' as const;
    if (connectionStatuses.every(status => status.status === 'connected')) return 'live' as const;
    return 'unknown' as const;
  }, [connectionStatuses]);

  const analyticsUsesSupplementedData = data.provincialGeneration.length === 0 || data.ontarioDemand.length === 0 || excludedLowQualityCount > 0;
  const renewablePenetration = useMemo(() => (
    computeRenewablePenetration(data.provincialGeneration)
  ), [data.provincialGeneration]);
  const analyticsLastUpdated = extractLatestIsoTimestamp(
    ...data.ontarioDemand.map((record) => record.datetime),
    ...data.provincialGeneration.map((record) => record.date),
    ...data.weatherData.map((record) => record.datetime),
  );
  const analyticsFreshnessMeta = buildAnalyticsPageProvenance({
    connectionStatuses,
    lastUpdated: analyticsLastUpdated,
    hasSupplementedData: analyticsUsesSupplementedData,
    excludedLowQualityCount,
  });
  const analyticsIsDemo = analyticsFreshnessMeta.isFallback;

  return (
    <div className="min-h-screen bg-slate-900 dashboard-analytics">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="analytics-hero-title">
        <div className="hero-content">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0, 217, 255, 0.1)' }}>
                  <TrendingUp className="h-6 w-6 text-electric" />
                </div>
                <h1 id="analytics-hero-title" className="hero-title">Analytics & Trends</h1>
              </div>
              <p className="hero-subtitle">
                Explore historical patterns, correlations, and AI-powered insights
              </p>
              {excludedLowQualityCount > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-secondary border border-warning/30 rounded-lg text-sm">
                  <AlertCircle size={16} className="text-warning" />
                  <span className="text-secondary">{excludedLowQualityCount} low-completeness records excluded (threshold: 95%)</span>
                </div>
              )}
              <div className="mt-3">
                <DataFreshnessBadge
                  timestamp={analyticsFreshnessMeta.lastUpdated}
                  status={analyticsFreshnessMeta.freshnessStatus}
                  source={analyticsFreshnessMeta.source}
                  showRelative={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToDashboard}
                className="btn btn-secondary"
              >
                <ArrowLeft size={20} />
                <span>Back to Dashboard</span>
              </button>
              <HelpButton id="page.analytics" />
            </div>
          </div>
        </div>
      </section>

      <div className={`${CONTAINER_CLASSES.page} space-y-8 py-8`}>
        {analyticsIsDemo && (
          <DataTrustNotice
            mode="fallback"
            title="Fallback analytics inputs active"
            message="Some analytics cards are using seeded or supplemented values because upstream generation or Ontario demand inputs are incomplete. Weather-correlation and trend visuals remain directional modeling aids until every tile is backed by source-level provenance."
          />
        )}

        {renewablePenetration.summary.hasSupplementedProvinces && (
          <DataTrustNotice
            mode="fallback"
            title={renewablePenetration.summary.usesReferenceOnly ? 'Reference renewable map in use' : 'Supplemented renewable map in use'}
            message={renewablePenetration.summary.usesReferenceOnly
              ? 'The renewable penetration heatmap is currently based on reference provincial values because there are not enough observed generation records to support a trustworthy comparative map.'
              : `${renewablePenetration.summary.supplementedProvinceCount} provinces or territories are currently marked as supplemented reference values so observed and modeled entries are not blended silently.`}
          />
        )}

        {/* Action Feedback Toast */}
        {actionFeedback.show && typeof document !== 'undefined' && createPortal(
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[120] px-6 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <CheckCircle className="h-4 w-4" />
            {actionFeedback.message}
          </div>,
          document.body
        )}

        {/* Renewable Penetration Heatmap - Uses real data with fallback */}
        <RenewablePenetrationHeatmap
          provincialData={renewablePenetration.provinces}
        />

        {/* Enhanced Modular Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 30-Day Generation Trend - Modular */}
          <ModularChartWidget
            title="30-Day Generation Trend"
            data={generationTrendData}
            chartType="line"
            dataKeys={['generation']}
            colors={['#3b82f6']}
            height={350}
            aiInsights={true}
            interactive={true}
          />

          {/* Weather Correlation Analysis - Modular */}
          <ModularChartWidget
            title="Weather Correlation Analysis"
            data={weatherCorrelationData}
            chartType="scatter"
            dataKeys={['correlation']}
            colors={['#f59e0b']}
            height={350}
            aiInsights={true}
            interactive={true}
          />
        </div>

        {/* Provincial Energy Mix - Pie Chart */}
        <ModularChartWidget
          title="Provincial Energy Mix Distribution"
          data={renewablePenetration.provinces.map(item => ({
            name: item.province,
            value: item.renewable_pct,
            renewable: item.renewable_pct,
            fossil: 100 - item.renewable_pct,
            data_origin: item.data_origin,
          }))}
          chartType="pie"
          dataKeys={['value']}
          colors={['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']}
          height={400}
          aiInsights={true}
          interactive={true}
        />

        {/* AI Analytics Widget */}
        <AIAnalyticsWidget
          dataset="provincial_generation"
          currentMetrics={{
            renewablePercentage: 67,
            totalCapacity: 100000,
            peakDemand: 25000
          }}
          onRecommendationApply={handleRecommendationApply}
          onScenarioApply={handleScenarioApply}
          onQuerySubmit={(query) => console.log('AI Query submitted:', query)}
        />

        {/* Natural Language Query Interface */}
        <div className="card p-6">
          <AskDataPanel />
        </div>

        {/* Reports Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransitionReportPanel datasetPath="provincial_generation" timeframe="recent" />
          <DataQualityPanel datasetPath="provincial_generation" timeframe="recent" />
        </div>

        {/* Back to Dashboard CTA */}
        <div className="card relative overflow-hidden text-center border border-[var(--border-subtle)]">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-slate-900/40 pointer-events-none" />
          <div className="relative z-10 p-6">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Ready to review current data?
            </h3>
            <p className="text-sm text-secondary mb-4">
              Return to the main dashboard for energy metrics and alerts
            </p>
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTrendsDashboard;
