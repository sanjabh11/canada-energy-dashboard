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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Zap, Activity, Database, CheckCircle,
  TrendingUp, MapPin, Loader2
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
import { HelpButton } from './HelpButton';
import { getTransitionKpis, type TransitionKpisResponse } from '../lib/llmClient';
import { isEdgeFetchEnabled } from '../lib/config';
import { fetchEdgeJson } from '../lib/edge';
import { CONTAINER_CLASSES, CHART_CONFIGS, TEXT_CLASSES } from '../lib/ui/layout';
import PeakAlertBanner from './PeakAlertBanner';
import CO2EmissionsTracker from './CO2EmissionsTracker';
import { DataQualityBadge } from './DataQualityBadge';
import { createProvenance } from '../lib/types/provenance';
import OpsHealthPanel from './OpsHealthPanel';
import StorageMetricsCard from './StorageMetricsCard';
import { DataSource, COMMON_DATA_SOURCES } from './ui/DataSource';
import { DataFreshnessBadge } from './ui/DataFreshnessBadge';
import { SkeletonLoader, SkeletonChart, SkeletonMetricGrid } from './ui/SkeletonLoader';
import DataTrustNotice from './DataTrustNotice';
import { buildDataProvenance } from '../lib/foundation';
import { buildDashboardFreshnessProvenance, resolveMetricCandidate } from '../lib/scoreboardProvenance';
import { describeFreshness, getProvinceCoverageFact } from '../lib/platformFacts';

// Map Canadian fuel type names to standardized display categories
const GENERATION_TYPE_DISPLAY_MAP: Record<string, string> = {
  // Canadian dataset fuel types
  'combustible fuels': 'GAS',
  'hydraulic turbine': 'HYDRO',
  'hydraulic_turbine': 'HYDRO',
  'wind power turbine': 'WIND',
  'wind_power_turbine': 'WIND',
  'other types of electricity generation': 'OTHER',
  'tidal power turbine': 'HYDRO',
  'tidal_power_turbine': 'HYDRO',
  'nuclear steam turbine': 'NUCLEAR',
  'nuclear_steam_turbine': 'NUCLEAR',
  // Standard names (passthrough)
  'coal': 'COAL',
  'natural gas': 'GAS',
  'natural_gas': 'GAS',
  'gas': 'GAS',
  'oil': 'OIL',
  'petroleum': 'OIL',
  'diesel': 'OIL',
  'nuclear': 'NUCLEAR',
  'hydro': 'HYDRO',
  'hydroelectric': 'HYDRO',
  'wind': 'WIND',
  'solar': 'SOLAR',
  'biomass': 'BIOMASS',
  'biofuel': 'BIOFUEL',
  'geothermal': 'GEOTHERMAL',
  'other': 'OTHER'
};

/**
 * Normalize Canadian generation type to standardized display name
 */
function normalizeGenerationDisplayType(type: string): string {
  if (!type) return 'OTHER';
  const normalized = type.toLowerCase().trim();
  return GENERATION_TYPE_DISPLAY_MAP[normalized] || normalized.replace(/_/g, ' ').toUpperCase();
}

interface DashboardData {
  ontarioDemand: OntarioDemandRecord[];
  provincialGeneration: ProvincialGenerationRecord[];
  ontarioPrices: OntarioPricesRecord[];
  weatherData: HFElectricityDemandRecord[];
  nationalOverview?: any;
  provinceMetrics?: any;
  trends?: any;
}

interface DashboardStats {
  dataSources: number;
  coverage: string;
  updateFreq: string;
  architecture: string;
}

