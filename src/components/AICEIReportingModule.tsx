import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Leaf,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SEOHead } from './SEOHead';
import DataTrustNotice from './DataTrustNotice';
import ProofPackPanel from './ProofPackPanel';
import ConstructedScenarioPanel from './ConstructedScenarioPanel';
import { AICEI_CONSTRUCTED_SCENARIO } from '../lib/commercialScenarioBundles';
import {
  buildAiceiChecklist,
  buildAiceiMetricsCsv,
  buildAiceiSourceLabel,
  buildStarterAiceiProjects,
  listAiceiReportingPeriods,
  parseAiceiProjects,
  type AiceiProjectRecord,
  type AiceiSourceMode,
} from '../lib/aiceiReportingSupport';
import {
  buildAiceiProofBundle,
  buildAiceiReportDescriptor,
} from '../lib/aiceiReportingProofPack';
import {
  downloadPdfArtifact,
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../lib/proofPack';

export function AICEIReportingModule() {
  const [records, setRecords] = useState<AiceiProjectRecord[]>(() => buildStarterAiceiProjects());
  const [sourceMode, setSourceMode] = useState<AiceiSourceMode>('starter_portfolio');
  const [importError, setImportError] = useState<string | null>(null);
  const periods = useMemo(() => listAiceiReportingPeriods(records), [records]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => listAiceiReportingPeriods(buildStarterAiceiProjects())[0] ?? 'Q1 2026');
  const filteredRecords = useMemo(
    () => records.filter((record) => record.reportingPeriod === selectedPeriod),
    [records, selectedPeriod],
  );
  const proofBundle = useMemo(() => buildAiceiProofBundle(sourceMode), [sourceMode]);
  const proofActions = useMemo(() => {
    const descriptor = buildAiceiReportDescriptor({
      sourceMode,
      period: selectedPeriod,
      records: filteredRecords,
    });
    const checklist = buildAiceiChecklist(filteredRecords);

    return proofBundle.artifacts.map((artifact) => {
      if (artifact.id === 'aicei-quarterly-pdf') {
        return {
          ...artifact,
          onDownload: () => downloadPdfArtifact({ ...descriptor, definition: artifact }),
        };
      }
      if (artifact.id === 'aicei-quarterly-html') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            renderHtmlProofDocument({ ...descriptor, definition: artifact }),
            'text/html;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'aicei-metrics-csv') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildAiceiMetricsCsv(filteredRecords),
            'text/csv;charset=utf-8;',
          ),
        };
      }
      return {
        ...artifact,
        onDownload: () => downloadTextArtifact(
          artifact,
          ['# AICEI approval-gap checklist', '', ...checklist.map((item) => `- ${item}`)].join('\n'),
          'text/markdown;charset=utf-8;',
        ),
      };
    });
  }, [filteredRecords, proofBundle.artifacts, selectedPeriod, sourceMode]);

  const totals = useMemo(() => ({
    generation: filteredRecords.reduce((sum, record) => sum + record.generationKwh, 0),
    reduction: filteredRecords.reduce((sum, record) => sum + Math.max(record.baselineGhgTonnes - record.actualGhgTonnes, 0), 0),
    participants: filteredRecords.reduce((sum, record) => sum + record.participantsCount, 0),
    hours: filteredRecords.reduce((sum, record) => sum + record.participantsHours, 0),
  }), [filteredRecords]);
  const chartData = useMemo(() => filteredRecords.map((record) => ({
    name: record.name,
    generation: record.generationKwh,
    reduction: Math.max(record.baselineGhgTonnes - record.actualGhgTonnes, 0),
  })), [filteredRecords]);
  const checklist = useMemo(() => buildAiceiChecklist(filteredRecords), [filteredRecords]);

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const uploaded = parseAiceiProjects(file.name, text);
      setRecords(uploaded);
      const nextPeriods = listAiceiReportingPeriods(uploaded);
      setSelectedPeriod(nextPeriods[0] ?? 'Q1 2026');
      setSourceMode('uploaded_portfolio');
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to parse the AICEI portfolio file.');
    } finally {
      event.target.value = '';
    }
  }

  function resetStarterPortfolio() {
    const starter = buildStarterAiceiProjects();
    setRecords(starter);
    setSelectedPeriod(listAiceiReportingPeriods(starter)[0] ?? 'Q1 2026');
    setSourceMode('starter_portfolio');
    setImportError(null);
  }

  function loadConstructedScenario() {
    const jsonScenario = AICEI_CONSTRUCTED_SCENARIO.downloads.find((file) => file.id === 'aicei-json');
    if (!jsonScenario) return;

    const constructed = parseAiceiProjects(jsonScenario.filename, jsonScenario.content);
    setRecords(constructed);
    setSelectedPeriod(listAiceiReportingPeriods(constructed)[0] ?? 'Q1 2026');
    setSourceMode('constructed_commercial_scenario');
    setImportError(null);
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="AICEI Grant Reporting | Indigenous Energy Dashboard"
        description="Alberta Indigenous Clean Energy Initiative reporting workflow with quarterly exports, owner-supplied governance markers, and program-ready proof artifacts."
        path="/aicei"
        keywords={['AICEI', 'Indigenous clean energy', 'Alberta grant reporting', 'GHG reduction', 'quarterly report']}
      />

      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-700 py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-3">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-100">Alberta-specific reporting wedge</div>
              <h1 className="mt-2 text-3xl font-bold text-white">AICEI Grant Reporting Module</h1>
              <p className="mt-2 max-w-3xl text-purple-100">
                Replace the static demo with an uploadable Alberta reporting workflow that carries OCAP language, owner-supplied markers, and program-ready exports.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/funder-reporting"
              className="text-sm text-purple-100 transition-colors hover:text-white"
            >
              ← Back to Funder Reporting Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <DataTrustNotice
          mode={sourceMode === 'starter_portfolio' ? 'mock' : 'fallback'}
          title={
            sourceMode === 'starter_portfolio'
              ? 'Starter AICEI portfolio active'
              : sourceMode === 'constructed_commercial_scenario'
                ? 'Constructed commercial scenario active'
                : 'Uploaded AICEI portfolio active'
          }
          message={
            sourceMode === 'starter_portfolio'
              ? 'The route is using a starter Alberta portfolio. Upload an AICEI CSV or JSON file to replace the static demo with buyer-controlled project rows.'
              : sourceMode === 'constructed_commercial_scenario'
                ? 'This route is using a constructed Alberta AICEI portfolio built from realistic reporting assumptions. Community approval and governance fields remain explicit, but the data is not a Nation-owned project file.'
                : 'The current metrics and exports are built from uploaded project rows. Community approval and governance fields remain explicitly owner-supplied.'
          }
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">1. Select period and portfolio source</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Run one Alberta reporting cycle at a time, with a starter or uploaded portfolio.
                  </p>
                </div>
                <Upload className="h-5 w-5 text-purple-300" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
                >
                  {periods.map((period) => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white">
                  <Upload className="h-4 w-4" />
                  Upload AICEI portfolio
                  <input
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>

                <button
                  onClick={loadConstructedScenario}
                  className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-50 transition-colors hover:border-purple-400"
                >
                  Load constructed Alberta case
                </button>

                <button
                  onClick={resetStarterPortfolio}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-purple-500/50"
                >
                  Reload starter portfolio
                </button>
              </div>

              {importError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-100">
                  {importError}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4" data-testid="aicei-source-mode">
                <div className="text-xs uppercase tracking-[0.18em] text-purple-200">Current source mode</div>
                <div className="mt-2 text-sm text-white">{buildAiceiSourceLabel(sourceMode)}</div>
                <div className="mt-2 text-xs text-slate-400">
                  Owner-supplied governance and approval fields stay attached to all exports in this route.
                </div>
              </div>
            </div>

            <ConstructedScenarioPanel
              scenario={AICEI_CONSTRUCTED_SCENARIO}
              onLoad={loadConstructedScenario}
              testId="aicei-constructed-scenario"
            />

            <ProofPackPanel
              title={proofBundle.title}
              summary={proofBundle.summary}
              artifacts={proofActions}
            />
          </section>

          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard icon={<Zap className="h-5 w-5 text-amber-300" />} label="Generation" value={`${(totals.generation / 1000).toFixed(1)} MWh`} sub="Selected period" />
              <MetricCard icon={<Leaf className="h-5 w-5 text-emerald-300" />} label="GHG reduction" value={`${totals.reduction.toFixed(0)} tCO₂e`} sub="Baseline vs actual" />
              <MetricCard icon={<Users className="h-5 w-5 text-cyan-300" />} label="Participants" value={`${totals.participants}`} sub="Capacity-building reach" />
              <MetricCard icon={<Download className="h-5 w-5 text-purple-300" />} label="Training hours" value={`${totals.hours}h`} sub="Owner-supplied activity log" />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white">2. Period metrics by project</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="generation" fill="#8b5cf6" name="Generation kWh" />
                    <Bar dataKey="reduction" fill="#10b981" name="GHG reduction tCO2e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white">3. Project-level reporting rows</h2>
            <div className="mt-4 space-y-3">
              {filteredRecords.map((record) => (
                <div key={record.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-white">{record.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {record.community} • {record.technology} • {record.reportingPeriod}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      record.communityApprovalStatus === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-200'
                    }`}>
                      {record.communityApprovalStatus}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-slate-300">
                    <div>Generation: {record.generationKwh.toLocaleString()} kWh</div>
                    <div>GHG reduction: {Math.max(record.baselineGhgTonnes - record.actualGhgTonnes, 0).toLocaleString()} tCO₂e</div>
                    <div>Participants / hours: {record.participantsCount} / {record.participantsHours}</div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Activities: {record.capacityBuildingActivities.join(' • ') || 'none provided'}
                  </div>
                  {record.ownerSuppliedNotes && (
                    <div className="mt-2 text-xs text-purple-200">
                      Owner-supplied note: {record.ownerSuppliedNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-purple-500/30 bg-purple-900/20 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-purple-300" />
                <div>
                  <h2 className="text-lg font-semibold text-white">OCAP and governance framing</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    All AICEI exports keep community approval and governance fields visible as owner-supplied unless the Nation or project team confirms them separately.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white">4. Approval-gap checklist</h2>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    {item.startsWith('No missing') ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 text-amber-300" />
                    )}
                    <span className={item.startsWith('No missing') ? 'text-slate-200' : 'text-amber-200'}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

export default AICEIReportingModule;
