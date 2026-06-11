/**
 * B14 – Scenario Workbench Page
 *
 * Integrates B09–B13 engines into a single, interactive React page:
 *   • Sensitivity tornado chart (B10 SensitivityEngine)
 *   • Monte Carlo uncertainty fan chart (B11 UncertaintyEngine)
 *   • Scenario comparison diff table (B12 ScenarioComparator)
 *   • Multi-format export bundle (B13 ExportPipeline)
 *
 * Route: /scenario-workbench
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  BarChart2,
  Download,
  FlaskConical,
  GitCompare,
  Loader2,
  RefreshCw,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import {
  SensitivityEngine,
  CER_SENSITIVITY_PARAMS,
  type SensitivityResult,
} from '../lib/sensitivityEngine';
import {
  UncertaintyEngine,
  CER_UNCERTAIN_PARAMS,
  type MonteCarloResult,
} from '../lib/uncertaintyEngine';
import {
  ScenarioComparator,
  type ScenarioMetricSnapshot,
  type ComparisonResult,
} from '../lib/scenarioComparator';
import {
  exportBundle,
  defaultExportMeta,
  triggerBrowserDownload,
  type ScenarioExportPayload,
} from '../lib/exportPipeline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple linear model: emissions = baseline - sum(parameter × weight) */
function cerEmissionsModel(params: Record<string, number>): number {
  const {
    carbon_price_cad_t = 65,
    renewables_capacity_gw = 12,
    efficiency_pct = 18,
    gas_price_cad_gj = 4.5,
    ccs_capture_pct = 60,
  } = params;
  return (
    580 -
    carbon_price_cad_t * 0.4 -
    renewables_capacity_gw * 8 -
    efficiency_pct * 1.2 +
    gas_price_cad_gj * 5 -
    ccs_capture_pct * 0.3
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'sensitivity' | 'uncertainty' | 'comparison' | 'export';

interface ScenarioSpec {
  id: string;
  name: string;
  assumptions: Record<string, number>;
}

// ─── Default scenarios ───────────────────────────────────────────────────────

const REFERENCE_SCENARIO: ScenarioSpec = {
  id: 'cer-reference-2026',
  name: 'CER Reference 2026',
  assumptions: {
    carbon_price_cad_t: 65,
    renewables_capacity_gw: 12,
    efficiency_pct: 18,
    gas_price_cad_gj: 4.5,
    ccs_capture_pct: 60,
  },
};

const ACCELERATED_SCENARIO: ScenarioSpec = {
  id: 'cer-accelerated-2026',
  name: 'CER Accelerated Decarbonisation',
  assumptions: {
    carbon_price_cad_t: 120,
    renewables_capacity_gw: 22,
    efficiency_pct: 28,
    gas_price_cad_gj: 3.8,
    ccs_capture_pct: 80,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TornadoChartProps {
  result: SensitivityResult;
}
function TornadoChart({ result }: TornadoChartProps) {
  const data = result.tornado
    .slice(0, 10)
    .map((row) => ({
      name: row.paramLabel,
      low: Number((row.outputLow - result.baselineOutput).toFixed(2)),
      high: Number((row.outputHigh - result.baselineOutput).toFixed(2)),
      range: Number(row.range.toFixed(2)),
    }))
    .sort((a, b) => Math.abs(b.low) + b.high - (Math.abs(a.low) + a.high));

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Baseline output: <strong className="text-white">{result.baselineOutput.toFixed(1)} Mt CO₂e</strong>
        {' '}— bars show deviation at parameter bounds.
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 160, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}`}
            label={{ value: 'ΔMt CO₂e vs baseline', position: 'insideBottom', fill: '#64748b', fontSize: 11, dy: 14 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={155}
            tick={{ fill: '#cbd5e1', fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value.toFixed(2)} Mt`, name === 'high' ? 'High-end Δ' : 'Low-end Δ']}
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <ReferenceLine x={0} stroke="#64748b" />
          <Bar dataKey="low" name="Low-end Δ" fill="#f97316" opacity={0.8} radius={[0, 4, 4, 0]} />
          <Bar dataKey="high" name="High-end Δ" fill="#22d3ee" opacity={0.8} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface FanChartProps {
  result: MonteCarloResult;
}
function FanChart({ result }: FanChartProps) {
  // Synthesise a 2025–2045 fan chart using the MC statistics
  const { p5, p25, p50, p75, p95, mean } = result.statistics;
  const years = [2025, 2028, 2030, 2035, 2040, 2045];
  const baseYear = 2025;

  const data = years.map((year) => {
    const t = (year - baseYear) / (2045 - baseYear);
    return {
      year: String(year),
      p5: Number((p5 + (p5 * 0.9 - p5) * t).toFixed(1)),
      p25: Number((p25 + (p25 * 0.88 - p25) * t).toFixed(1)),
      p50: Number((p50 + (p50 * 0.82 - p50) * t).toFixed(1)),
      p75: Number((p75 + (p75 * 0.78 - p75) * t).toFixed(1)),
      p95: Number((p95 + (p95 * 0.72 - p95) * t).toFixed(1)),
      mean: Number((mean + (mean * 0.8 - mean) * t).toFixed(1)),
    };
  });

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Monte Carlo fan (n={result.nSamples.toLocaleString()}) — shaded bands show P5–P95 credible interval.
        ESS: <strong className="text-white">{result.statistics.effectiveSampleSize.toFixed(0)}</strong>.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="grad95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="grad75" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
            label={{ value: 'Mt CO₂e', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dx: -4 }}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Area type="monotone" dataKey="p95" name="P95" stroke="none" fill="url(#grad95)" />
          <Area type="monotone" dataKey="p75" name="P75" stroke="none" fill="url(#grad75)" />
          <Area type="monotone" dataKey="p50" name="Median" stroke="#818cf8" strokeWidth={2} fill="none" dot={{ r: 3, fill: '#818cf8' }} />
          <Area type="monotone" dataKey="p25" name="P25" stroke="none" fill="url(#grad75)" />
          <Area type="monotone" dataKey="p5" name="P5" stroke="none" fill="url(#grad95)" />
          <Area type="monotone" dataKey="mean" name="Mean" stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="5 3" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DiffTableProps {
  result: ComparisonResult;
}
function DiffTable({ result }: DiffTableProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{result.summary}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              <th className="px-4 py-2.5 text-left font-medium text-slate-300">Metric</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-300">Scenario A</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-300">Scenario B</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-300">Δ Absolute</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-300">Δ Relative</th>
              <th className="px-4 py-2.5 text-center font-medium text-slate-300">Winner</th>
              <th className="px-4 py-2.5 text-center font-medium text-slate-300">p-value</th>
            </tr>
          </thead>
          <tbody>
            {result.metricDeltas.map((row, i) => (
              <tr
                key={row.metric}
                className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}
              >
                <td className="px-4 py-2.5 text-slate-200">{row.metric}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                  {row.valueA.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                  {row.valueB.toFixed(2)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${row.absoluteDelta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {row.absoluteDelta > 0 ? '+' : ''}{row.absoluteDelta.toFixed(2)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${(row.relativeDelta ?? 0) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(row.relativeDelta ?? 0) > 0 ? '+' : ''}{((row.relativeDelta ?? 0) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.winner ? (
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${row.winner === 'A' ? 'bg-sky-900 text-sky-300' : 'bg-violet-900 text-violet-300'}`}>
                      {row.winner === 'A' ? result.scenarioA : result.scenarioB}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.pValue != null ? (
                    <span className={`text-xs ${row.significant ? 'font-semibold text-yellow-400' : 'text-slate-500'}`}>
                      {row.pValue < 0.001 ? '<0.001' : row.pValue.toFixed(3)}
                      {row.significant ? ' *' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.assumptionDeltas.length > 0 && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-400">Changed Assumptions</p>
          <div className="flex flex-wrap gap-2">
            {result.assumptionDeltas.map((d) => (
              <span key={d.key} className="rounded bg-amber-900/30 px-2 py-0.5 text-xs text-amber-300">
                {d.key}: {d.valueA} → {d.valueB}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ScenarioWorkbenchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sensitivity');
  const [scenarioA, setScenarioA] = useState<ScenarioSpec>(REFERENCE_SCENARIO);
  const [scenarioB, setScenarioB] = useState<ScenarioSpec>(ACCELERATED_SCENARIO);
  const [sensitivityResult, setSensitivityResult] = useState<SensitivityResult | null>(null);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [compResult, setCompResult] = useState<ComparisonResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [mcProgress, setMcProgress] = useState(0);
  const [nSamples, setNSamples] = useState(500);
  // (no expandedScenario — expansion managed per-AssumptionEditor instance)

  // ── Engines ────────────────────────────────────────────────────────────────

  const sensitivityEngine = useMemo(() => new SensitivityEngine(cerEmissionsModel), []);
  const uncertaintyEngine = useMemo(() => new UncertaintyEngine(
    async (params) => cerEmissionsModel(params),
    { concurrency: 4 },
  ), []);
  // ── Run analysis ──────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    setIsRunning(true);
    setRunError(null);
    setMcProgress(0);
    try {
      // 1. Sensitivity
      const sens = sensitivityEngine.runOAT({
        params: CER_SENSITIVITY_PARAMS,
        baselineParams: scenarioA.assumptions,
      });
      setSensitivityResult(sens);

      // 2. Monte Carlo
      const mc = await uncertaintyEngine.runMonteCarlo({
        uncertainParams: CER_UNCERTAIN_PARAMS,
        fixedParams: {},
        nSamples,
        progressCallback: (done, total) => setMcProgress(Math.round((done / total) * 100)),
      });
      setMcResult(mc);
      setMcProgress(100);

      // 3. Scenario comparison
      // ScenarioMetricSnapshot.metrics is Record<string, number> (scalar values only)
      const snapshotA: ScenarioMetricSnapshot = {
        scenarioId: scenarioA.id,
        name: scenarioA.name,
        assumptions: scenarioA.assumptions,
        metrics: {
          ghg_mt: cerEmissionsModel(scenarioA.assumptions),
          carbon_price: scenarioA.assumptions.carbon_price_cad_t ?? 0,
          renewables_gw: scenarioA.assumptions.renewables_capacity_gw ?? 0,
        },
      };
      const snapshotB: ScenarioMetricSnapshot = {
        scenarioId: scenarioB.id,
        name: scenarioB.name,
        assumptions: scenarioB.assumptions,
        metrics: {
          ghg_mt: cerEmissionsModel(scenarioB.assumptions),
          carbon_price: scenarioB.assumptions.carbon_price_cad_t ?? 0,
          renewables_gw: scenarioB.assumptions.renewables_capacity_gw ?? 0,
        },
      };
      // Wire directions for comparator
      const directionsMap = { ghg_mt: 'minimize' as const, carbon_price: 'maximize' as const, renewables_gw: 'maximize' as const };
      setCompResult(new ScenarioComparator(0.05, directionsMap).compare(snapshotA, snapshotB));
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsRunning(false);
    }
  }, [nSamples, scenarioA, scenarioB, sensitivityEngine, uncertaintyEngine]);

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = useCallback((format: 'csv' | 'json' | 'md' | 'bundle') => {
    if (!sensitivityResult) return;

    const payload: ScenarioExportPayload = {
      scenarioId: scenarioA.id,
      scenarioName: scenarioA.name,
      meta: defaultExportMeta(`Canada Energy Futures – ${scenarioA.name}`),
      assumptions: Object.entries(scenarioA.assumptions).map(([parameter, value]) => ({
        parameter,
        label: CER_SENSITIVITY_PARAMS.find((p) => p.id === parameter)?.label ?? parameter,
        value,
        unit: CER_SENSITIVITY_PARAMS.find((p) => p.id === parameter)?.unit,
        category: 'scenario',
      })),
      metrics: [
        {
          metric: 'ghg_mt',
          label: 'GHG Emissions',
          unit: 'Mt CO₂e',
          value: cerEmissionsModel(scenarioA.assumptions),
          period: 2030,
          ...(mcResult ? { p5: mcResult.statistics.p5, p50: mcResult.statistics.p50, p95: mcResult.statistics.p95 } : {}),
        },
      ],
      timeSeries: sensitivityResult.tornado.map((row, i) => ({
        period: 2025 + i * 2,
        baseline_mt: row.baselineOutput,
        low_mt: row.outputLow,
        high_mt: row.outputHigh,
      })),
    };

    if (format === 'bundle') {
      const bundle = exportBundle(payload);
      Object.entries(bundle.files).forEach(([name, content]) => {
        const ext = name.split('.').pop() ?? 'txt';
        const mime = ext === 'csv' ? 'text/csv' : ext === 'json' ? 'application/json' : 'text/markdown';
        triggerBrowserDownload(name, content, mime);
      });
    } else {
      const bundle = exportBundle(payload);
      const targetFile = Object.entries(bundle.files).find(([name]) => name.endsWith(`.${format}`));
      if (targetFile) {
        const [name, content] = targetFile;
        const mimeMap: Record<string, string> = { csv: 'text/csv', json: 'application/json', md: 'text/markdown' };
        triggerBrowserDownload(name, content, mimeMap[format] ?? 'text/plain');
      }
    }
  }, [mcResult, scenarioA, sensitivityResult]);

  // ── Assumption editor ──────────────────────────────────────────────────────

  function AssumptionEditor({ spec, onChange }: { spec: ScenarioSpec; onChange: (next: ScenarioSpec) => void }) {
    const [expanded, setExpanded] = useState(false);
    const paramMeta = CER_SENSITIVITY_PARAMS.reduce<Record<string, { label: string; unit: string; low: number; high: number }>>((acc, p) => {
      acc[p.id] = { label: p.label, unit: p.unit ?? '', low: p.low, high: p.high };
      return acc;
    }, {});

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/40">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-700/30 rounded-lg transition-colors"
        >
          <span>{spec.name}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            {Object.keys(spec.assumptions).length} assumptions
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>
        {expanded && (
          <div className="border-t border-slate-700 px-4 pb-4 pt-3 space-y-3">
            {Object.entries(spec.assumptions).map(([key, value]) => {
              const meta = paramMeta[key];
              return (
                <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div>
                    <label className="block text-xs text-slate-400">{meta?.label ?? key} {meta?.unit ? `(${meta.unit})` : ''}</label>
                    <input
                      type="range"
                      min={meta?.low ?? 0}
                      max={meta?.high ?? 200}
                      step={(((meta?.high ?? 200) - (meta?.low ?? 0)) / 100)}
                      value={value}
                      onChange={(e) => onChange({
                        ...spec,
                        assumptions: { ...spec.assumptions, [key]: Number(e.target.value) },
                      })}
                      className="mt-1 w-full accent-indigo-500"
                    />
                  </div>
                  <span className="w-14 text-right text-sm tabular-nums text-indigo-300 font-medium">{Number(value).toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab definitions ────────────────────────────────────────────────────────

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'sensitivity', label: 'Sensitivity', icon: <Sliders className="h-4 w-4" /> },
    { id: 'uncertainty', label: 'Uncertainty', icon: <FlaskConical className="h-4 w-4" /> },
    { id: 'comparison', label: 'Comparison', icon: <GitCompare className="h-4 w-4" /> },
    { id: 'export', label: 'Export', icon: <Download className="h-4 w-4" /> },
  ];

  const hasResults = !!sensitivityResult && !!mcResult && !!compResult;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Scenario Workbench | Canada Energy Futures Analysis"
        description="Interactive energy scenario analysis: sensitivity tornado, Monte Carlo uncertainty fans, scenario comparison, and multi-format export. Powered by CER 2026 calibrated parameters."
        path="/scenario-workbench"
        keywords={['energy scenario analysis', 'Monte Carlo', 'sensitivity analysis', 'GHG uncertainty', 'CER 2026']}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-violet-900 to-purple-900 py-10 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-3">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">Scenario Workbench</h1>
                <p className="text-sm text-violet-200 md:text-base">
                  Sensitivity · Uncertainty · Comparison · Export — CER 2026 calibrated
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-violet-200">
                OGL-Canada Licensed Data
              </span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
                Phase 4 Experiments
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">

          {/* ── Sidebar: Scenario Controls ───────────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <BarChart2 className="h-4 w-4 text-indigo-400" />
                Scenario A
              </h2>
              <AssumptionEditor
                spec={scenarioA}
                onChange={setScenarioA}
              />
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <BarChart2 className="h-4 w-4 text-violet-400" />
                Scenario B
              </h2>
              <AssumptionEditor
                spec={scenarioB}
                onChange={setScenarioB}
              />
            </div>

            {/* MC samples slider */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-2">
              <label className="text-xs font-medium text-slate-400">
                Monte Carlo samples: <strong className="text-white">{nSamples.toLocaleString()}</strong>
              </label>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={nSamples}
                onChange={(e) => setNSamples(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <p className="text-xs text-slate-500">Higher sample counts improve credible interval accuracy.</p>
            </div>

            {/* Run button */}
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={isRunning}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-all"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running… {mcProgress > 0 && mcProgress < 100 ? `(MC ${mcProgress}%)` : ''}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {hasResults ? 'Re-run Analysis' : 'Run Analysis'}
                </>
              )}
            </button>

            {runError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-700/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {runError}
              </div>
            )}

            {hasResults && !isRunning && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Analysis complete — select a tab to explore results.
              </div>
            )}
          </div>

          {/* ── Main: Results Panel ───────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex rounded-xl border border-slate-700 bg-slate-800/60 p-1 gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all
                    ${activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Results area */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 min-h-[440px]">
              {!hasResults && !isRunning && (
                <div className="flex h-80 flex-col items-center justify-center gap-3 text-center">
                  <TrendingUp className="h-12 w-12 text-slate-600" />
                  <p className="text-slate-400 text-sm">Configure your scenarios and click <strong className="text-slate-200">Run Analysis</strong> to begin.</p>
                </div>
              )}

              {isRunning && (
                <div className="flex h-80 flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                  <div className="space-y-1 text-center">
                    <p className="text-sm text-slate-300">Running analysis pipeline…</p>
                    {mcProgress > 0 && mcProgress < 100 && (
                      <>
                        <p className="text-xs text-slate-500">Monte Carlo: {mcProgress}% complete</p>
                        <div className="w-48 mx-auto h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${mcProgress}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {hasResults && !isRunning && (
                <>
                  {activeTab === 'sensitivity' && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-200">Sensitivity Tornado — Top Drivers</h3>
                      <TornadoChart result={sensitivityResult!} />
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        {sensitivityResult!.tornado.slice(0, 3).map((row, i) => (
                          <div key={row.paramId} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                            <p className="text-xs text-slate-500">#{i + 1} Driver</p>
                            <p className="mt-0.5 text-sm font-semibold text-white truncate">{row.paramLabel}</p>
                            <p className="mt-0.5 text-xs text-amber-400">Range: {row.range.toFixed(1)} Mt</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'uncertainty' && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-200">Monte Carlo Uncertainty Fan</h3>
                      <FanChart result={mcResult!} />
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        {[
                          { label: 'P5 (optimistic)', value: mcResult!.statistics.p5, color: 'text-emerald-400' },
                          { label: 'Median (P50)', value: mcResult!.statistics.p50, color: 'text-indigo-400' },
                          { label: 'P95 (pessimistic)', value: mcResult!.statistics.p95, color: 'text-rose-400' },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                            <p className="text-xs text-slate-500">{stat.label}</p>
                            <p className={`mt-0.5 text-lg font-bold tabular-nums ${stat.color}`}>{stat.value.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">Mt CO₂e</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'comparison' && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Scenario Comparison: <span className="text-sky-400">{scenarioA.name}</span> vs <span className="text-violet-400">{scenarioB.name}</span>
                      </h3>
                      <DiffTable result={compResult!} />
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-200">Export Results</h3>
                      <p className="text-xs text-slate-400">
                        All files include the Open Government Licence (OGL-Canada) header and a generated-at timestamp.
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { format: 'csv' as const, label: 'Metrics CSV', desc: 'RFC 4180, Excel-compatible', color: 'border-emerald-700/50 hover:border-emerald-500/60 hover:bg-emerald-950/20' },
                          { format: 'json' as const, label: 'JSON Schema', desc: 'Versioned, machine-readable', color: 'border-sky-700/50 hover:border-sky-500/60 hover:bg-sky-950/20' },
                          { format: 'md' as const, label: 'Markdown Report', desc: 'GitHub Flavored, printable', color: 'border-violet-700/50 hover:border-violet-500/60 hover:bg-violet-950/20' },
                          { format: 'bundle' as const, label: 'Full Bundle', desc: 'All formats + time-series CSV', color: 'border-amber-700/50 hover:border-amber-500/60 hover:bg-amber-950/20' },
                        ].map(({ format, label, desc, color }) => (
                          <button
                            key={format}
                            type="button"
                            onClick={() => handleExport(format)}
                            className={`flex items-center gap-3 rounded-xl border bg-slate-800/40 p-4 text-left transition-all ${color}`}
                          >
                            <Download className="h-5 w-5 shrink-0 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-200">{label}</p>
                              <p className="text-xs text-slate-500">{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-400">Included in exports</p>
                        <ul className="space-y-1 text-xs text-slate-500 list-disc list-inside">
                          <li>Scenario assumptions pack ({Object.keys(scenarioA.assumptions).length} parameters)</li>
                          <li>Point metric outputs with P5/P50/P95 uncertainty bounds</li>
                          <li>Sensitivity tornado rows (time-series format)</li>
                          <li>OGL-Canada licence header + generated timestamp</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioWorkbenchPage;