export const RealTimeDashboard: React.FC = () => {

  const [data, setData] = useState<DashboardData>({
    ontarioDemand: [],
    provincialGeneration: [],
    ontarioPrices: [],
    weatherData: []
  });
  
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>(() => energyDataManager.getAllConnectionStatuses());
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastRefreshSuccess, setLastRefreshSuccess] = useState<boolean | null>(null);
  const [kpiStatus, setKpiStatus] = useState<'loading' | 'ready' | 'error' | 'disabled'>('loading');

  // KPIs from server
  const [kpis, setKpis] = useState<TransitionKpisResponse | null>(null);
  const kpiAbortRef = useRef<AbortController | null>(null);

  // Abort controller ref to cancel overlapping loads
  const loadAbortRef = useRef<AbortController | null>(null);

  const nationalOverview = data.nationalOverview;
  const provinceMetrics = data.provinceMetrics;
  const trends = data.trends;
  const trendDemandProvenance = trends?.provenance?.ontario_demand ?? trends?.metadata?.provenance?.ontario_demand ?? null;
  const trendDemandIsFallback = trendDemandProvenance?.is_fallback === true;
  const trendDemandLastUpdated = trendDemandProvenance?.last_updated ?? null;
  const trendDemandFreshness = trendDemandProvenance?.freshness_status;

  // Analytics API-derived quick stats (primary source)
  const topSourceFromAPI: string | null = (data.provinceMetrics?.generation?.top_source ?? null);
  const renewableShareFromAPI: number | null = (data.provinceMetrics?.generation?.renewable_share_percent ?? null);

  const extractLatestTimestamp = (...values: Array<string | Date | null | undefined>): Date | null => {
    const timestamps = values
      .flat()
      .map((value) => {
        if (!value) return null;
        const parsed = value instanceof Date ? value : new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      })
      .filter((value): value is Date => value !== null);

    if (timestamps.length === 0) {
      return null;
    }

    return timestamps.reduce((latest, current) => (
      current.getTime() > latest.getTime() ? current : latest
    ));
  };

  // Load all dashboard data concurrently with cancellation support
  const loadDashboardData = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    try {
      const signal = controller.signal;

      const nationalOverviewPromise = isEdgeFetchEnabled()
        ? fetchEdgeJson([
            'api-v2-analytics-national-overview',
            'api/analytics/national-overview'
          ], { signal }).then((res) => res.json).catch((err) => {
            console.warn('National overview fallback triggered', err);
            return null;
          })
        : Promise.resolve(null);

      const provinceMetricsPromise = isEdgeFetchEnabled()
        ? fetchEdgeJson([
            'api-v2-analytics-provincial-metrics?province=ON&window_days=2',
            'api/analytics/provincial/ON?window_days=2'
          ], { signal }).then((res) => res.json).catch((err) => {
            console.warn('Provincial metrics fallback triggered', err);
            return null;
          })
        : Promise.resolve(null);

      const trendPromise = isEdgeFetchEnabled()
        ? fetchEdgeJson([
            'api-v2-analytics-trends?timeframe=30d',
            'api/analytics/trends?timeframe=30d'
          ], { signal }).then((res) => res.json).catch((err) => {
            console.warn('Trend analytics fallback triggered', err);
            return null;
          })
        : Promise.resolve(null);

      const [
        ontarioDemand,
        provincialGeneration,
        ontarioPrices,
        weatherData,
        nationalOverview,
        provinceMetrics,
        trends
      ] = await Promise.all([
        energyDataManager.loadData('ontario_demand', { maxRows: 200, signal }).catch(e => { 
          if (e?.name === 'AbortError') return []; // Silently ignore intentional aborts
          console.warn('ontario_demand failed', e); 
          return []; 
        }),
        energyDataManager.loadData('provincial_generation', { maxRows: 500, signal }).catch(e => { 
          if (e?.name === 'AbortError') return []; // Silently ignore intentional aborts
          console.warn('provincial_generation failed', e); 
          return []; 
        }),
        energyDataManager.loadData('ontario_prices', { maxRows: 200, signal }).catch(e => { 
          if (e?.name === 'AbortError') return []; // Silently ignore intentional aborts
          console.warn('ontario_prices failed', e); 
          return []; 
        }),
        energyDataManager.loadData('hf_electricity_demand', { maxRows: 200, signal }).catch(e => { 
          if (e?.name === 'AbortError') return []; // Silently ignore intentional aborts
          console.warn('hf_electricity_demand failed', e); 
          return []; 
        }),
        nationalOverviewPromise,
        provinceMetricsPromise,
        trendPromise
      ]);

      if (signal.aborted) {
        setLastRefreshSuccess(false);
        return;
      }

      setData({
        ontarioDemand,
        provincialGeneration,
        ontarioPrices,
        weatherData,
        nationalOverview: nationalOverview ?? undefined,
        provinceMetrics: provinceMetrics ?? undefined,
        trends: trends ?? undefined
      });

      const statuses = energyDataManager.getAllConnectionStatuses();
      setLastUpdate(
        extractLatestTimestamp(
          ...ontarioDemand.map((record) => record.datetime),
          ...provincialGeneration.map((record) => record.date),
          ...ontarioPrices.map((record) => record.datetime),
          ...weatherData.map((record) => record.datetime),
          trends?.window?.end,
          (provinceMetrics as { as_of?: string } | null)?.as_of,
          (nationalOverview as { as_of?: string } | null)?.as_of
        ) ?? null
      );
      setConnectionStatuses(statuses);
      setLastRefreshSuccess(true);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setLastRefreshSuccess(false);
        return;
      }
      console.error('Error loading dashboard data:', error);
      setLastRefreshSuccess(false);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Initialize dashboard
  useEffect(() => {
    let mounted = true;
    
    const initializeDashboard = async () => {
      // Initialize all connections
      await Promise.all(
        DATASETS.map(dataset => energyDataManager.initializeConnection(dataset.key))
      );
      
      // Load initial data (this will also update statuses)
      if (mounted) {
        await loadDashboardData();
      }
    };

    initializeDashboard();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      if (mounted) {
        loadDashboardData(); // This will also update statuses
      }
    }, 30000);

    return () => {
      mounted = false;
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
      if (!isEdgeFetchEnabled()) {
        if (!controller.signal.aborted) {
          setKpiStatus('disabled');
        }
        if (!controller.signal.aborted) {
          setKpis(null);
        }
        return;
      }
      try {
        const data = await getTransitionKpis('provincial_generation', 'recent', { signal: controller.signal });
        if (!controller.signal.aborted) {
          setKpis(data);
          setKpiStatus('ready');
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.warn('KPI load failed', e);
        if (!controller.signal.aborted) setKpiStatus('error');
      }
    })();
    return () => controller.abort();
  }, []);

  const dashboardCoverageFact = React.useMemo(() => getProvinceCoverageFact(), []);

  // Memoize generation calculations - PRIORITIZE API data over streaming for stability
  const totalGenerationGwh = React.useMemo(() => {
    // Primary: API-derived total from KPIs (most stable across renders)
    const apiTotalMwh = kpis?.kpis?.total_mwh;
    if (typeof apiTotalMwh === 'number' && apiTotalMwh > 0) {
      return apiTotalMwh / 1000; // Convert MWh to GWh
    }

    // Secondary: National overview generation data
    const nationalGenerationRaw = nationalOverview?.generation?.total_generation_gwh;
    if (typeof nationalGenerationRaw === 'number' && nationalGenerationRaw > 0) {
      return nationalGenerationRaw;
    }

    // Tertiary: Provincial metrics API
    const apiGenerationRaw = provinceMetrics?.generation?.total_gwh;
    if (typeof apiGenerationRaw === 'number' && apiGenerationRaw > 0) {
      return apiGenerationRaw;
    }

    // Last resort: Calculate from streaming data (only if no API data available)
    // NOTE: This path is intentionally avoided in normal operation to prevent instability
    const fallbackGenerationGwh = data.provincialGeneration.reduce((sum, record) => {
      const valueMwh = typeof record.megawatt_hours === 'number'
        ? record.megawatt_hours
        : typeof record.generation_gwh === 'number'
          ? record.generation_gwh * 1000
          : 0;
      return sum + valueMwh / 1000;
    }, 0);

    return fallbackGenerationGwh > 0 ? fallbackGenerationGwh : 0;
  }, [
    // Only depend on API-derived values - NOT on streaming data which changes reference every refresh
    kpis?.kpis?.total_mwh,
    nationalOverview?.generation?.total_generation_gwh,
    provinceMetrics?.generation?.total_gwh,
    // Deliberately NOT including data.provincialGeneration to prevent instability
  ]);

  const activeDataSources = connectionStatuses.filter((s) =>
    s.status === 'connected' ||
    s.status === 'connecting' ||
    (s.status === 'fallback' && s.recordCount > 0)
  ).length;
  const displayedDataSources = activeDataSources > 0 ? activeDataSources : DATASETS.length;
  const hasFallbackData = React.useMemo(() => {
    return connectionStatuses.some(status => status.status === 'fallback' || status.source === 'fallback');
  }, [connectionStatuses]);
  const ontarioDemandStatus = connectionStatuses.find((status) => status.dataset === 'ontario_demand');
  const provincialGenerationStatus = connectionStatuses.find((status) => status.dataset === 'provincial_generation');
  const dashboardLastUpdatedIso = lastUpdate?.toISOString() ?? null;
  const kpiLastUpdated = kpis?.meta?.generated_at ?? kpis?.meta?.freshness ?? null;
  const nationalOverviewLastUpdated = (nationalOverview as { as_of?: string } | null)?.as_of ?? null;
  const provinceMetricsLastUpdated = (provinceMetrics as { as_of?: string } | null)?.as_of ?? null;
  const streamingGenerationMwh = data.provincialGeneration.reduce((sum, record) => {
    const valueMwh = typeof record.megawatt_hours === 'number'
      ? record.megawatt_hours
      : typeof record.generation_gwh === 'number'
        ? record.generation_gwh * 1000
        : 0;
    return sum + valueMwh;
  }, 0);
  const generationChartSeries = React.useMemo(() => {
    const buckets = new Map<string, number>();
    for (const record of data.provincialGeneration) {
      const type = normalizeGenerationDisplayType(record.generation_type ?? 'other');
      const valueGwh = typeof record.megawatt_hours === 'number'
        ? record.megawatt_hours / 1000
        : typeof record.generation_gwh === 'number'
          ? record.generation_gwh
          : 0;
      buckets.set(type, (buckets.get(type) ?? 0) + valueGwh);
    }

    return Array.from(buckets.entries())
      .map(([type, gwh]) => ({ type, gwh: Number(gwh.toFixed(2)) }))
      .sort((a, b) => b.gwh - a.gwh);
  }, [data.provincialGeneration]);
  const topSourceFromStreaming = generationChartSeries[0]?.type ?? null;
  const renewableTypes = new Set(['HYDRO', 'WIND', 'SOLAR', 'BIOMASS', 'BIOFUEL', 'GEOTHERMAL']);
  const renewableShareFromStreaming = React.useMemo(() => {
    const totalGwh = generationChartSeries.reduce((sum, item) => sum + item.gwh, 0);
    if (totalGwh <= 0) return null;
    const renewableGwh = generationChartSeries
      .filter((item) => renewableTypes.has(item.type))
      .reduce((sum, item) => sum + item.gwh, 0);
    return Number(((renewableGwh / totalGwh) * 100).toFixed(1));
  }, [generationChartSeries]);
  const normalizedSourceValue = (value: string | null | undefined) => {
    const normalized = value ? String(value).toUpperCase().trim() : null;
    if (!normalized || ['UNCLASSIFIED', 'UNKNOWN', 'UNSPECIFIED', '', 'KAGGLE'].includes(normalized)) {
      return null;
    }
    return normalized;
  };
  const totalGenerationMetric = resolveMetricCandidate<number>([
    {
      value: typeof kpis?.kpis?.total_mwh === 'number' && kpis.kpis.total_mwh > 0 ? kpis.kpis.total_mwh : null,
      source: kpis?.meta?.is_fallback ? 'Transition KPI fallback service' : 'Transition KPI service',
      lastUpdated: kpiLastUpdated,
      isFallback: kpis?.meta?.is_fallback ?? false,
      staleAfterHours: 1,
      note: 'Displayed as total generation from the KPI service when available.',
    },
    {
      value: typeof nationalOverview?.generation?.total_generation_gwh === 'number' && nationalOverview.generation.total_generation_gwh > 0
        ? nationalOverview.generation.total_generation_gwh * 1000
        : null,
      source: 'National overview analytics API',
      lastUpdated: nationalOverviewLastUpdated,
      staleAfterHours: 24,
      note: 'Fallback to national overview aggregate when KPI service is unavailable.',
    },
    {
      value: typeof provinceMetrics?.generation?.total_gwh === 'number' && provinceMetrics.generation.total_gwh > 0
        ? provinceMetrics.generation.total_gwh * 1000
        : null,
      source: 'Provincial metrics analytics API',
      lastUpdated: provinceMetricsLastUpdated,
      staleAfterHours: 24,
      note: 'Derived from the provincial metrics response.',
    },
    {
      value: streamingGenerationMwh > 0 ? streamingGenerationMwh : null,
      source: provincialGenerationStatus?.source === 'fallback' ? 'Fallback provincial generation stream' : 'Provincial generation stream',
      lastUpdated: provincialGenerationStatus?.lastUpdate?.toISOString() ?? dashboardLastUpdatedIso,
      isFallback: provincialGenerationStatus?.source === 'fallback',
      staleAfterHours: 1,
      note: 'Calculated from the currently loaded generation records.',
    },
  ], { defaultSource: 'Fallback generation sample', defaultNote: 'No verified generation source is currently available for this KPI.', staleAfterHours: 1 });
  const topSourceMetric = resolveMetricCandidate<string>([
    {
      value: normalizedSourceValue(topSourceFromAPI),
      source: 'Provincial metrics analytics API',
      lastUpdated: provinceMetricsLastUpdated,
      staleAfterHours: 24,
      note: 'Top source from the provincial metrics API.',
    },
    {
      value: normalizedSourceValue(kpis?.kpis?.top_source?.type),
      source: kpis?.meta?.is_fallback ? 'Transition KPI fallback service' : 'Transition KPI service',
      lastUpdated: kpiLastUpdated,
      isFallback: kpis?.meta?.is_fallback ?? false,
      staleAfterHours: 1,
      note: 'Top source returned by the KPI service.',
    },
    {
      value: normalizedSourceValue(topSourceFromStreaming),
      source: provincialGenerationStatus?.source === 'fallback' ? 'Fallback provincial generation stream' : 'Provincial generation stream',
      lastUpdated: provincialGenerationStatus?.lastUpdate?.toISOString() ?? dashboardLastUpdatedIso,
      isFallback: provincialGenerationStatus?.source === 'fallback',
      staleAfterHours: 1,
      note: 'Derived from the displayed generation mix when API values are unavailable.',
    },
  ], { defaultSource: 'Fallback generation sample', defaultNote: 'No verified top source is currently available for this KPI.', staleAfterHours: 1 });
  const renewableShareMetric = resolveMetricCandidate<number>([
    {
      value: typeof renewableShareFromAPI === 'number' && renewableShareFromAPI > 0 ? renewableShareFromAPI : null,
      source: 'Provincial metrics analytics API',
      lastUpdated: provinceMetricsLastUpdated,
      staleAfterHours: 24,
      note: 'Renewable share from the analytics API.',
    },
    {
      value: typeof kpis?.kpis?.renewable_share === 'number' && kpis.kpis.renewable_share > 0 ? kpis.kpis.renewable_share * 100 : null,
      source: kpis?.meta?.is_fallback ? 'Transition KPI fallback service' : 'Transition KPI service',
      lastUpdated: kpiLastUpdated,
      isFallback: kpis?.meta?.is_fallback ?? false,
      staleAfterHours: 1,
      note: 'Renewable share returned by the KPI service.',
    },
    {
      value: typeof renewableShareFromStreaming === 'number' && renewableShareFromStreaming > 0 ? renewableShareFromStreaming : null,
      source: provincialGenerationStatus?.source === 'fallback' ? 'Fallback provincial generation stream' : 'Provincial generation stream',
      lastUpdated: provincialGenerationStatus?.lastUpdate?.toISOString() ?? dashboardLastUpdatedIso,
      isFallback: provincialGenerationStatus?.source === 'fallback',
      staleAfterHours: 1,
      note: 'Derived from the displayed generation mix when API values are unavailable.',
    },
  ], { defaultSource: 'Fallback generation sample', defaultNote: 'No verified renewable share is currently available for this KPI.', staleAfterHours: 1 });
  const connectedDashboardFreshnessMeta = buildDashboardFreshnessProvenance({
    connectionStatuses,
    lastUpdated: dashboardLastUpdatedIso,
    fallbackLastUpdated: trendDemandLastUpdated,
  });
  const dashboardFreshnessMeta = buildDataProvenance({
    source: trendDemandProvenance?.source ?? connectedDashboardFreshnessMeta.source,
    lastUpdated: trendDemandLastUpdated ?? dashboardLastUpdatedIso,
    isFallback: trendDemandIsFallback || hasFallbackData,
    staleAfterHours: 1,
    note: trendDemandIsFallback
      ? 'Ontario demand trend is currently modeled or supplemented.'
      : connectedDashboardFreshnessMeta.note,
  });
  const dashboardFreshnessLabel = React.useMemo(() => describeFreshness({
    timestamp: lastUpdate?.toISOString() ?? trendDemandLastUpdated ?? dashboardLastUpdatedIso ?? null,
    status: dashboardFreshnessMeta.freshnessStatus,
    isFallback: dashboardFreshnessMeta.isFallback,
    staleAfterHours: 1,
  }), [dashboardFreshnessMeta.freshnessStatus, dashboardFreshnessMeta.isFallback, dashboardLastUpdatedIso, lastUpdate, trendDemandLastUpdated]);

  const dashboardFreshnessDisplay = kpiStatus === 'error'
    ? 'Unavailable'
    : dashboardFreshnessLabel;

  const dashboardStats: DashboardStats = React.useMemo(() => ({
    dataSources: displayedDataSources,
    coverage: dashboardCoverageFact.value,
    updateFreq: dashboardFreshnessDisplay,
    architecture: 'Resilient',
  }), [dashboardCoverageFact.value, dashboardFreshnessDisplay, displayedDataSources]);
  const ontarioDemandChartData = React.useMemo(() => {
    return [...data.ontarioDemand]
      .sort((a, b) => a.datetime.localeCompare(b.datetime))
      .slice(-48)
      .map((record) => ({
        time: new Date(record.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        demand: record.total_demand_mw,
      }));
  }, [data.ontarioDemand]);
  const currentDemand = ontarioDemandChartData.length > 0
    ? ontarioDemandChartData[ontarioDemandChartData.length - 1]?.demand ?? null
    : null;
  const supplyDemandChartData = React.useMemo(() => {
    if (Array.isArray(trends?.ontario_demand) && trends.ontario_demand.length > 0) {
      return trends.ontario_demand.map((row: { date?: string; average_mw?: number; bucket_date?: string }) => {
        const label = row.date ?? row.bucket_date ?? '';
        return {
          label,
          demand: row.average_mw ?? 0,
        };
      });
    }

    return [...data.ontarioDemand]
      .sort((a, b) => a.datetime.localeCompare(b.datetime))
      .slice(-24)
      .map((record) => ({
        label: new Date(record.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        demand: record.total_demand_mw,
      }));
  }, [trends, data.ontarioDemand]);
  const hasDemandTrend = Array.isArray(trends?.ontario_demand) && trends.ontario_demand.length > 0;
  const trendWindowStart = trends?.window?.start ? new Date(trends.window.start).toLocaleDateString() : '—';
  const trendWindowEnd = trends?.window?.end ? new Date(trends.window.end).toLocaleDateString() : '—';
  const currentSupply = null;
  const currentDemandAlberta = supplyDemandChartData.length > 0
    ? supplyDemandChartData[supplyDemandChartData.length - 1]?.demand ?? null
    : null;
  const currentPrice = data.ontarioPrices.length > 0
    ? data.ontarioPrices[0]?.energy_price ?? null
    : null;
  const sourceText = (key: DatasetType) => {
    try {
      const s = energyDataManager.getConnectionStatus(key);
      if (!s) return 'Unknown';
      return s.source === 'stream' ? 'Stream' : 'Fallback';
    } catch {
      return 'Unknown';
    }
  };

  // Debug: Check if env vars are loaded
  const envDebug = {
    edgeFetch: import.meta.env.VITE_ENABLE_EDGE_FETCH,
    streaming: import.meta.env.VITE_USE_STREAMING_DATASETS,
    debug: import.meta.env.VITE_DEBUG_LOGS
  };
  console.log('🔧 RealTimeDashboard env check:', envDebug);

  // Calculate if data is actually live (freshness check + data presence check + last refresh success)
  const isDataLive = React.useMemo(() => {
    if (hasFallbackData || trendDemandIsFallback || dashboardFreshnessMeta.isFallback || kpiStatus === 'error') {
      return false;
    }
    if (lastRefreshSuccess === false) {
      return false;
    }
    const stalenessThresholdMs = 5 * 60 * 1000; // 5 minutes
    if (!lastUpdate) {
      return false;
    }
    const now = Date.now();
    const isFresh = (now - lastUpdate.getTime()) < stalenessThresholdMs;
    const hasData = data.ontarioDemand.length > 0 || 
                    data.provincialGeneration.length > 0 || 
                    (totalGenerationGwh !== null && totalGenerationGwh > 0) ||
                    (currentDemand !== null && currentDemand > 0);
    return isFresh && hasData;
  }, [hasFallbackData, trendDemandIsFallback, dashboardFreshnessMeta.isFallback, kpiStatus, lastRefreshSuccess, lastUpdate, data, totalGenerationGwh, currentDemand]);

  // Check for partial data (fresh timestamp but some metrics missing)
  const hasPartialData = React.useMemo(() => {
    if (kpiStatus === 'error') {
      return data.ontarioDemand.length > 0 ||
        data.provincialGeneration.length > 0 ||
        (totalGenerationGwh !== null && totalGenerationGwh > 0) ||
        (currentDemand !== null && currentDemand > 0);
    }
    if (hasFallbackData || trendDemandIsFallback || dashboardFreshnessMeta.isFallback) {
      return false;
    }
    const stalenessThresholdMs = 5 * 60 * 1000;
    if (!lastUpdate) {
      return false;
    }
    const now = Date.now();
    const isFresh = (now - lastUpdate.getTime()) < stalenessThresholdMs;
    const hasSomeData = data.ontarioDemand.length > 0 || data.provincialGeneration.length > 0;
    const hasAllData = totalGenerationGwh > 0 && currentDemand > 0 && data.ontarioDemand.length > 5;
    return isFresh && hasSomeData && !hasAllData;
  }, [hasFallbackData, trendDemandIsFallback, dashboardFreshnessMeta.isFallback, kpiStatus, lastUpdate, data, totalGenerationGwh, currentDemand]);

  return (
    <div className="min-h-screen bg-primary">
      {hasFallbackData && (
      <DataTrustNotice
        mode="fallback"
        title="Fallback energy data in use"
        message="This dashboard is currently displaying backup sources rather than live feeds. Demand, generation, and price data may be delayed or drawn from historical samples."
        className="mx-6 mt-6"
      />
      )}
      {trendDemandIsFallback && (
        <DataTrustNotice
          mode="fallback"
          title="Analytics trend demand series is modeled"
          message="The 30-day Ontario demand trend currently includes synthetic fallback data. Use the trend view for directional context, not as an observed market record."
          className="mx-6 mt-4"
        />
      )}
      {kpiStatus === 'error' && (
        <DataTrustNotice
          mode="fallback"
          title="Transition KPI endpoint unavailable"
          message="The transition KPI service failed to return a trustworthy response, so the dashboard freshness label is downgraded to avoid implying a live system state."
          className="mx-6 mt-4"
        />
      )}

      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="realtime-hero-title">
        <div className="hero-content">
          <h1 id="realtime-hero-title" className="hero-title">
            Energy Operations Dashboard
          </h1>
          <p className="hero-subtitle">
            Live-when-available monitoring of Canadian energy systems with clearly labeled freshness status
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isDataLive ? (
              <span className="badge badge-live">● Live Data</span>
            ) : hasPartialData ? (
              <span className="badge badge-warning">◐ Partial Data — Some metrics loading</span>
            ) : loading ? (
              <span className="badge badge-warning">⟳ Refreshing...</span>
            ) : lastRefreshSuccess === false ? (
              <span className="badge badge-warning">⚠ Refresh interrupted — data may be stale</span>
            ) : (
              <span className="badge badge-warning">⚠ Data refreshing — may be stale</span>
            )}
          </div>

          {/* Key Stats */}
          <div className="grid grid-auto gap-md mt-6">
            <div className="card card-metric">
              <Database className="h-10 w-10 text-electric mx-auto mb-3" />
              <span className="metric-value">{dashboardStats.dataSources}</span>
              <span className="metric-label">Active Data Sources</span>
            </div>

            <div className="card card-metric">
              <MapPin className="h-10 w-10 text-success mx-auto mb-3" />
              <span className="metric-value">{dashboardStats.coverage}</span>
              <span className="metric-label">Provinces Covered</span>
            </div>

            <div className="card card-metric">
              <Activity className="h-10 w-10 text-electric mx-auto mb-3" />
              <span className="metric-value">{dashboardStats.updateFreq}</span>
              <span className="metric-label">Update Frequency</span>
            </div>

            <div className="card card-metric">
              <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
              <span className="metric-value">{dashboardStats.architecture}</span>
              <span className="metric-label">Architecture</span>
            </div>
          </div>
        </div>
      </section>

      <div className={`${CONTAINER_CLASSES.page} space-y-8 animate-fade-in`}>

      {/* Phase III.0: Peak Alert Banner */}
      <PeakAlertBanner
        currentDemand={currentDemand || 0}
        recentDemand={data.ontarioDemand.slice(0, 10).map(d => d.total_demand_mw)}
        historicalPattern={[
          { hour: 6, avg_demand: 15000 },
          { hour: 9, avg_demand: 18000 },
          { hour: 12, avg_demand: 19000 },
          { hour: 15, avg_demand: 17500 },
          { hour: 18, avg_demand: 21000 },
          { hour: 21, avg_demand: 18500 }
        ]}
      />

      {/* Grid: CO2 Emissions + Ops Health + Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          {/* Phase III.0: CO2 Emissions Tracker - Connected to Live Generation Mix */}
          {(() => {
            // Use real data if available, otherwise fallback to Ontario average mix
            const co2GenerationData = (totalGenerationGwh > 0 && generationChartSeries.length > 0)
              ? generationChartSeries.map(source => ({
                  source_type: source.type.toLowerCase(),
                  capacity_mw: (source.gwh * 1000) / 24,
                  percentage: totalGenerationGwh > 0 ? (source.gwh / totalGenerationGwh) * 100 : 0
                }))
              : [
                  // Fallback: Ontario typical generation mix (based on IESO data)
                  { source_type: 'nuclear', capacity_mw: 8000, percentage: 55 },
                  { source_type: 'hydro', capacity_mw: 3500, percentage: 24 },
                  { source_type: 'gas', capacity_mw: 2200, percentage: 15 },
                  { source_type: 'wind', capacity_mw: 800, percentage: 5.5 },
                  { source_type: 'solar', capacity_mw: 100, percentage: 0.5 }
                ];
            
            return (
              <CO2EmissionsTracker
                generationData={co2GenerationData}
                compact={true}
                showBreakdown={false}
              />
            );
          })()}
        </div>
        <div>
          {/* Ops Health Panel - Real-time SLO Metrics */}
          <OpsHealthPanel variant="compact" autoRefresh={true} refreshInterval={30000} />
        </div>
        <div>
          {/* Storage Dispatch Metrics */}
          <StorageMetricsCard province="ON" compact={true} />
        </div>
      </div>

      {/* 4-Panel Dashboard Grid */}
      {/* Transition KPIs / Analytics quick tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="card card-metric">
          <span className="metric-label">Total Generation</span>
          <span className="metric-value">
            {
              typeof totalGenerationMetric.value === 'number'
                ? Math.round(totalGenerationMetric.value).toLocaleString()
                : '—'
            } MWh
          </span>
          <div className="mt-2 flex justify-center">
            <DataFreshnessBadge
              timestamp={totalGenerationMetric.meta.lastUpdated}
              status={totalGenerationMetric.meta.freshnessStatus}
              source={totalGenerationMetric.meta.source}
              compact={true}
              showRelative={false}
            />
          </div>
        </div>
        <div className="card card-metric">
          <span className="metric-label">Top Source</span>
          <span className="metric-value">
            {topSourceMetric.value ?? '—'}
          </span>
          <div className="mt-2 flex justify-center">
            <DataFreshnessBadge
              timestamp={topSourceMetric.meta.lastUpdated}
              status={topSourceMetric.meta.freshnessStatus}
              source={topSourceMetric.meta.source}
              compact={true}
              showRelative={false}
            />
          </div>
        </div>
        <div className="card card-metric">
          <span className="metric-label">Renewable Share</span>
          <span className="metric-value">
            {typeof renewableShareMetric.value === 'number' ? `${renewableShareMetric.value.toFixed(1)}%` : '—'}
          </span>
          <div className="mt-2 flex justify-center">
            <DataFreshnessBadge
              timestamp={renewableShareMetric.meta.lastUpdated}
              status={renewableShareMetric.meta.freshnessStatus}
              source={renewableShareMetric.meta.source}
              compact={true}
              showRelative={false}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dashboard Header with Dark Card */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Database className="h-6 w-6 text-electric mr-3" />
                  <h2 className="card-title">Energy Operations Dashboard</h2>
                </div>
                <DataFreshnessBadge 
                  timestamp={trendDemandLastUpdated ?? lastUpdate}
                  staleThresholdMinutes={5}
                  showRefreshButton={true}
                  onRefresh={loadDashboardData}
                  isRefreshing={loading}
                  status={trendDemandFreshness ?? dashboardFreshnessMeta.freshnessStatus}
                  source={dashboardFreshnessMeta.source}
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className={`badge ${
                  connectionStatuses.some(s => s.status === 'connected' || s.status === 'fallback')
                    ? 'badge-success'
                    : connectionStatuses.some(s => s.status === 'connecting')
                      ? 'badge-warning'
                      : 'badge-danger'
                }`}>
                  <span className="flex items-center gap-1">
                    {connectionStatuses.some(s => s.status === 'connecting') && !connectionStatuses.some(s => s.status === 'connected' || s.status === 'fallback') ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        {connectionStatuses.filter(s => s.status === 'connected' || s.status === 'fallback').length}/{connectionStatuses.length} Connected
                      </>
                    )}
                  </span>
                </div>
                <HelpButton id="dashboard.overview" />
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className="card-metric">
                <span className="metric-label">Data Sources</span>
                <span className="metric-value">{displayedDataSources}</span>
              </div>
              <div className="card-metric">
                <span className="metric-label">Ontario Demand</span>
                <span className="metric-value">
                  {typeof currentDemand === 'number'
                    ? `${Math.round(currentDemand).toLocaleString()} MW`
                    : '—'}
                </span>
              </div>
              <div className="card-metric">
                <span className="metric-label">Alberta Price</span>
                <span className="metric-value">
                  {currentPrice !== null && currentPrice !== undefined ? `$${currentPrice.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Charts with Dark Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Panel 1: Ontario Hourly Demand */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  <Activity className="h-5 w-5 mr-2 text-electric" />
                  Ontario Hourly Demand
                </h3>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-primary">Ontario Demand</h2>
                      <p className="text-sm text-secondary">Current electricity demand</p>
                    </div>
                    <DataQualityBadge
                      provenance={createProvenance(
                        ontarioDemandStatus?.source === 'fallback' ? 'proxy_indicative' : 'real_stream',
                        ontarioDemandStatus?.source === 'fallback' ? 'Fallback Ontario demand sample' : 'IESO',
                        ontarioDemandStatus?.source === 'fallback' ? 0.65 : 0.95,
                        { completeness: Math.min(1, data.ontarioDemand.length / 96) }
                      )}
                      sampleCount={data.ontarioDemand.length}
                      showDetails={true}
                    />
                  </div>
                </div>
                <div className="text-right">
              <div className="text-sm text-secondary">Current Demand</div>
              <div className="text-lg font-semibold text-electric">
                {typeof currentDemand === 'number'
                  ? `${Math.round(currentDemand).toLocaleString()} MW`
                  : '—'}
              </div>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={CHART_CONFIGS.dashboard}>
                  <LineChart data={ontarioDemandChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="demand" stroke="var(--chart-electric)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <DataSource 
                  {...COMMON_DATA_SOURCES.IESO_DEMAND}
                  date={ontarioDemandStatus?.lastUpdate?.toISOString() ?? dashboardLastUpdatedIso ?? undefined}
                  compact={true}
                />
                <span className="text-xs text-slate-500">
                  {data.ontarioDemand.length > 0 
                    ? `${data.ontarioDemand.length} records`
                    : loading 
                      ? 'Loading...'
                      : 'Sample data'}
                </span>
              </div>
            </div>
          </div>

          {/* Panel 2: Provincial Generation Mix */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      <Zap className="h-5 w-5 mr-2 text-success" />
                      Provincial Generation Mix
                    </h3>
                    <DataQualityBadge
                      provenance={createProvenance(
                        provinceMetrics?.generation ? 'historical_archive' : 'proxy_indicative',
                        provinceMetrics?.generation ? 'Analytics API' : 'Fallback Sample',
                        provinceMetrics?.generation ? 0.92 : 0.65,
                        { completeness: provinceMetrics?.generation ? 0.95 : 0.80 }
                      )}
                      sampleCount={generationChartSeries.length}
                      showDetails={true}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm text-secondary">2-Day Total Generation</div>
                  <div className="text-lg font-semibold text-success">
                    {totalGenerationGwh !== null && totalGenerationGwh !== undefined && totalGenerationGwh > 0
                      ? `${Math.round(totalGenerationGwh).toLocaleString()} GWh`
                      : '—'}
                  </div>
                  {totalGenerationGwh === 0 && (
                    <div className="text-xs text-warning mt-1">⚠️ Awaiting live data</div>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={generationChartSeries} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="gwh" fill="var(--chart-renewable)" name="Generation (GWh)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <DataSource 
                  dataset="Provincial Generation Mix"
                  url="https://www.ieso.ca/en/Power-Data/Supply-Overview/Hourly-Ontario-Energy-Price"
                  date={provincialGenerationStatus?.lastUpdate?.toISOString() ?? dashboardLastUpdatedIso ?? undefined}
                  compact={true}
                />
                <span className="text-xs text-slate-500">
                  {data.provincialGeneration.length > 0 
                    ? `${data.provincialGeneration.length} records`
                    : loading 
                      ? 'Loading...'
                      : 'Sample data'}
                </span>
              </div>
            </div>
          </div>

          {/* Panel 3: Alberta Supply & Demand / Ontario Demand Trend */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  <Activity className="h-5 w-5 mr-2 text-electric" />
                  {hasDemandTrend ? 'Ontario Demand Trend' : 'Alberta Supply & Demand'}
                </h3>
                <div className="col-span-3 flex justify-end">
                  <HelpButton id="chart.alberta_supply_demand" />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-sm text-secondary">Supply</div>
                  <div className="text-lg font-semibold text-success">
                    {typeof currentSupply === 'number' ? `${Math.round(currentSupply).toLocaleString()} MW` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary">Demand</div>
                  <div className="text-lg font-semibold text-electric">
                    {typeof currentDemandAlberta === 'number'
                      ? `${Math.round(currentDemandAlberta).toLocaleString()} MW`
                      : hasDemandTrend && supplyDemandChartData.length
                        ? `${Math.round(supplyDemandChartData[0]?.demand ?? 0).toLocaleString()} MW`
                        : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary">Price</div>
                  <div className="text-lg font-semibold text-warning">
                    {typeof currentPrice === 'number' ? `$${currentPrice.toFixed(2)}` : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={supplyDemandChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {hasDemandTrend ? (
                      <Line type="monotone" dataKey="demand" stroke="var(--chart-electric)" strokeWidth={2} name="Ontario Demand" />
                    ) : (
                      <>
                        <Line type="monotone" dataKey="supply" stroke="var(--chart-industrial)" strokeWidth={2} name="Supply" />
                        <Line type="monotone" dataKey="demand" stroke="var(--chart-electric)" strokeWidth={2} name="Demand" />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                {!hasDemandTrend && (
                  <DataSource 
                    {...COMMON_DATA_SOURCES.AESO_DEMAND}
                    date={dashboardLastUpdatedIso ?? undefined}
                    compact={true}
                  />
                )}
                <span className="text-sm text-secondary">
                  {hasDemandTrend
                    ? `Trend: ${trendWindowStart} → ${trendWindowEnd} • ${trends?.metadata?.demand_sample_count ?? '—'} samples`
                    : `${data.ontarioPrices.length} records • ${sourceText('ontario_prices')}`}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* CTA to Analytics & Trends */}
        <div className="card flex items-center justify-between gap-md">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              Explore Historical Trends & AI Insights
            </h3>
            <p className="text-sm text-secondary">
              View 30-day trends, weather correlations, renewable penetration heatmaps, and AI-powered analytics
            </p>
          </div>
          <button
            onClick={() => window.location.assign('/analytics')}
            className="btn btn-primary"
          >
            <TrendingUp size={20} />
            View Analytics
          </button>
        </div>
      </div>

      </div>

      {/* Status Footer */}
      <div className="card mt-4 text-center">
        <div className="flex items-center justify-center gap-sm text-sm text-secondary">
          <div className="flex items-center gap-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span>
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Unknown'} • {loading ? 'Refreshing...' : kpiStatus === 'error' ? 'KPI unavailable - refresh needed' : isDataLive ? 'Live streaming active' : 'Data stale - refresh needed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
