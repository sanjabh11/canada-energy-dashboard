import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  TrendingUp, Download, Activity, BarChart3, Clock,
  Zap, ThermometerSun, Calendar, AlertTriangle, CheckCircle2,
  Loader, Info, ArrowUpRight, ArrowDownRight, Target,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { Link } from 'react-router-dom';
import {
  DemandForecaster,
  loadOntarioDemandData,
  computeDemandStats,
  forecastToCSV,
  type DemandRecord,
  type ForecastPoint,
  type ForecastMetrics,
  type SeasonalProfile,
} from '../lib/demandForecaster';
import { realDataService } from '../lib/realDataService';
import { evaluateForecastDrift, runMlForecast } from '../lib/mlForecastingClient';
import { backtestRareEventResampling } from '../lib/advancedForecasting';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'overview' | 'forecast' | 'decomposition' | 'accuracy';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DemandForecastDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DemandRecord[]>([]);
  const [forecaster] = useState(() => new DemandForecaster());
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [predictions, setPredictions] = useState<ForecastPoint[]>([]);
  const [seasonalProfile, setSeasonalProfile] = useState<SeasonalProfile | null>(null);
  const [horizonHours, setHorizonHours] = useState(168);
  const [testHours, setTestHours] = useState(168);
  const [mlDomain, setMlDomain] = useState<'load' | 'price_spike' | 'solar' | 'wind' | 'gas_basis' | 'byop_load' | 'pv_fault' | 'policy_overlay' | 'short_circuit'>('load');
  const [mlInsights, setMlInsights] = useState<any>(null);
  const [driftAssessment, setDriftAssessment] = useState<any>(null);

  const stats = useMemo(() => computeDemandStats(data), [data]);

  // Load data and train model
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const records = await loadOntarioDemandData();
        if (cancelled) return;
        if (records.length === 0) {
          setError('No Ontario demand data available. Check /data/ontario_demand_sample.json.');
          setLoading(false);
          return;
        }
        setData(records);

        // Backtest
        const result = forecaster.backtest(records, Math.min(testHours, Math.floor(records.length * 0.2)));
        if (cancelled) return;
        setMetrics(result.metrics);
        setPredictions(result.predictions);

        const state = forecaster.getModelState();
        if (state) {
          setSeasonalProfile(state.seasonal_profile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize forecaster');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [forecaster, testHours]);

  useEffect(() => {
    let cancelled = false;

    async function assessDrift() {
      if (data.length < 336) {
        setDriftAssessment(null);
        return;
      }

      const demandSeries = data.map((record) => Number(record.total_demand_mw)).filter(Number.isFinite);
      if (demandSeries.length < 336) {
        setDriftAssessment(null);
        return;
      }

      const recent = demandSeries.slice(-168);
      const baseline = demandSeries.slice(Math.max(0, demandSeries.length - 336), Math.max(0, demandSeries.length - 168));
      if (baseline.length < 24 || recent.length < 24) {
        setDriftAssessment(null);
        return;
      }

      const { data: driftResult } = await evaluateForecastDrift({
        domain: 'load',
        province: 'ON',
        model_key: 'ontario-demand-seasonal',
        threshold: 0.25,
        baseline: { demand_mw: baseline },
        recent: { demand_mw: recent },
      });

      if (!cancelled) setDriftAssessment(driftResult);
    }

    assessDrift().catch(() => {
      if (!cancelled) setDriftAssessment(null);
    });

    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleExportCSV = useCallback(() => {
    if (predictions.length === 0) return;
    const csv = forecastToCSV(predictions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ontario_demand_forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [predictions]);

  const handleOpenGasBasis = useCallback(() => {
    setActiveTab('forecast');
    setMlDomain('gas_basis');
  }, []);

  const handleRunForecast = useCallback(async () => {
    if (data.length === 0) return;
    try {
      forecaster.train(data);
      const forecastPoints = forecaster.forecast({
        horizon_hours: horizonHours,
        include_confidence_interval: false,
        confidence_level: 0.95,
        use_temperature: false,
      });
      setPredictions(forecastPoints);
      const state = forecaster.getModelState();
      if (state) setSeasonalProfile(state.seasonal_profile);
      const gasBasisHistory = mlDomain === 'gas_basis'
        ? await realDataService.getGasBasisHistory()
        : null;
      const { data: mlResult } = await runMlForecast({
        domain: mlDomain,
        province: mlDomain === 'load' ? 'ON' : 'AB',
        horizon_hours: Math.min(horizonHours, 168),
        scenario: mlDomain === 'gas_basis'
          ? {
            aecoCadPerGj: 1.62,
            henryHubCadPerGj: 3.08,
            pipelineCurtailmentPct: 8,
            storageDeficitPct: 11,
            temperatureC: -14,
            basisLag1: 1.42,
            basisLag7: 1.38,
            historyRows: gasBasisHistory?.rows ?? [],
            backtestRows: gasBasisHistory?.backtestRows ?? [],
            sourceProfile: gasBasisHistory?.sourceProfile ?? 'synthetic',
          }
          : mlDomain === 'byop_load'
            ? {
              baseLoadMw: Math.max(80, (forecastPoints[0]?.forecast_mw ?? 12000) / 100),
              flexibilityPct: 20,
              onSiteGenerationMw: 45,
              storageCapacityMwh: 180,
              storagePowerMw: 42,
              utilityImportCapMw: 110,
              priceSignalCadPerMwh: 155,
            }
            : mlDomain === 'pv_fault'
              ? {
                nodes: [
                  { id: 'inv-1', expectedOutputMw: 2.6, observedOutputMw: 1.1, voltageV: 540, inverterTempC: 61, irradiance: 780 },
                  { id: 'inv-2', expectedOutputMw: 2.4, observedOutputMw: 2.2, voltageV: 598, inverterTempC: 43, irradiance: 760 },
                  { id: 'inv-3', expectedOutputMw: 2.1, observedOutputMw: 1.6, voltageV: 565, inverterTempC: 57, irradiance: 740 },
                ],
                edges: [
                  { fromNodeId: 'inv-1', toNodeId: 'inv-2', weight: 1 },
                  { fromNodeId: 'inv-2', toNodeId: 'inv-3', weight: 1 },
                ],
              }
              : mlDomain === 'policy_overlay'
                ? {
                  assetLifeYears: 25,
                  emissionsIntensity: 540,
                  carbonPriceCadPerTonne: 95,
                  policyDeadlineYear: 2035,
                  ccusOptionalityScore: 0.35,
                  electrificationReadinessScore: 0.4,
                }
                : mlDomain === 'short_circuit'
                  ? {
                    shortCircuitLevelKa: 5.4,
                    minimumShortCircuitKa: 8,
                    inverterPenetrationPct: 42,
                    reserveMarginPercent: 6,
                    topology: {
                      nodes: [
                        { id: 'pincher-1', shortCircuitKa: 5.2 },
                        { id: 'pincher-2', shortCircuitKa: 6.1 },
                        { id: 'pincher-3', shortCircuitKa: 8.8 },
                      ],
                      edges: [
                        { fromNodeId: 'pincher-1', toNodeId: 'pincher-2', limitMw: 180, currentMw: 166 },
                        { fromNodeId: 'pincher-2', toNodeId: 'pincher-3', limitMw: 210, currentMw: 154 },
                      ],
                    },
                  }
                  : {
                    demandMw: forecastPoints[0]?.forecast_mw,
                    reserveMarginPercent: 8,
                    poolPriceCadPerMwh: 250,
                  },
      });
      const driftMultiplier = Number(driftAssessment?.confidenceMultiplier ?? 1);
      const warnings = Array.from(new Set([
        ...(Array.isArray(mlResult?.meta?.warnings) ? mlResult.meta.warnings : []),
        ...(driftAssessment?.status === 'drift_detected'
          ? [String(driftAssessment?.recommendation ?? 'Recent demand drift detected; forecast confidence downgraded.')]
          : []),
      ]));
      setMlInsights({
        ...mlResult,
        monitoring: driftAssessment,
        meta: {
          ...mlResult.meta,
          confidence_score: Math.max(0, Math.min(1, Number(mlResult?.meta?.confidence_score ?? 0) * driftMultiplier)),
          warnings,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Forecast failed');
    }
  }, [data, driftAssessment, forecaster, horizonHours, mlDomain]);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'forecast', label: 'Forecast', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'decomposition', label: 'Decomposition', icon: <Activity className="h-4 w-4" /> },
    { key: 'accuracy', label: 'Accuracy', icon: <Target className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Ontario Demand Forecasting | ML Load Prediction Engine"
        description="ML-powered Ontario electricity demand forecasting using seasonal decomposition. MAE, MAPE, RMSE accuracy metrics vs persistence and seasonal naive baselines. Trained on 175K+ IESO records."
        path="/demand-forecast"
        keywords={['Ontario demand forecast', 'electricity load prediction', 'IESO demand', 'energy forecasting ML', 'seasonal decomposition']}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Ontario Demand Forecasting
                </h1>
                <p className="text-emerald-100 text-sm md:text-base">
                  Seasonal decomposition model trained on {stats.count.toLocaleString()} IESO hourly records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DataFreshnessBadge
                snapshotDate={stats.date_range.end || 'N/A'}
                snapshotLabel="Training Data"
                isFallback
                source="Ontario sample/training dataset"
              />
              <button
                onClick={handleOpenGasBasis}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowUpRight className="h-4 w-4" />
                AECO / Henry Hub
              </button>
              <button
                onClick={handleExportCSV}
                disabled={predictions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader className="h-8 w-8 text-emerald-400 animate-spin" />
            <p className="text-slate-400">Loading Ontario demand data & training model...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold">Error</h3>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} metrics={metrics} data={data} />
            )}
            {activeTab === 'forecast' && (
              <ForecastTab
                predictions={predictions}
                horizonHours={horizonHours}
                setHorizonHours={setHorizonHours}
                onRunForecast={handleRunForecast}
                metrics={metrics}
              mlDomain={mlDomain}
              setMlDomain={setMlDomain}
              mlInsights={mlInsights}
              driftAssessment={driftAssessment}
            />
          )}
            {activeTab === 'decomposition' && (
              <DecompositionTab seasonalProfile={seasonalProfile} data={data} />
            )}
            {activeTab === 'accuracy' && (
              <AccuracyTab
                metrics={metrics}
                predictions={predictions}
                testHours={testHours}
                setTestHours={setTestHours}
              />
            )}
          </>
        )}

        {/* Cross-links */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link
            to="/forecast-benchmarking"
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors group"
          >
            <BarChart3 className="h-5 w-5 text-indigo-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-emerald-400">Forecast Benchmarking</h4>
            <p className="text-slate-500 text-xs mt-1">Evaluate renewable forecasts against baselines</p>
          </Link>
          <Link
            to="/regulatory-filing"
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors group"
          >
            <Calendar className="h-5 w-5 text-amber-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-emerald-400">Regulatory Filing</h4>
            <p className="text-slate-500 text-xs mt-1">AUC Rule 005 & OEB Chapter 5 export templates</p>
          </Link>
          <Link
            to="/asset-health"
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors group"
          >
            <Zap className="h-5 w-5 text-cyan-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-emerald-400">Asset Health Index</h4>
            <p className="text-slate-500 text-xs mt-1">CSV-based condition scoring for utility assets</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function OverviewTab({ stats, metrics, data }: {
  stats: ReturnType<typeof computeDemandStats>;
  metrics: ForecastMetrics | null;
  data: DemandRecord[];
}) {
  // Prepare daily average chart data (last 30 days)
  const dailyData = useMemo(() => {
    const byDate = new Map<string, { sum: number; count: number }>();
    data.forEach(r => {
      const date = r.date || r.datetime.slice(0, 10);
      const entry = byDate.get(date) || { sum: 0, count: 0 };
      entry.sum += r.total_demand_mw;
      entry.count++;
      byDate.set(date, entry);
    });
    return Array.from(byDate.entries())
      .map(([date, { sum, count }]) => ({
        date: date.slice(5), // MM-DD
        avg_demand_mw: Math.round(sum / count),
      }))
      .slice(-60);
  }, [data]);

  const rareEventBacktest = useMemo(() => backtestRareEventResampling([
    { x: 0.00, y: 0.05, failure: 0 },
    { x: 0.08, y: 0.12, failure: 0 },
    { x: 0.12, y: 0.09, failure: 0 },
    { x: 0.20, y: 0.16, failure: 0 },
    { x: 0.35, y: 0.22, failure: 0 },
    { x: 0.48, y: 0.30, failure: 0 },
    { x: 0.82, y: 0.84, failure: 1 },
    { x: 0.91, y: 0.95, failure: 1 },
  ], 'failure', { minorityLabel: 1, targetMinorityCount: 8 }), []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Training Records"
          value={stats.count.toLocaleString()}
          icon={<Activity className="h-5 w-5 text-emerald-400" />}
          sub={`${stats.date_range.start.slice(0, 10)} → ${stats.date_range.end.slice(0, 10)}`}
        />
        <StatCard
          label="Mean Demand"
          value={`${stats.mean_mw.toLocaleString()} MW`}
          icon={<Zap className="h-5 w-5 text-cyan-400" />}
          sub={`σ = ${stats.std_mw.toLocaleString()} MW`}
        />
        <StatCard
          label="Peak / Trough"
          value={`${stats.max_mw.toLocaleString()} / ${stats.min_mw.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5 text-amber-400" />}
          sub={`Peak hour: ${stats.peak_hour}:00 | Low: ${stats.trough_hour}:00`}
        />
        <StatCard
          label="Model Skill"
          value={metrics ? `${metrics.skill_score_vs_persistence}%` : 'N/A'}
          icon={<Target className="h-5 w-5 text-purple-400" />}
          sub={metrics ? `vs persistence (MAE: ${metrics.mae} MW)` : 'Training...'}
          positive={metrics ? metrics.skill_score_vs_persistence > 0 : undefined}
        />
      </div>

      {/* Methodology Card */}
      <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-white mb-2">Model Methodology</h3>
            <p className="text-slate-300 text-sm mb-3">
              This forecasting engine uses <strong>additive seasonal decomposition</strong> with linear trend extraction,
              trained on {stats.count.toLocaleString()} hourly IESO Ontario demand records. The model decomposes demand into:
            </p>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-800/60 rounded-lg p-3">
                <div className="text-emerald-400 font-medium mb-1">Trend</div>
                <div className="text-slate-400">Linear regression on time index</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3">
                <div className="text-cyan-400 font-medium mb-1">Hourly Season</div>
                <div className="text-slate-400">24-hour intraday demand profile</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3">
                <div className="text-amber-400 font-medium mb-1">Weekly Season</div>
                <div className="text-slate-400">Day-of-week (weekday vs weekend)</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3">
                <div className="text-purple-400 font-medium mb-1">Monthly Season</div>
                <div className="text-slate-400">Annual heating/cooling cycle</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Reference: Hyndman & Athanasopoulos, "Forecasting: Principles and Practice" (3rd ed.).
              Accuracy benchmarked vs persistence and seasonal naive baselines per industry standard.
            </p>
          </div>
        </div>
      </div>

      {/* Rare-Event Resampling */}
      <div className="bg-violet-950/30 border border-violet-500/30 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white mb-2">Rare-Event Resampling</h3>
            <p className="text-slate-300 text-sm">
              KMeans-SMOTE backtest summary for minority-event training slices. Synthetic rows are training-only and never shown as operational results.
            </p>
          </div>
          <div className="text-xs text-violet-200">
            {rareEventBacktest.modelVersion} · {rareEventBacktest.sourceProfile}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-violet-500/20 bg-slate-900/40 p-3">
            <div className="text-slate-400">Recall Before</div>
            <div className="text-white font-semibold">{(rareEventBacktest.before.recall * 100).toFixed(0)}%</div>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-slate-900/40 p-3">
            <div className="text-slate-400">Recall After</div>
            <div className="text-white font-semibold">{(rareEventBacktest.after.recall * 100).toFixed(0)}%</div>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-slate-900/40 p-3">
            <div className="text-slate-400">Recall Uplift</div>
            <div className="text-violet-100 font-semibold">{(rareEventBacktest.recallUplift * 100).toFixed(0)}%</div>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-slate-900/40 p-3">
            <div className="text-slate-400">F1 Uplift</div>
            <div className="text-violet-100 font-semibold">{((rareEventBacktest.after.f1 - rareEventBacktest.before.f1) * 100).toFixed(0)}%</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-violet-500/20 bg-slate-900/40 p-3 text-sm">
            <div className="text-slate-400 mb-1">Synthetic lineage</div>
            <div className="text-violet-100">
              {rareEventBacktest.syntheticLineage.map((cluster) => `cluster ${cluster.clusterIndex}: ${cluster.syntheticCount} synthetic / ${cluster.sourceCount} source`).join(' · ') || 'none'}
            </div>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-slate-900/40 p-3 text-sm">
            <div className="text-slate-400 mb-1">Backtest warnings</div>
            <div className="text-violet-100">
              {rareEventBacktest.warnings.join(' ') || 'No warnings emitted.'}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Demand Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Daily Average Demand (Last 60 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [`${value.toLocaleString()} MW`, 'Avg Demand']}
            />
            <Area
              type="monotone"
              dataKey="avg_demand_mw"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ForecastTab({ predictions, horizonHours, setHorizonHours, onRunForecast, metrics, mlDomain, setMlDomain, mlInsights, driftAssessment }: {
  predictions: ForecastPoint[];
  horizonHours: number;
  setHorizonHours: (h: number) => void;
  onRunForecast: () => void;
  metrics: ForecastMetrics | null;
  mlDomain: 'load' | 'price_spike' | 'solar' | 'wind' | 'gas_basis' | 'byop_load' | 'pv_fault' | 'policy_overlay' | 'short_circuit';
  setMlDomain: (domain: 'load' | 'price_spike' | 'solar' | 'wind' | 'gas_basis' | 'byop_load' | 'pv_fault' | 'policy_overlay' | 'short_circuit') => void;
  mlInsights: any;
  driftAssessment: any;
}) {
  const chartData = useMemo(() =>
    predictions.slice(0, 168).map(p => ({
      time: p.datetime.slice(5, 16).replace('T', ' '),
      actual: p.actual_mw,
      forecast: p.forecast_mw,
      persistence: p.persistence_mw,
      seasonal_naive: p.seasonal_naive_mw,
    })),
    [predictions]
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <label className="text-sm text-slate-300">Forecast Horizon:</label>
          <select
            value={horizonHours}
            onChange={e => setHorizonHours(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <option value={24}>24 hours (1 day)</option>
            <option value={48}>48 hours (2 days)</option>
            <option value={168}>168 hours (1 week)</option>
            <option value={336}>336 hours (2 weeks)</option>
            <option value={720}>720 hours (30 days)</option>
          </select>
        </div>
        <button
          onClick={onRunForecast}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Generate Forecast
        </button>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-400" />
          <label className="text-sm text-slate-300">ML Adapter:</label>
          <select
            value={mlDomain}
            onChange={e => setMlDomain(e.target.value as 'load' | 'price_spike' | 'solar' | 'wind' | 'gas_basis' | 'byop_load' | 'pv_fault' | 'policy_overlay' | 'short_circuit')}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="load">Load + SVM-RFE</option>
            <option value="price_spike">AB Price Spike</option>
            <option value="solar">Solar Drift-Ready</option>
            <option value="wind">Wind Drift-Ready</option>
            <option value="gas_basis">AECO vs Henry Hub</option>
            <option value="byop_load">BYOP MAS</option>
            <option value="pv_fault">PV Fault Graph</option>
            <option value="policy_overlay">Policy Overlay</option>
            <option value="short_circuit">Weak Grid / SCED</option>
          </select>
        </div>
      </div>

      {mlInsights?.meta && (
        <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold">ML Governance Adapter</h3>
              <p className="text-sm text-slate-400">
                {mlInsights.meta.model_version} · confidence {(mlInsights.meta.confidence_score * 100).toFixed(0)}% · {mlInsights.meta.staleness_status}
              </p>
            </div>
            <div className="text-xs text-cyan-200">
              {mlInsights.feature_ranking?.retainedFeatures?.length
                ? `Retained features: ${mlInsights.feature_ranking.retainedFeatures.join(', ')}`
                : 'No retained feature artifact available'}
            </div>
          </div>
          {driftAssessment?.status && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${driftAssessment.status === 'drift_detected'
              ? 'border-amber-500/40 bg-amber-950/20 text-amber-100'
              : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
              }`}>
              {driftAssessment.status === 'drift_detected' ? 'Recent demand drift detected.' : 'No demand drift detected.'} {driftAssessment.recommendation}
            </div>
          )}
          {mlInsights.meta.warnings?.map((warning: string) => (
            <p key={warning} className="mt-2 text-xs text-amber-200">{warning}</p>
          ))}
          {mlInsights.feature_ranking?.trainingSummary && (
            <div className="mt-4 grid md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Training Samples</div>
                <div className="text-white font-semibold">{Number(mlInsights.feature_ranking.trainingSummary.samples ?? 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Positive Rate</div>
                <div className="text-white font-semibold">{(Number(mlInsights.feature_ranking.trainingSummary.positiveRate ?? 0) * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Target Threshold</div>
                <div className="text-cyan-100">{Number(mlInsights.feature_ranking.trainingSummary.targetThreshold ?? 0).toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Margin</div>
                <div className="text-cyan-100">{Number(mlInsights.feature_ranking.trainingSummary.margin ?? 0).toFixed(3)}</div>
              </div>
            </div>
          )}
          {mlInsights.feature_ranking?.droppedFeatures?.length > 0 && (
            <p className="mt-3 text-xs text-slate-300">
              Dropped features: {mlInsights.feature_ranking.droppedFeatures.slice(0, 4).map((feature: any) => `${feature.feature} (${feature.reason})`).join(', ')}
            </p>
          )}
          {mlInsights.analysis?.predictedSpreadCadPerGj != null && (
            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Predicted Spread</div>
                <div className="text-white font-semibold">{mlInsights.analysis.predictedSpreadCadPerGj.toFixed(2)} CAD/GJ</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Widening Risk</div>
                <div className="text-white font-semibold">{(mlInsights.analysis.wideningRisk * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Drivers</div>
                <div className="text-cyan-100">{(mlInsights.analysis.drivers ?? []).join(', ') || 'n/a'}</div>
              </div>
            </div>
          )}
          {mlInsights.analysis?.backtest && (
            <div className="mt-4 grid md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Backtest Samples</div>
                <div className="text-white font-semibold">{Number(mlInsights.analysis.backtest.sampleCount ?? 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">MAE</div>
                <div className="text-white font-semibold">{Number(mlInsights.analysis.backtest.maeCadPerGj ?? 0).toFixed(3)} CAD/GJ</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Directional Accuracy</div>
                <div className="text-cyan-100">{(Number(mlInsights.analysis.backtest.directionalAccuracy ?? 0) * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Source Profile</div>
                <div className="text-cyan-100">{mlInsights.analysis.backtest.sourceProfile}</div>
              </div>
            </div>
          )}
          {mlInsights.analysis?.peakImportMw != null && (
            <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Peak Import</div>
                <div className="text-white font-semibold">{mlInsights.analysis.peakImportMw.toFixed(1)} MW</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Grid Reduction</div>
                <div className="text-white font-semibold">{mlInsights.analysis.gridReductionMw.toFixed(1)} MW</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Policy Sensitivity</div>
                <div className="text-cyan-100">{(mlInsights.analysis.policySensitivity * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Utility Import Cap</div>
                <div className="text-cyan-100">{Number(mlInsights.analysis.agentSummary?.utility?.importCapMw ?? 0).toFixed(1)} MW</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Agent Steps</div>
                <div className="text-cyan-100">{Number(mlInsights.analysis.aggregateLoadSeries?.length ?? 0).toLocaleString()} hours</div>
              </div>
            </div>
          )}
          {mlInsights.analysis?.nodeAssessments?.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-slate-900/40 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-slate-400">Weak-grid node tagging</div>
                  <div className="text-white font-semibold">{(mlInsights.analysis.nodeAssessments.filter((node: any) => node.flagged).length)} tagged node(s)</div>
                </div>
                <div className="text-xs text-amber-200">
                  {mlInsights.analysis.alertCondition ?? 'monitor'}
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(mlInsights.analysis.nodeAssessments ?? []).slice(0, 4).map((node: any) => (
                  <div key={node.nodeId} className="rounded-lg border border-amber-500/20 bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{node.nodeId}</span>
                      <span className="text-amber-200">{Number(node.shortCircuitKa ?? 0).toFixed(1)} kA</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {node.riskBand} · {(node.ruleTags ?? []).join(', ') || 'no rule tags'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-amber-200">
                AESO rule mappings: {(mlInsights.analysis.ruleMappings ?? []).filter((rule: any) => rule.triggered).map((rule: any) => rule.ruleLabel).join(', ') || 'none'}
              </div>
            </div>
          )}
          {mlInsights.analysis?.faultClass && (
            <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Fault Class</div>
                <div className="text-white font-semibold">{mlInsights.analysis.faultClass}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Top Suspects</div>
                <div className="text-cyan-100">{(mlInsights.analysis.topSuspects ?? []).map((suspect: any) => suspect.nodeId).join(', ') || 'n/a'}</div>
              </div>
            </div>
          )}
          {mlInsights.analysis?.topEdges?.length > 0 && (
            <p className="mt-3 text-xs text-slate-300">
              Top fault edges: {mlInsights.analysis.topEdges.slice(0, 3).map((edge: any) => `${edge.fromNodeId}->${edge.toNodeId}`).join(', ')}
            </p>
          )}
          {mlInsights.analysis?.strandedAssetRiskScore != null && (
            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Stranded Asset Risk</div>
                <div className="text-white font-semibold">{(mlInsights.analysis.strandedAssetRiskScore * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Dominant Driver</div>
                <div className="text-white font-semibold">{mlInsights.analysis.dominantDriver}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Horizon</div>
                <div className="text-cyan-100">{mlInsights.analysis.horizonYears} years</div>
              </div>
            </div>
          )}
          {mlInsights.analysis?.shortCircuitLevelKa != null && (
            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Short-Circuit Strength</div>
                <div className="text-white font-semibold">{mlInsights.analysis.shortCircuitLevelKa.toFixed(1)} kA</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Weak Grid Risk</div>
                <div className="text-white font-semibold">{(mlInsights.analysis.weakGridRiskScore * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Weak Nodes</div>
                <div className="text-cyan-100">{(mlInsights.analysis.weakNodes ?? []).join(', ') || 'n/a'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forecast vs Actual Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">
          Forecast vs Baselines {predictions[0]?.actual_mw !== null && '(Backtest)'}
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} interval={23} angle={-30} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number | null) => value !== null ? [`${value?.toLocaleString()} MW`] : ['N/A']}
              />
              <Legend />
              {chartData[0]?.actual !== null && (
                <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2} dot={false} name="Actual" />
              )}
              <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} dot={false} name="Model Forecast" />
              <Line type="monotone" dataKey="persistence" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Persistence" />
              <Line type="monotone" dataKey="seasonal_naive" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Seasonal Naive" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Click "Generate Forecast" to produce predictions
          </div>
        )}
      </div>

      {/* Quick Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Model MAE" value={`${metrics.mae} MW`} baseline={`Persist: ${metrics.persistence_mae} MW`} better={metrics.mae < metrics.persistence_mae} />
          <MetricCard label="Model MAPE" value={`${metrics.mape}%`} baseline={`Persist: ${metrics.persistence_mape}%`} better={metrics.mape < metrics.persistence_mape} />
          <MetricCard label="Model RMSE" value={`${metrics.rmse} MW`} baseline={`Persist: ${metrics.persistence_rmse} MW`} better={metrics.rmse < metrics.persistence_rmse} />
          <MetricCard label="R²" value={`${metrics.r_squared}`} baseline={`n = ${metrics.sample_size}`} better={metrics.r_squared > 0.5} />
        </div>
      )}
    </div>
  );
}

function DecompositionTab({ seasonalProfile, data }: {
  seasonalProfile: SeasonalProfile | null;
  data: DemandRecord[];
}) {
  const hourlyData = useMemo(() => {
    if (!seasonalProfile) return [];
    return seasonalProfile.hourly.map((v, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      effect_mw: Math.round(v),
    }));
  }, [seasonalProfile]);

  const weeklyData = useMemo(() => {
    if (!seasonalProfile) return [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return seasonalProfile.weekly.map((v, i) => ({
      day: dayNames[i],
      effect_mw: Math.round(v),
    }));
  }, [seasonalProfile]);

  const monthlyData = useMemo(() => {
    if (!seasonalProfile) return [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return seasonalProfile.monthly.map((v, i) => ({
      month: monthNames[i],
      effect_mw: Math.round(v),
    }));
  }, [seasonalProfile]);

  if (!seasonalProfile) {
    return <div className="text-slate-500 text-center py-12">Model not yet trained</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
        <p className="text-slate-300 text-sm">
          Seasonal decomposition breaks Ontario demand into additive components.
          Each chart shows the <strong>deviation from trend</strong> attributable to that seasonal factor.
          Positive values = demand above trend, negative = below.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Hourly Profile */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            Hourly Seasonality (24h Profile)
          </h3>
          <p className="text-slate-500 text-xs mb-4">Intraday demand pattern — peak vs off-peak</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={3} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toLocaleString()} MW`, 'Effect']}
              />
              <Bar dataKey="effect_mw" fill="#06b6d4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Profile */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Day-of-Week Seasonality
          </h3>
          <p className="text-slate-500 text-xs mb-4">Weekday vs weekend demand pattern</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toLocaleString()} MW`, 'Effect']}
              />
              <Bar dataKey="effect_mw" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Profile — Full Width */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <ThermometerSun className="h-4 w-4 text-purple-400" />
          Monthly Seasonality (Annual Cycle)
        </h3>
        <p className="text-slate-500 text-xs mb-4">Heating (winter) and cooling (summer) demand drivers</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toLocaleString()} MW`, 'Effect']}
            />
            <Area type="monotone" dataKey="effect_mw" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AccuracyTab({ metrics, predictions, testHours, setTestHours }: {
  metrics: ForecastMetrics | null;
  predictions: ForecastPoint[];
  testHours: number;
  setTestHours: (h: number) => void;
}) {
  const radarData = useMemo(() => {
    if (!metrics) return [];
    return [
      { metric: 'MAE', model: normalize(metrics.mae, metrics.persistence_mae), persistence: 100, seasonal: normalize(metrics.seasonal_naive_mae, metrics.persistence_mae) },
      { metric: 'MAPE', model: normalize(metrics.mape, metrics.persistence_mape), persistence: 100, seasonal: normalize(metrics.seasonal_naive_mape, metrics.persistence_mape) },
      { metric: 'RMSE', model: normalize(metrics.rmse, metrics.persistence_rmse), persistence: 100, seasonal: normalize(metrics.seasonal_naive_rmse, metrics.persistence_rmse) },
    ];
  }, [metrics]);

  // Error distribution
  const errorDist = useMemo(() => {
    const errors = predictions
      .filter(p => p.actual_mw !== null)
      .map(p => p.forecast_mw - p.actual_mw!);
    if (errors.length === 0) return [];

    const bucketSize = 200;
    const buckets = new Map<number, number>();
    errors.forEach(e => {
      const bucket = Math.round(e / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, count]) => ({
        error_mw: bucket,
        count,
      }));
  }, [predictions]);

  if (!metrics) {
    return <div className="text-slate-500 text-center py-12">No accuracy metrics available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Test config */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-300">Holdout period:</label>
        <select
          value={testHours}
          onChange={e => setTestHours(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={24}>24h (1 day)</option>
          <option value={168}>168h (1 week)</option>
          <option value={336}>336h (2 weeks)</option>
          <option value={720}>720h (30 days)</option>
        </select>
        <span className="text-xs text-slate-500">
          Backtest: train on all data except last {testHours}h, evaluate on holdout
        </span>
      </div>

      {/* Metrics Comparison Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left text-slate-300 px-4 py-3 font-medium">Metric</th>
              <th className="text-right text-emerald-400 px-4 py-3 font-medium">Model</th>
              <th className="text-right text-red-400 px-4 py-3 font-medium">Persistence</th>
              <th className="text-right text-purple-400 px-4 py-3 font-medium">Seasonal Naive</th>
              <th className="text-right text-slate-300 px-4 py-3 font-medium">Skill Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            <MetricRow label="MAE (MW)" model={metrics.mae} persistence={metrics.persistence_mae} seasonal={metrics.seasonal_naive_mae} />
            <MetricRow label="MAPE (%)" model={metrics.mape} persistence={metrics.persistence_mape} seasonal={metrics.seasonal_naive_mape} />
            <MetricRow label="RMSE (MW)" model={metrics.rmse} persistence={metrics.persistence_rmse} seasonal={metrics.seasonal_naive_rmse} />
            <tr>
              <td className="px-4 py-3 text-slate-300 font-medium">R²</td>
              <td className="px-4 py-3 text-right text-emerald-400 font-mono">{metrics.r_squared}</td>
              <td className="px-4 py-3 text-right text-slate-500">—</td>
              <td className="px-4 py-3 text-right text-slate-500">—</td>
              <td className="px-4 py-3 text-right text-slate-500">—</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-300 font-medium">Sample Size</td>
              <td className="px-4 py-3 text-right text-white font-mono" colSpan={4}>{metrics.sample_size.toLocaleString()} hours</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Model vs Baselines (Normalized)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
              <PolarRadiusAxis stroke="#475569" fontSize={10} />
              <Radar name="Model" dataKey="model" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Radar name="Persistence" dataKey="persistence" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
              <Radar name="Seasonal" dataKey="seasonal" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-2">Lower is better. Values normalized to persistence = 100.</p>
        </div>

        {/* Error Distribution */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Forecast Error Distribution</h3>
          {errorDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={errorDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="error_mw" stroke="#94a3b8" fontSize={10} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  formatter={(value: number) => [value, 'Count']}
                  labelFormatter={v => `Error: ${Number(v) > 0 ? '+' : ''}${v} MW`}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-slate-500 text-center py-12">No backtest errors to display</div>
          )}
          <p className="text-xs text-slate-500 mt-2">Centered near 0 = unbiased. Tight spread = precise.</p>
        </div>
      </div>

      {/* Skill Score Summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Skill Score Interpretation</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <SkillBar label="vs Persistence Baseline" value={metrics.skill_score_vs_persistence} />
          <SkillBar label="vs Seasonal Naive" value={metrics.skill_score_vs_seasonal} />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Skill Score = (1 - Model_MAE / Baseline_MAE) × 100. Positive = model outperforms baseline.
          &gt;20% is considered meaningful improvement for load forecasting (Hyndman & Fan, 2010).
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED UI PRIMITIVES
// ============================================================================

function StatCard({ label, value, icon, sub, positive }: {
  label: string; value: string; icon: React.ReactNode; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-medium uppercase">{label}</span>
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white text-lg font-bold">{value}</span>
        {positive !== undefined && (
          positive
            ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            : <ArrowDownRight className="h-4 w-4 text-red-400" />
        )}
      </div>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function MetricCard({ label, value, baseline, better }: {
  label: string; value: string; baseline: string; better: boolean;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs font-medium uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold ${better ? 'text-emerald-400' : 'text-red-400'}`}>{value}</p>
      <p className="text-slate-500 text-xs mt-1">{baseline}</p>
      <div className="flex items-center gap-1 mt-1">
        {better
          ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400 text-xs">Beats baseline</span></>
          : <><AlertTriangle className="h-3 w-3 text-red-400" /><span className="text-red-400 text-xs">Below baseline</span></>
        }
      </div>
    </div>
  );
}

function MetricRow({ label, model, persistence, seasonal }: {
  label: string; model: number; persistence: number; seasonal: number;
}) {
  const bestOfBaselines = Math.min(persistence, seasonal);
  const skill = bestOfBaselines > 0 ? ((1 - model / bestOfBaselines) * 100).toFixed(1) : '—';
  const isBetter = model < bestOfBaselines;
  return (
    <tr>
      <td className="px-4 py-3 text-slate-300 font-medium">{label}</td>
      <td className={`px-4 py-3 text-right font-mono ${isBetter ? 'text-emerald-400' : 'text-red-400'}`}>{model}</td>
      <td className="px-4 py-3 text-right font-mono text-red-400">{persistence}</td>
      <td className="px-4 py-3 text-right font-mono text-purple-400">{seasonal}</td>
      <td className={`px-4 py-3 text-right font-mono ${isBetter ? 'text-emerald-400' : 'text-amber-400'}`}>{skill}%</td>
    </tr>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  const width = Math.min(Math.max(value + 50, 0), 100); // map -50..+50 to 0..100
  const color = value > 20 ? 'bg-emerald-500' : value > 0 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-300 text-sm">{label}</span>
        <span className={`text-sm font-bold ${value > 20 ? 'text-emerald-400' : value > 0 ? 'text-amber-400' : 'text-red-400'}`}>
          {value > 0 ? '+' : ''}{value}%
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function normalize(value: number, baseline: number): number {
  return baseline > 0 ? Math.round((value / baseline) * 100) : 0;
}

export default DemandForecastDashboard;
