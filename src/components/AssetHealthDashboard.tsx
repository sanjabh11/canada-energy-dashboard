import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter,
  ZAxis,
} from 'recharts';
import {
  Upload, Download, Activity, AlertTriangle, CheckCircle2,
  Shield, Zap, Clock, Building2, Info, FileText,
  XCircle, Loader, ChevronDown, Target,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { Link } from 'react-router-dom';
import {
  scoreFleet,
  parseAssetCSV,
  resultsToCSV,
  generateSampleAssets,
  CSV_TEMPLATE_EXAMPLE,
  type AssetRecord,
  type AssetHealthResult,
  type FleetSummary,
  type ConditionCategory,
  type RiskPriority,
} from '../lib/assetHealthScoring';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONDITION_COLORS: Record<ConditionCategory, string> = {
  good: '#10b981',
  fair: '#f59e0b',
  poor: '#ef4444',
  very_poor: '#991b1b',
};

const RISK_COLORS: Record<RiskPriority, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#991b1b',
};

const CONDITION_LABELS: Record<ConditionCategory, string> = {
  good: 'Good (HI ≥ 70)',
  fair: 'Fair (40–69)',
  poor: 'Poor (20–39)',
  very_poor: 'Very Poor (< 20)',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AssetHealthDashboard: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [results, setResults] = useState<AssetHealthResult[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setCsvError('Please upload a CSV file.');
      return;
    }

    setIsProcessing(true);
    setCsvError(null);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { assets: parsed, errors } = parseAssetCSV(text);
        setParseErrors(errors);

        if (parsed.length === 0) {
          setCsvError('No valid asset records found in CSV.');
          setIsProcessing(false);
          return;
        }

        setAssets(parsed);
        const { results: scored, summary: fleetSummary } = scoreFleet(parsed);
        setResults(scored);
        setSummary(fleetSummary);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : 'Failed to parse CSV');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleLoadSample = useCallback(() => {
    setIsProcessing(true);
    setCsvError(null);
    setParseErrors([]);
    const sampleAssets = generateSampleAssets();
    setAssets(sampleAssets);
    const { results: scored, summary: fleetSummary } = scoreFleet(sampleAssets);
    setResults(scored);
    setSummary(fleetSummary);
    setIsProcessing(false);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (results.length === 0) return;
    const csv = resultsToCSV(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset_health_index_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const handleDownloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_health_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Asset Health Index | CSV-Based Utility Asset Condition Scoring"
        description="CBRM-lite asset health scoring for utility distribution assets. Upload CSV data — no SCADA required. Age, loading, maintenance, and environment factors scored 0-100 per OEB Appendix 2-AB methodology."
        path="/asset-health"
        keywords={['asset health index', 'utility asset management', 'CBRM', 'condition scoring', 'distribution asset', 'OEB Appendix 2-AB']}
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Asset Health Index
                </h1>
                <p className="text-cyan-100 text-sm md:text-base">
                  CBRM-lite scoring from CSV — no SCADA or sensors required
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {results.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export Results
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-6">
        {/* Upload Section */}
        {results.length === 0 && (
          <div className="space-y-6">
            {/* Methodology Explainer */}
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-2">How It Works</h3>
                  <p className="text-slate-300 text-sm mb-3">
                    Upload a CSV with your asset fleet data. The engine scores each asset using a
                    <strong> weighted composite Health Index (0-100)</strong> based on four factors:
                  </p>
                  <div className="grid md:grid-cols-4 gap-3 text-sm">
                    <FactorCard color="text-emerald-400" label="Age Factor" weight="30%" desc="Normalized remaining life vs expected life by asset type" />
                    <FactorCard color="text-cyan-400" label="Loading Factor" weight="25%" desc="Current load as % of rated capacity" />
                    <FactorCard color="text-amber-400" label="Maintenance Factor" weight="25%" desc="Recency of maintenance + emergency ratio" />
                    <FactorCard color="text-purple-400" label="Environment Factor" weight="20%" desc="Operating conditions (indoor → arctic)" />
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Compatible with OEB Appendix 2-AB Condition-Based Risk Management methodology.
                    No SCADA, sensors, or real-time data feeds required.
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-cyan-500 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="asset-csv-upload"
                />
                <label htmlFor="asset-csv-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  {isProcessing ? (
                    <Loader className="h-10 w-10 text-cyan-400 animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-slate-400" />
                  )}
                  <span className="text-white font-medium">Upload Asset CSV</span>
                  <span className="text-slate-500 text-sm">
                    CSV with columns: asset_id, asset_type, install_date, rated_capacity_kva, ...
                  </span>
                </label>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-2">Quick Start</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    No data ready? Try our sample dataset with 10 typical distribution assets,
                    or download the CSV template to fill with your own data.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleLoadSample}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Zap className="h-4 w-4" />
                    Load Sample Data (10 Assets)
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV Template
                  </button>
                  <button
                    onClick={() => setShowTemplate(!showTemplate)}
                    className="w-full py-2 text-slate-400 hover:text-white text-sm flex items-center justify-center gap-1 transition-colors"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showTemplate ? 'rotate-180' : ''}`} />
                    {showTemplate ? 'Hide' : 'View'} CSV Format
                  </button>
                </div>
              </div>
            </div>

            {/* CSV Template Preview */}
            {showTemplate && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre">{CSV_TEMPLATE_EXAMPLE}</pre>
              </div>
            )}

            {/* Errors */}
            {csvError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">{csvError}</p>
                  {parseErrors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {parseErrors.slice(0, 5).map((err, i) => (
                        <li key={i} className="text-red-300 text-sm">• {err}</li>
                      ))}
                      {parseErrors.length > 5 && (
                        <li className="text-red-300 text-sm">...and {parseErrors.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {summary && results.length > 0 && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard label="Total Assets" value={String(summary.total_assets)} icon={<Building2 className="h-5 w-5 text-cyan-400" />} />
              <SummaryCard label="Avg Health Index" value={String(summary.avg_health_index)} icon={<Target className="h-5 w-5 text-emerald-400" />} color={summary.avg_health_index >= 70 ? 'text-emerald-400' : summary.avg_health_index >= 40 ? 'text-amber-400' : 'text-red-400'} />
              <SummaryCard label="Avg Age" value={`${summary.avg_age_years} yr`} icon={<Clock className="h-5 w-5 text-amber-400" />} />
              <SummaryCard label="Needing Action" value={String(summary.assets_needing_action)} icon={<AlertTriangle className="h-5 w-5 text-red-400" />} color="text-red-400" />
              <SummaryCard label="Est. Replacement" value={`$${(summary.replacement_budget_estimate_cad / 1000).toFixed(0)}K`} icon={<Shield className="h-5 w-5 text-purple-400" />} />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Condition Distribution Pie */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 text-sm">Condition Distribution</h3>
                <ConditionPieChart distribution={summary.condition_distribution} />
              </div>

              {/* Risk Distribution Pie */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 text-sm">Risk Priority Distribution</h3>
                <RiskPieChart distribution={summary.risk_distribution} />
              </div>

              {/* HI by Asset Type Bar */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 text-sm">Avg Health Index by Type</h3>
                <TypeBarChart byType={summary.by_type} />
              </div>
            </div>

            {/* Age vs HI Scatter */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Age vs Health Index</h3>
              <AgeHealthScatter results={results} />
            </div>

            {/* Asset Table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Asset Scoring Detail</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  <button
                    onClick={() => { setResults([]); setSummary(null); setAssets([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    New Upload
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-700/30">
                    <tr>
                      <th className="text-left text-slate-400 px-3 py-2 font-medium">Asset</th>
                      <th className="text-left text-slate-400 px-3 py-2 font-medium">Type</th>
                      <th className="text-center text-slate-400 px-3 py-2 font-medium">HI</th>
                      <th className="text-center text-slate-400 px-3 py-2 font-medium">Condition</th>
                      <th className="text-center text-slate-400 px-3 py-2 font-medium">Risk</th>
                      <th className="text-right text-slate-400 px-3 py-2 font-medium">Age</th>
                      <th className="text-right text-slate-400 px-3 py-2 font-medium">Loading</th>
                      <th className="text-left text-slate-400 px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {results
                      .sort((a, b) => a.health_index - b.health_index)
                      .map(r => (
                        <tr key={r.asset_id} className="hover:bg-slate-700/20">
                          <td className="px-3 py-2">
                            <div className="text-white font-medium">{r.asset_name}</div>
                            <div className="text-slate-500">{r.asset_id}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-300">{formatAssetType(r.asset_type)}</td>
                          <td className="px-3 py-2 text-center">
                            <HealthBadge value={r.health_index} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: CONDITION_COLORS[r.condition] + '20', color: CONDITION_COLORS[r.condition] }}>
                              {r.condition.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: RISK_COLORS[r.risk_priority] + '20', color: RISK_COLORS[r.risk_priority] }}>
                              {r.risk_priority}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300">{r.age_years} yr</td>
                          <td className="px-3 py-2 text-right text-slate-300">{r.loading_pct > 0 ? `${r.loading_pct}%` : '—'}</td>
                          <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{r.recommended_action}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Parse Warnings */}
            {parseErrors.length > 0 && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                <h4 className="text-amber-400 font-medium text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Parse Warnings ({parseErrors.length})
                </h4>
                <ul className="space-y-1">
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <li key={i} className="text-amber-300 text-xs">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <Link to="/utility-demand-forecast" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors group">
            <Building2 className="h-5 w-5 text-sky-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-cyan-400">Utility Forecast Lane</h4>
            <p className="text-slate-500 text-xs mt-1">Tie asset decisions back to utility demand growth and planning scenarios</p>
          </Link>
          <Link to="/regulatory-filing" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors group">
            <FileText className="h-5 w-5 text-amber-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-cyan-400">Regulatory Filing</h4>
            <p className="text-slate-500 text-xs mt-1">Export asset condition data to OEB Section 5.2 format</p>
          </Link>
          <Link to="/demand-forecast" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors group">
            <Zap className="h-5 w-5 text-emerald-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-cyan-400">Demand Forecasting</h4>
            <p className="text-slate-500 text-xs mt-1">ML load forecasts to support capacity planning</p>
          </Link>
          <Link to="/forecast-benchmarking" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors group">
            <Target className="h-5 w-5 text-purple-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-cyan-400">Forecast Benchmarking</h4>
            <p className="text-slate-500 text-xs mt-1">Accuracy evidence for regulatory submissions</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHART COMPONENTS
// ============================================================================

function ConditionPieChart({ distribution }: { distribution: Record<ConditionCategory, number> }) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: CONDITION_LABELS[key as ConditionCategory],
      value,
      color: CONDITION_COLORS[key as ConditionCategory],
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${value}`}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RiskPieChart({ distribution }: { distribution: Record<RiskPriority, number> }) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: RISK_COLORS[key as RiskPriority],
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}`}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TypeBarChart({ byType }: { byType: FleetSummary['by_type'] }) {
  const data = byType.map(t => ({
    type: formatAssetType(t.asset_type).split(' ').slice(0, 2).join(' '),
    avg_hi: t.avg_hi,
    count: t.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={50} />
        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
          formatter={(value: number, name: string) => [value, name === 'avg_hi' ? 'Avg HI' : 'Count']}
        />
        <Bar dataKey="avg_hi" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AgeHealthScatter({ results }: { results: AssetHealthResult[] }) {
  const data = results.map(r => ({
    age: r.age_years,
    hi: r.health_index,
    name: r.asset_name,
    loading: r.loading_pct || 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis type="number" dataKey="age" name="Age" unit=" yr" stroke="#94a3b8" fontSize={11} />
        <YAxis type="number" dataKey="hi" name="Health Index" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
        <ZAxis type="number" dataKey="loading" range={[40, 200]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
          formatter={(value: number, name: string) => [
            name === 'Age' ? `${value} yr` : name === 'Health Index' ? value : `${value}%`,
            name,
          ]}
          labelFormatter={() => ''}
        />
        <Scatter data={data} fill="#06b6d4" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// UI PRIMITIVES
// ============================================================================

function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs font-medium uppercase">{label}</span>
        {icon}
      </div>
      <span className={`text-xl font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

function HealthBadge({ value }: { value: number }) {
  const color = value >= 70 ? 'text-emerald-400 bg-emerald-400/10' :
    value >= 40 ? 'text-amber-400 bg-amber-400/10' :
    value >= 20 ? 'text-red-400 bg-red-400/10' : 'text-red-600 bg-red-600/10';
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 rounded font-bold text-xs ${color}`}>
      {value}
    </span>
  );
}

function FactorCard({ color, label, weight, desc }: {
  color: string; label: string; weight: string; desc: string;
}) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3">
      <div className={`${color} font-medium mb-1 flex items-center justify-between`}>
        <span>{label}</span>
        <span className="text-xs opacity-75">{weight}</span>
      </div>
      <div className="text-slate-400 text-xs">{desc}</div>
    </div>
  );
}

function formatAssetType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default AssetHealthDashboard;
