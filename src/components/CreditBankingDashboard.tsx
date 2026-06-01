import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Download,
  FileSpreadsheet,
  PiggyBank,
  Shield,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataFreshnessBadge } from './ui/DataFreshnessBadge';
import DataTrustNotice from './DataTrustNotice';
import ProofPackPanel from './ProofPackPanel';
import ConstructedScenarioPanel from './ConstructedScenarioPanel';
import { CREDIT_BANKING_CONSTRUCTED_SCENARIO } from '../lib/commercialScenarioBundles';
import {
  calculateSavingsPercentage,
  getPricingDataQualityWarning,
  getTIERPricingProvenance,
  useTIERPricing,
} from '../lib/tierPricing';
import {
  allocateCreditsToLiabilities,
  buildCreditAllocationCsv,
  buildExpiryRiskCsv,
  buildStarterComplianceYears,
  buildStarterCreditHoldings,
  parseComplianceLiabilityCsv,
  parseCreditHoldingsCsv,
  summarizeCreditPortfolio,
  type ComplianceYear,
  type CreditHolding,
} from '../lib/creditBankingSupport';
import {
  buildCreditBankingProofBundle,
  buildCreditPositionDescriptor,
  type CreditBankingSourceMode,
} from '../lib/creditBankingProofPack';
import {
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../lib/proofPack';

export const CreditBankingDashboard: React.FC = () => {
  const tierPricing = useTIERPricing();
  const pricingWarning = getPricingDataQualityWarning(tierPricing);
  const pricingProvenance = getTIERPricingProvenance(tierPricing);
  const [holdings, setHoldings] = useState<CreditHolding[]>(() => buildStarterCreditHoldings());
  const [liabilities, setLiabilities] = useState<ComplianceYear[]>(() => buildStarterComplianceYears());
  const [sourceMode, setSourceMode] = useState<CreditBankingSourceMode>('starter_ledger');
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [liabilityError, setLiabilityError] = useState<string | null>(null);

  const allocations = useMemo(() => allocateCreditsToLiabilities(holdings, liabilities), [holdings, liabilities]);
  const portfolio = useMemo(
    () => summarizeCreditPortfolio(holdings, liabilities, tierPricing.marketCreditPrice, tierPricing.fundPrice),
    [holdings, liabilities, tierPricing.fundPrice, tierPricing.marketCreditPrice],
  );
  const proofBundle = useMemo(() => buildCreditBankingProofBundle(sourceMode, tierPricing), [sourceMode, tierPricing]);
  const proofActions = useMemo(() => {
    const descriptor = buildCreditPositionDescriptor({
      sourceMode,
      pricing: tierPricing,
      summary: portfolio,
      allocations,
      holdings,
    });

    return proofBundle.artifacts.map((artifact) => {
      if (artifact.id === 'credit-position-memo') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            renderHtmlProofDocument({ ...descriptor, definition: artifact }),
            'text/html;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'credit-allocation-schedule') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildCreditAllocationCsv(allocations, tierPricing.marketCreditPrice),
            'text/csv;charset=utf-8;',
          ),
        };
      }
      return {
        ...artifact,
        onDownload: () => downloadTextArtifact(
          artifact,
          buildExpiryRiskCsv(holdings),
          'text/csv;charset=utf-8;',
        ),
      };
    });
  }, [allocations, holdings, portfolio, proofBundle.artifacts, sourceMode, tierPricing]);

  async function handleHoldingsImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setHoldings(parseCreditHoldingsCsv(text));
      setSourceMode('uploaded_ledger');
      setHoldingsError(null);
    } catch (error) {
      setHoldingsError(error instanceof Error ? error.message : 'Unable to parse the holdings ledger.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleLiabilityImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setLiabilities(parseComplianceLiabilityCsv(text));
      setSourceMode('uploaded_ledger');
      setLiabilityError(null);
    } catch (error) {
      setLiabilityError(error instanceof Error ? error.message : 'Unable to parse the compliance liability file.');
    } finally {
      event.target.value = '';
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  function resetStarters() {
    setHoldings(buildStarterCreditHoldings());
    setLiabilities(buildStarterComplianceYears());
    setSourceMode('starter_ledger');
    setHoldingsError(null);
    setLiabilityError(null);
  }

  function loadConstructedScenario() {
    const holdingsFile = CREDIT_BANKING_CONSTRUCTED_SCENARIO.downloads.find((file) => file.id === 'credit-holdings-csv');
    const liabilitiesFile = CREDIT_BANKING_CONSTRUCTED_SCENARIO.downloads.find((file) => file.id === 'credit-liabilities-csv');
    if (!holdingsFile || !liabilitiesFile) return;

    setHoldings(parseCreditHoldingsCsv(holdingsFile.content));
    setLiabilities(parseComplianceLiabilityCsv(liabilitiesFile.content));
    setSourceMode('constructed_commercial_scenario');
    setHoldingsError(null);
    setLiabilityError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <DataFreshnessBadge
            timestamp={pricingProvenance.lastUpdated}
            status={pricingProvenance.isFallback ? 'demo' : 'stale'}
            source={tierPricing.source}
          />
        </div>
        {pricingWarning && (
          <DataTrustNotice
            mode="fallback"
            title="TIER pricing snapshot disclosure"
            message={`${pricingWarning} Credit banking remains a planning workflow until the buyer refreshes pricing before approval.`}
            className="mb-6"
          />
        )}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-cyan-600/20 p-4">
              <PiggyBank className="h-10 w-10 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">TIER follow-on workflow</div>
              <h1 className="mt-2 text-3xl font-bold text-white">Credit Banking Dashboard</h1>
              <p className="mt-2 max-w-3xl text-lg text-slate-300">
                Import holdings and compliance liabilities, allocate credits by compliance year, and export an audit-ready banking pack tied to the current TIER price disclosure.
              </p>
            </div>
          </div>

          <Link
            to="/roi-calculator"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
          >
            <TrendingUp className="h-4 w-4" />
            Open TIER savings calculator
          </Link>
        </div>

        <DataTrustNotice
          mode={sourceMode === 'starter_ledger' ? 'mock' : 'fallback'}
          title={
            sourceMode === 'starter_ledger'
              ? 'Starter credit ledger active'
              : sourceMode === 'constructed_commercial_scenario'
                ? 'Constructed commercial scenario active'
                : 'Uploaded ledger and liabilities active'
          }
          message={
            sourceMode === 'starter_ledger'
              ? 'This route is using starter credit lots and compliance liabilities. Upload the buyer ledger and liability files before using the allocation exports commercially.'
              : sourceMode === 'constructed_commercial_scenario'
                ? 'The current route is using a constructed Alberta industrial ledger and liability stack. It is realistic enough for pilot packaging, but still not a registry extract or verified buyer ledger.'
                : 'The allocation schedule now reflects uploaded holdings and liabilities. Pricing still remains a disclosed planning snapshot until the buyer validates a live quote.'
          }
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">1. Import ledger and liabilities</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Replace the starter lots with the buyer&apos;s registry holdings and compliance-year liability files.
                  </p>
                </div>
                <Upload className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <UploadCard
                  title="Import holdings ledger CSV"
                  description="Required: id, type, vintage, quantity, purchase_price, purchase_date, expiry_year, status."
                  onChange={handleHoldingsImport}
                />
                <UploadCard
                  title="Import compliance liability CSV"
                  description="Required: year, liability or liability_tonnes, and optional allocated."
                  onChange={handleLiabilityImport}
                />
              </div>

              {(holdingsError || liabilityError) && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-100">
                  {holdingsError ?? liabilityError}
                </div>
              )}

              <div className="mt-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={loadConstructedScenario}
                    className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50 transition-colors hover:border-cyan-400"
                  >
                    Load constructed industrial case
                  </button>
                  <button
                    onClick={resetStarters}
                    className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                  >
                    Reload starter ledger
                  </button>
                </div>
              </div>
            </div>

            <ConstructedScenarioPanel
              scenario={CREDIT_BANKING_CONSTRUCTED_SCENARIO}
              onLoad={loadConstructedScenario}
              testId="credit-banking-constructed-scenario"
            />

            <ProofPackPanel
              title={proofBundle.title}
              summary={proofBundle.summary}
              artifacts={proofActions}
            />
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300" data-testid="credit-banking-source-mode">
                <Shield className="h-4 w-4" />
                {sourceMode === 'starter_ledger'
                  ? 'Starter ledger active'
                  : sourceMode === 'constructed_commercial_scenario'
                    ? 'Constructed industrial ledger active'
                    : 'Uploaded ledger active'}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MetricCard icon={<Wallet className="h-5 w-5 text-slate-400" />} label="Active credits" value={`${portfolio.totalCredits.toLocaleString()} t`} sub="Available for banking" />
                <MetricCard icon={<Calendar className="h-5 w-5 text-slate-400" />} label="Coverage ratio" value={`${portfolio.coverageRatio.toFixed(0)}%`} sub="2025-2027 liabilities covered" />
                <MetricCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Current value" value={formatCurrency(portfolio.currentValue)} sub={`${calculateSavingsPercentage(tierPricing).toFixed(0)}% below fund price`} tone="emerald" />
                <MetricCard icon={<AlertTriangle className="h-5 w-5 text-amber-300" />} label="Expiring soon" value={`${portfolio.expiringSoonCredits.toLocaleString()} t`} sub="Within four years" tone="amber" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-lg font-semibold text-white">2. Compliance-year allocation</h2>
              <div className="mt-4 space-y-3">
                {allocations.map((row) => (
                  <div key={row.year} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{row.year}</div>
                      <div className="text-sm text-slate-400">{row.allocated.toLocaleString()} / {row.liability.toLocaleString()} t</div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-700">
                      <div
                        className={`h-2 rounded-full ${row.remaining === 0 ? 'bg-emerald-500' : row.allocated > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${row.liability > 0 ? (row.allocated / row.liability) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Remaining: {row.remaining.toLocaleString()} t • Estimated market cost: {formatCurrency(row.remaining * tierPricing.marketCreditPrice)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Lots used: {row.allocatedLots.length > 0 ? row.allocatedLots.map((lot) => `${lot.quantity}t ${lot.type} v${lot.vintage}`).join(' • ') : 'none allocated'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-900/20 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <div className="font-medium text-white">Pricing and procurement boundary</div>
              <p className="mt-2 text-sm text-amber-100">
                This workflow creates an audit-ready allocation story, not a broker execution surface. Keep it positioned as a TIER follow-on proof asset until the buyer validates a live market quote and registry process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function UploadCard({
  title,
  description,
  onChange,
}: {
  title: string;
  description: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
}) {
  return (
    <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 p-5 text-center">
      <FileSpreadsheet className="mx-auto h-8 w-8 text-cyan-300" />
      <div className="mt-3 font-medium text-white">{title}</div>
      <div className="mt-1 text-xs text-slate-400">{description}</div>
      <input type="file" accept=".csv,text/csv" className="hidden" onChange={onChange} />
      <span className="mt-4 inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white">Select CSV</span>
    </label>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: 'default' | 'emerald' | 'amber';
}) {
  const toneClasses = tone === 'emerald'
    ? 'border-emerald-500/30 bg-emerald-900/20'
    : tone === 'amber'
      ? 'border-amber-500/30 bg-amber-900/20'
      : 'border-slate-700 bg-slate-900/70';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="flex items-center gap-2 text-sm text-slate-400">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

export default CreditBankingDashboard;
