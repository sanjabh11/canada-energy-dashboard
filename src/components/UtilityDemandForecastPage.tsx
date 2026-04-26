import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Map,
  Shield,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { ProvenanceBadge } from './ProvenanceBadge';
import { DataTrustNotice } from './DataTrustNotice';
import {
  buildUtilityForecastPackage,
  buildUtilityStarterCsv,
  generateUtilityLoadSampleRows,
  parseUtilityHistoricalLoadCsv,
  utilityForecastPackageToAlbertaCsv,
  utilityForecastPackageToCsv,
  type UtilityForecastPackage,
  type UtilityInputGranularity,
  type UtilityJurisdiction,
  type UtilityPlanningScenario,
} from '../lib/utilityForecasting';
import { REGULATORY_TEMPLATES, templateToCSV } from '../lib/regulatoryTemplates';

function createDefaultScenario(jurisdiction: UtilityJurisdiction): UtilityPlanningScenario {
  return {
    jurisdiction,
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: jurisdiction === 'Ontario' ? 1.45 : 1.65,
    committed_load_mw: jurisdiction === 'Ontario' ? 4 : 6,
    ev_growth_mw: jurisdiction === 'Ontario' ? 3.5 : 2.5,
    heat_pump_growth_mw: jurisdiction === 'Ontario' ? 2.8 : 1.4,
    der_offset_mw: jurisdiction === 'Ontario' ? 1.6 : 2.1,
    demand_response_reduction_mw: jurisdiction === 'Ontario' ? 1.2 : 1.4,
    demand_response_shift_pct: jurisdiction === 'Ontario' ? 4 : 5,
    capacity_buffer_pct: 18,
  };
}

