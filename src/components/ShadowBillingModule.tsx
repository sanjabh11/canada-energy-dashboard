import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  Upload,
} from 'lucide-react';
import ProofPackPanel from './ProofPackPanel';
import ConstructedScenarioPanel from './ConstructedScenarioPanel';
import DataTrustNotice from './DataTrustNotice';
import { SHADOW_BILLING_CONSTRUCTED_SCENARIO } from '../lib/commercialScenarioBundles';
import {
  analyzeShadowBilling,
  buildShadowBillingDeltaCsv,
  buildStarterShadowBills,
  parseShadowBillingCsv,
} from '../lib/shadowBillingSupport';
import {
  buildShadowBillingExecutiveMarkdown,
  buildShadowBillingFieldMapMarkdown,
  buildShadowBillingMemoDescriptor,
  buildShadowBillingProofBundle,
  type ShadowBillingSourceMode,
} from '../lib/shadowBillingProofPack';
import {
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../lib/proofPack';

export const ShadowBillingModule: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [records, setRecords] = useState(() => buildStarterShadowBills());
  const [sourceMode, setSourceMode] = useState<ShadowBillingSourceMode>('starter_bills');
  const [importError, setImportError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const analysis = useMemo(() => analyzeShadowBilling(records), [records]);
  const proofBundle = useMemo(() => buildShadowBillingProofBundle(sourceMode), [sourceMode]);
  const proofActions = useMemo(() => {
    const descriptor = buildShadowBillingMemoDescriptor(analysis, sourceMode);

    return proofBundle.artifacts.map((artifact) => {
      if (artifact.id === 'shadow-billing-memo') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            renderHtmlProofDocument({ ...descriptor, definition: artifact }),
            'text/html;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'shadow-billing-delta-csv') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildShadowBillingDeltaCsv(analysis),
            'text/csv;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'shadow-billing-field-map') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildShadowBillingFieldMapMarkdown(),
            'text/markdown;charset=utf-8;',
          ),
        };
      }
      return {
        ...artifact,
        onDownload: () => downloadTextArtifact(
          artifact,
          buildShadowBillingExecutiveMarkdown(analysis),
          'text/markdown;charset=utf-8;',
        ),
      };
    });
  }, [analysis, proofBundle.artifacts, sourceMode]);

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const uploaded = parseShadowBillingCsv(text);
      setRecords(uploaded);
      setSourceMode('uploaded_bills');
      setImportError(null);
      setShowDetails(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to parse the bill comparison file.');
    } finally {
      event.target.value = '';
    }
  }

  function resetStarterDataset() {
    setRecords(buildStarterShadowBills());
    setSourceMode('starter_bills');
    setImportError(null);
  }

  function loadConstructedScenario() {
    const constructed = parseShadowBillingCsv(SHADOW_BILLING_CONSTRUCTED_SCENARIO.downloads[0].content);
    setRecords(constructed);
    setSourceMode('constructed_commercial_scenario');
    setImportError(null);
    setShowDetails(true);
  }

  function downloadStarterTemplate() {
    const starterCsv = [
      'billing_period,consumption_kwh,actual_energy_rate_cents_per_kwh,actual_supply_cost_cad,fixed_charge_cad,retailer_name,rolr_rate_cents_per_kwh,pool_price_cents_per_kwh',
      ...buildStarterShadowBills().map((record) => [
        record.billingPeriod,
        record.consumptionKwh,
        record.actualEnergyRateCentsPerKwh.toFixed(2),
        record.actualSupplyCostCad.toFixed(2),
        (record.fixedChargeCad ?? 0).toFixed(2),
        `"${record.retailerName ?? ''}"`,
        record.rolrRateCentsPerKwh.toFixed(2),
        record.poolPriceCentsPerKwh.toFixed(2),
      ].join(',')),
    ].join('\n');

    downloadTextArtifact(
      {
        id: 'shadow-billing-starter-template',
        label: 'Starter invoice template',
        format: 'csv',
        filename: 'shadow_billing_starter_template.csv',
        audience: 'Facilities lead',
        generatedAt: new Date().toISOString(),
        jurisdiction: 'Alberta',
        sourceSummary: 'Starter template',
        sourceManifestId: 'shadow-billing-starter-template-v1',
        verificationStatus: 'needs_buyer_data',
        doNotClaim: [
          'Full delivered-bill audit',
          'Utility bill correctness certification',
          'Savings without uploaded invoice evidence',
        ],
        assumptions: [],
        claimLabel: 'advisory',
        isFallback: true,
        freshnessState: 'starter-template',
        boundedClaimsDisclaimer: 'Populate this file with the buyer’s last 12 bills before using it in a paid pilot.',
      },
      starterCsv,
      'text/csv;charset=utf-8;',
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-600/20 p-4">
              <RefreshCcw className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Municipal and facilities wedge</div>
              <h1 className="mt-2 text-3xl font-bold text-white">Shadow Billing Module</h1>
              <p className="mt-2 max-w-3xl text-lg text-slate-300">
                Review the last 12 bills against Alberta&apos;s disclosed RoLR comparison path without overclaiming full delivered-bill parity.
              </p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            <Upload className="h-4 w-4" />
            Review your last 12 bills
          </button>
        </div>

        <DataTrustNotice
          mode={sourceMode === 'starter_bills' ? 'mock' : 'fallback'}
          title={
            sourceMode === 'starter_bills'
              ? 'Starter bill set active'
              : sourceMode === 'constructed_commercial_scenario'
                ? 'Constructed commercial scenario active'
                : 'Uploaded invoice comparison active'
          }
          message={
            sourceMode === 'starter_bills'
              ? 'The current comparison uses a starter 12-month Alberta bill set. Upload actual invoices to replace every delta and memo with buyer-specific numbers.'
              : sourceMode === 'constructed_commercial_scenario'
                ? 'This comparison uses a constructed Alberta municipal bill file based on realistic public-sector supply-cost assumptions. It is not a customer invoice book, and the exports keep that boundary explicit.'
                : 'The current comparison is built from uploaded invoice data. Energy-supply-only scope and rider exclusions still stay explicit in every export.'
          }
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6" data-testid="shadow-billing-upload-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">1. Upload bill history</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Upload a 12-month invoice file with consumption, supply rate, supply cost, and optional fixed charges.
                  </p>
                </div>
                <Building2 className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 p-5">
                <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
                  <Upload className="h-8 w-8 text-cyan-300" />
                  <div>
                    <div className="font-medium text-white">Upload 12-month billing CSV</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Required columns: `billing_period`, `consumption_kwh`, `actual_energy_rate_cents_per_kwh`, `actual_supply_cost_cad`.
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <span className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white">Select billing file</span>
                </label>
              </div>

              {importError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-100">
                  {importError}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={loadConstructedScenario}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-left text-sm text-cyan-50 transition-colors hover:border-cyan-400"
                >
                  <div className="font-medium">Load constructed municipal scenario</div>
                  <div className="mt-1 text-xs text-cyan-100/80">Swap in a semi-real Alberta municipal bill file for pilot demos and outreach.</div>
                </button>
                <button
                  onClick={downloadStarterTemplate}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                >
                  <div className="font-medium">Download starter invoice template</div>
                  <div className="mt-1 text-xs text-slate-500">Use this schema to replace the seeded comparison with buyer invoices.</div>
                </button>
                <button
                  onClick={resetStarterDataset}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                >
                  <div className="font-medium">Reload starter bill set</div>
                  <div className="mt-1 text-xs text-slate-500">Switch back to the seeded Alberta starter set for demos.</div>
                </button>
              </div>
            </div>

            <ConstructedScenarioPanel
              scenario={SHADOW_BILLING_CONSTRUCTED_SCENARIO}
              onLoad={loadConstructedScenario}
              testId="shadow-billing-constructed-scenario"
            />

            <ProofPackPanel
              title={proofBundle.title}
              summary={proofBundle.summary}
              artifacts={proofActions}
            />
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300" data-testid="shadow-billing-source-mode">
                <CheckCircle2 className="h-4 w-4" />
                {sourceMode === 'starter_bills'
                  ? 'Starter bill set active'
                  : sourceMode === 'constructed_commercial_scenario'
                    ? 'Constructed municipal invoice scenario active'
                    : 'Uploaded 12-month invoice history active'}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white">Annual comparison summary</h2>
              <p className="mt-2 text-sm text-slate-400">
                Default comparison scope is energy-supply-only. Fixed charges remain directional unless the buyer provides them in the import file.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SummaryCard label="Actual supply cost" value={formatCurrency(analysis.totalActualSupplyCostCad)} tone="slate" />
                <SummaryCard label="RoLR comparison cost" value={formatCurrency(analysis.totalRolrSupplyCostCad)} tone="emerald" />
                <SummaryCard label="Delta vs RoLR" value={formatCurrency(analysis.deltaVsRolrCad)} tone={analysis.deltaVsRolrCad > 0 ? 'amber' : 'emerald'} />
                <SummaryCard label="Months above RoLR" value={`${analysis.monthsOverRolr} / ${analysis.rows.length}`} tone="slate" />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-900/20 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
                <div>
                  <div className="font-medium text-white">Comparison boundary</div>
                  <p className="mt-2 text-sm text-amber-100">
                    This route does not claim full delivered-bill reconstruction unless rider and fixed-charge mapping are explicitly supplied. The current proof pack stays honest by leading with supply-cost deltas first.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetails((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
            >
              <Calendar className="h-4 w-4" />
              {showDetails ? 'Hide monthly comparison' : 'Show monthly comparison'}
            </button>
          </section>
        </div>

        {showDetails && (
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
            <h3 className="text-lg font-semibold text-white">Monthly invoice comparison</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Usage (kWh)</th>
                    <th className="px-4 py-3 text-right">Actual supply</th>
                    <th className="px-4 py-3 text-right">RoLR supply</th>
                    <th className="px-4 py-3 text-right">Pool supply</th>
                    <th className="px-4 py-3 text-right">Delta vs RoLR</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-800 text-slate-200">
                      <td className="px-4 py-3">{row.billingPeriod}</td>
                      <td className="px-4 py-3 text-right">{row.consumptionKwh.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.actualSupplyCostCad)}</td>
                      <td className="px-4 py-3 text-right text-emerald-300">{formatCurrency((row.consumptionKwh * row.rolrRateCentsPerKwh) / 100)}</td>
                      <td className="px-4 py-3 text-right text-cyan-300">{formatCurrency(row.poolSupplyCostCad)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.deltaVsRolrCad > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {formatCurrency(row.deltaVsRolrCad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'emerald' | 'amber';
}) {
  const toneClasses = tone === 'emerald'
    ? 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300'
    : tone === 'amber'
      ? 'border-amber-500/30 bg-amber-900/20 text-amber-300'
      : 'border-slate-700 bg-slate-900/70 text-white';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default ShadowBillingModule;