const UtilityDemandForecastPage: React.FC = () => {
  const [jurisdiction, setJurisdiction] = useState<UtilityJurisdiction>('Ontario');
  const [rows, setRows] = useState(() => generateUtilityLoadSampleRows('Ontario', 'hourly'));
  const [sourceLabel, setSourceLabel] = useState('Ontario starter utility load dataset');
  const [isSampleData, setIsSampleData] = useState(true);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [draftScenario, setDraftScenario] = useState<UtilityPlanningScenario>(() => createDefaultScenario('Ontario'));
  const [activeScenario, setActiveScenario] = useState<UtilityPlanningScenario>(() => createDefaultScenario('Ontario'));
  const [selectedHorizon, setSelectedHorizon] = useState(5);

  const forecastState = useMemo(() => {
    try {
      return {
        forecastPackage: buildUtilityForecastPackage({
          rows,
          scenario: activeScenario,
          sourceLabel,
          isSampleData,
        }),
        error: null as string | null,
      };
    } catch (error) {
      return {
        forecastPackage: null as UtilityForecastPackage | null,
        error: error instanceof Error ? error.message : 'Failed to build utility forecast package.',
      };
    }
  }, [activeScenario, isSampleData, rows, sourceLabel]);

  const chartData = useMemo(() => {
    if (!forecastState.forecastPackage) return [];
    return forecastState.forecastPackage.cases.expected.yearly.map((expectedYear) => ({
      year: `Y${expectedYear.year}`,
      low: forecastState.forecastPackage?.cases.low.yearly.find((row) => row.year === expectedYear.year)?.peak_demand_mw ?? 0,
      expected: expectedYear.peak_demand_mw,
      high: forecastState.forecastPackage?.cases.high.yearly.find((row) => row.year === expectedYear.year)?.peak_demand_mw ?? 0,
      energy: expectedYear.annual_energy_gwh,
    }));
  }, [forecastState.forecastPackage]);

  const highlightedRows = useMemo(() => {
    if (!forecastState.forecastPackage) return [];
    return forecastState.forecastPackage.highlighted_years.map((year) => ({
      year,
      low: forecastState.forecastPackage?.cases.low.yearly.find((row) => row.year === year),
      expected: forecastState.forecastPackage?.cases.expected.yearly.find((row) => row.year === year),
      high: forecastState.forecastPackage?.cases.high.yearly.find((row) => row.year === year),
    })).filter((row) => row.low && row.expected && row.high);
  }, [forecastState.forecastPackage]);

  const selectedAllocations = useMemo(() => {
    if (!forecastState.forecastPackage) return [];
    return forecastState.forecastPackage.geography_allocations
      .filter((allocation) => allocation.horizon_year === selectedHorizon)
      .sort((left, right) => right.peak_demand_mw - left.peak_demand_mw);
  }, [forecastState.forecastPackage, selectedHorizon]);

  const activeGranularity = forecastState.forecastPackage?.summary.granularity ?? 'hourly';

  function loadStarterDataset(nextJurisdiction: UtilityJurisdiction, granularity: UtilityInputGranularity) {
    setJurisdiction(nextJurisdiction);
    setRows(generateUtilityLoadSampleRows(nextJurisdiction, granularity));
    setSourceLabel(`${nextJurisdiction} starter utility load dataset`);
    setIsSampleData(true);
    setParseErrors([]);
    const defaults = createDefaultScenario(nextJurisdiction);
    setDraftScenario(defaults);
    setActiveScenario(defaults);
    setSelectedHorizon(5);
  }

  function handleRunForecast() {
    setActiveScenario({ ...draftScenario, jurisdiction });
  }

  function handleJurisdictionChange(nextJurisdiction: UtilityJurisdiction) {
    if (isSampleData) {
      loadStarterDataset(nextJurisdiction, activeGranularity);
      return;
    }
    setJurisdiction(nextJurisdiction);
    setDraftScenario((current) => ({ ...current, jurisdiction: nextJurisdiction }));
    setActiveScenario((current) => ({ ...current, jurisdiction: nextJurisdiction }));
  }

  function handleScenarioField<K extends keyof UtilityPlanningScenario>(key: K, value: UtilityPlanningScenario[K]) {
    setDraftScenario((current) => ({ ...current, [key]: value }));
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result ?? '');
      const parsed = parseUtilityHistoricalLoadCsv(text);
      setParseErrors(parsed.errors);
      if (parsed.rows.length === 0) {
        return;
      }

      setRows(parsed.rows);
      setSourceLabel(file.name);
      setIsSampleData(false);
    };
    reader.readAsText(file);
  }

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const exportGenericPack = () => {
    if (!forecastState.forecastPackage) return;
    downloadTextFile(
      `${jurisdiction.toLowerCase()}_utility_forecast_pack.csv`,
      utilityForecastPackageToCsv(forecastState.forecastPackage),
    );
  };

  const exportJurisdictionPack = () => {
    if (!forecastState.forecastPackage) return;
    if (jurisdiction === 'Ontario') {
      downloadTextFile(
        'oeb_chapter5_load_forecast.csv',
        templateToCSV(
          REGULATORY_TEMPLATES.oeb_dsp_load_forecast,
          forecastState.forecastPackage.oeb_rows as unknown as Record<string, unknown>[],
        ),
      );
      return;
    }

    downloadTextFile(
      'alberta_utility_planning_summary.csv',
      utilityForecastPackageToAlbertaCsv(forecastState.forecastPackage),
    );
  };

  const exportStarterTemplate = (granularity: UtilityInputGranularity) => {
    downloadTextFile(
      `${jurisdiction.toLowerCase()}_${granularity}_starter_template.csv`,
      buildUtilityStarterCsv(jurisdiction, granularity),
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Utility Demand Forecasting | Distribution Planning Lane"
        description="Utility-focused demand forecasting for Ontario LDCs and Alberta utilities. Upload historical load data, benchmark against persistence and seasonal-naive baselines, and export filing-ready planning packs."
        path="/utility-demand-forecast"
        keywords={['utility demand forecasting', 'distribution planning', 'OEB Chapter 5', 'AUC Rule 005', 'load forecast benchmark']}
      />

      <div className="bg-gradient-to-r from-sky-800 via-cyan-800 to-emerald-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">Utility Demand Forecasting Lane</h1>
                <p className="text-sm text-cyan-100 md:text-base">
                  Statistical, upload-first planning workflows for utilities, not grid-operator analytics.
                </p>
              </div>
            </div>

            {forecastState.forecastPackage && (
              <div className="flex flex-wrap items-center gap-3">
                <DataFreshnessBadge
                  snapshotDate={forecastState.forecastPackage.summary.date_range.end}
                  snapshotLabel="Historical load window"
                  isFallback={isSampleData}
                  source={sourceLabel}
                />
                <button
                  onClick={exportGenericPack}
                  className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
                >
                  <Download className="h-4 w-4" />
                  Export Forecast Pack
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {isSampleData && (
          <DataTrustNotice
            mode="mock"
            title="Starter utility dataset loaded"
            message="This route defaults to a local utility starter dataset so new buyers can validate the workflow without touching advanced operator or AI surfaces."
            className="mb-6"
          />
        )}

        {forecastState.error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/20 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
            <div>
              <h2 className="font-semibold text-red-300">Forecast package unavailable</h2>
              <p className="mt-1 text-sm text-slate-300">{forecastState.error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">1. Choose utility profile</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Keep the broader platform intact and run the utility-specific planning workflow here.
                  </p>
                </div>
                <Shield className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {(['Ontario', 'Alberta'] as UtilityJurisdiction[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => handleJurisdictionChange(option)}
                    className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                      jurisdiction === option
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="font-medium">{option}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {option === 'Ontario' ? 'OEB Chapter 5 aligned language' : 'AUC / Alberta utility planning aligned language'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => loadStarterDataset(jurisdiction, 'hourly')}
                  className="rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
                >
                  Load {jurisdiction} hourly starter
                </button>
                <button
                  onClick={() => loadStarterDataset(jurisdiction, 'monthly')}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
                >
                  Load {jurisdiction} monthly starter
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">2. Import utility load history</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Local-first CSV import for feeder, substation, or system load history.
                  </p>
                </div>
                <Upload className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 p-5">
                <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
                  <Upload className="h-8 w-8 text-cyan-300" />
                  <div>
                    <div className="font-medium text-white">Upload historical load CSV</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Required: timestamp and demand. Optional: geography, customer class, weather zone, temperature, net/gross load.
                    </div>
                  </div>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                  <span className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white">Select CSV</span>
                </label>
              </div>

              {parseErrors.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4 text-sm text-amber-100">
                  <div className="font-medium">Import warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                    {parseErrors.slice(0, 5).map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => exportStarterTemplate('hourly')}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-cyan-500/50"
                >
                  <div className="font-medium">Download hourly starter CSV</div>
                  <div className="mt-1 text-xs text-slate-500">For interval-level feeder or substation history</div>
                </button>
                <button
                  onClick={() => exportStarterTemplate('monthly')}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-cyan-500/50"
                >
                  <div className="font-medium">Download monthly starter CSV</div>
                  <div className="mt-1 text-xs text-slate-500">For planning-timescale utility history</div>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">3. Set future expectations</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Build planning cases using committed load, electrification, DER, and demand-response overlays.
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-sky-300" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Weather case">
                  <select
                    value={draftScenario.weather_case}
                    onChange={(event) => handleScenarioField('weather_case', event.target.value as UtilityPlanningScenario['weather_case'])}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="median">Median weather</option>
                    <option value="extreme">Extreme weather</option>
                  </select>
                </Field>
                <Field label="Annual load growth (%)">
                  <NumberInput value={draftScenario.annual_load_growth_pct} onChange={(value) => handleScenarioField('annual_load_growth_pct', value)} />
                </Field>
                <Field label="Committed load (MW)">
                  <NumberInput value={draftScenario.committed_load_mw} onChange={(value) => handleScenarioField('committed_load_mw', value)} />
                </Field>
                <Field label="EV growth (MW)">
                  <NumberInput value={draftScenario.ev_growth_mw} onChange={(value) => handleScenarioField('ev_growth_mw', value)} />
                </Field>
                <Field label="Heat-pump growth (MW)">
                  <NumberInput value={draftScenario.heat_pump_growth_mw} onChange={(value) => handleScenarioField('heat_pump_growth_mw', value)} />
                </Field>
                <Field label="DER offset (MW)">
                  <NumberInput value={draftScenario.der_offset_mw} onChange={(value) => handleScenarioField('der_offset_mw', value)} />
                </Field>
                <Field label="Demand-response reduction (MW)">
                  <NumberInput value={draftScenario.demand_response_reduction_mw} onChange={(value) => handleScenarioField('demand_response_reduction_mw', value)} />
                </Field>
                <Field label="Demand-response shift (%)">
                  <NumberInput value={draftScenario.demand_response_shift_pct} onChange={(value) => handleScenarioField('demand_response_shift_pct', value)} />
                </Field>
              </div>

              <button
                onClick={handleRunForecast}
                className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                Run utility forecast pack
              </button>
            </div>
          </section>

          <section className="space-y-6">
            {forecastState.forecastPackage && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Intervals" value={forecastState.forecastPackage.summary.interval_count.toLocaleString()} sub={`${activeGranularity} history`} icon={<Calendar className="h-5 w-5 text-cyan-300" />} />
                  <MetricCard label="Peak baseline" value={`${forecastState.forecastPackage.summary.baseline_peak_mw.toFixed(1)} MW`} sub={`${forecastState.forecastPackage.summary.geography_count} geographies`} icon={<Zap className="h-5 w-5 text-amber-300" />} />
                  <MetricCard label="Annual energy" value={`${forecastState.forecastPackage.summary.baseline_energy_gwh.toFixed(1)} GWh`} sub={`${forecastState.forecastPackage.summary.customer_classes.length} customer classes`} icon={<BarChart3 className="h-5 w-5 text-emerald-300" />} />
                  <MetricCard label="Model skill" value={`${forecastState.forecastPackage.benchmark.skill_score_vs_persistence.toFixed(1)}%`} sub="vs persistence" icon={<TrendingUp className="h-5 w-5 text-sky-300" />} />
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-forecast-benchmark-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Benchmark proof pack</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Every utility run shows the baseline comparison, provenance, assumptions, and scenario deltas.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <ProvenanceBadge type={forecastState.forecastPackage.provenance.type} source={forecastState.forecastPackage.source_label} compact />
                      <span className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
                        Weather: {forecastState.forecastPackage.scenario.weather_case}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <BenchmarkStat label="MAE" value={forecastState.forecastPackage.benchmark.mae} baseline={forecastState.forecastPackage.benchmark.persistence_mae} />
                    <BenchmarkStat label="MAPE" value={forecastState.forecastPackage.benchmark.mape} baseline={forecastState.forecastPackage.benchmark.persistence_mape} suffix="%" />
                    <BenchmarkStat label="RMSE" value={forecastState.forecastPackage.benchmark.rmse} baseline={forecastState.forecastPackage.benchmark.persistence_rmse} />
                    <BenchmarkStat label="vs persistence" value={forecastState.forecastPackage.benchmark.skill_score_vs_persistence} baseline={0} suffix="%" />
                    <BenchmarkStat label="vs seasonal naive" value={forecastState.forecastPackage.benchmark.skill_score_vs_seasonal} baseline={0} suffix="%" />
                    <BenchmarkStat label="Sample size" value={forecastState.forecastPackage.benchmark.sample_size} baseline={0} baselineLabel="holdout rows" integer />
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                    <div className="font-medium text-white">Assumption pack</div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {forecastState.forecastPackage.assumptions.map((assumption) => (
                        <li key={assumption} className="flex gap-2">
                          <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
                          <span>{assumption}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Scenario cases</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Low, expected, and high cases share one statistical engine and reconcile back to the same utility dataset.
                      </p>
                    </div>
                    <Map className="h-5 w-5 text-cyan-300" />
                  </div>

                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="year" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="low" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700 text-sm">
                      <thead className="bg-slate-900/60 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Horizon</th>
                          <th className="px-3 py-2 text-right">Low MW</th>
                          <th className="px-3 py-2 text-right">Expected MW</th>
                          <th className="px-3 py-2 text-right">High MW</th>
                          <th className="px-3 py-2 text-right">Expected GWh</th>
                          <th className="px-3 py-2 text-right">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {highlightedRows.map((row) => (
                          <tr key={row.year}>
                            <td className="px-3 py-3 font-medium">{row.year} year</td>
                            <td className="px-3 py-3 text-right text-cyan-300">{row.low?.peak_demand_mw.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right text-emerald-300">{row.expected?.peak_demand_mw.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right text-amber-300">{row.high?.peak_demand_mw.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right">{row.expected?.annual_energy_gwh.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right">{row.expected?.utilization_pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">Geography reconciliation</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Recent geography shares are reconciled to the utility-wide forecast so local issues stay visible.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {forecastState.forecastPackage.highlighted_years.map((year) => (
                          <button
                            key={year}
                            onClick={() => setSelectedHorizon(year)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              selectedHorizon === year
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {year}Y
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedAllocations.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="geography_id" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} />
                          <Bar dataKey="peak_demand_mw" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-700 text-sm">
                        <thead className="bg-slate-900/60 text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Geography</th>
                            <th className="px-3 py-2 text-left">Class</th>
                            <th className="px-3 py-2 text-right">Share</th>
                            <th className="px-3 py-2 text-right">Peak MW</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {selectedAllocations.map((allocation) => (
                            <tr key={`${allocation.horizon_year}-${allocation.geography_id}-${allocation.customer_class}`}>
                              <td className="px-3 py-3">{allocation.geography_id}</td>
                              <td className="px-3 py-3">{allocation.customer_class}</td>
                              <td className="px-3 py-3 text-right">{allocation.share_pct.toFixed(1)}%</td>
                              <td className="px-3 py-3 text-right">{allocation.peak_demand_mw.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-forecast-export-card">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">Utility export pack</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Feed planning outputs directly into the existing regulatory and utility workflows.
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-emerald-300" />
                    </div>

                    <div className="mt-4 space-y-3">
                      <button
                        onClick={exportGenericPack}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                      >
                        <div className="font-medium">Export utility forecast package</div>
                        <div className="mt-1 text-xs text-slate-500">Low / expected / high cases with assumptions and benchmark proof</div>
                      </button>
                      <button
                        onClick={exportJurisdictionPack}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                      >
                        <div className="font-medium">
                          {jurisdiction === 'Ontario' ? 'Export OEB Chapter 5 load forecast' : 'Export Alberta planning summary'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {jurisdiction === 'Ontario'
                            ? 'Five-year OEB load forecast rows wired from the utility forecast package'
                            : 'AUC-aligned planning summary for Alberta utility and REA workflows'}
                        </div>
                      </button>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                      <div className="font-medium text-white">Current source and warnings</div>
                      <div className="mt-2 text-xs text-slate-400">{forecastState.forecastPackage.source_label}</div>
                      {forecastState.forecastPackage.warnings.length > 0 && (
                        <ul className="mt-3 space-y-2 text-xs text-amber-200">
                          {forecastState.forecastPackage.warnings.map((warning) => (
                            <li key={warning} className="flex gap-2">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Link to="/demand-forecast" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <TrendingUp className="mb-2 h-5 w-5 text-cyan-300" />
            <h3 className="text-sm font-medium text-white">Advanced demand lab</h3>
            <p className="mt-1 text-xs text-slate-500">Keep the broader advanced forecasting route intact.</p>
          </Link>
          <Link to="/forecast-benchmarking" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <BarChart3 className="mb-2 h-5 w-5 text-indigo-300" />
            <h3 className="text-sm font-medium text-white">Benchmarking trust layer</h3>
            <p className="mt-1 text-xs text-slate-500">Compare forecast discipline against standard baselines.</p>
          </Link>
          <Link to="/regulatory-filing" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <FileText className="mb-2 h-5 w-5 text-amber-300" />
            <h3 className="text-sm font-medium text-white">Regulatory filing exports</h3>
            <p className="mt-1 text-xs text-slate-500">Reuse the existing filing templates without leaving the utility workflow.</p>
          </Link>
          <Link to="/asset-health" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <Shield className="mb-2 h-5 w-5 text-emerald-300" />
            <h3 className="text-sm font-medium text-white">Asset health planning</h3>
            <p className="mt-1 text-xs text-slate-500">Pair load growth with adjacent utility asset decisions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      step="0.1"
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
    />
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-semibold text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-400">{sub}</div>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

function BenchmarkStat({
  label,
  value,
  baseline,
  baselineLabel = 'baseline',
  suffix = '',
  integer = false,
}: {
  label: string;
  value: number;
  baseline: number;
  baselineLabel?: string;
  suffix?: string;
  integer?: boolean;
}) {
  const formatter = integer ? (input: number) => `${Math.round(input)}${suffix}` : (input: number) => `${input.toFixed(2)}${suffix}`;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{formatter(value)}</div>
      <div className="mt-1 text-xs text-slate-400">
        {baselineLabel}: {formatter(baseline)}
      </div>
    </div>
  );
}

export default UtilityDemandForecastPage;
