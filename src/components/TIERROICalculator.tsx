/**
 * TIER ROI Calculator Component
 * Alberta TIER compliance pathway comparison for industrial facilities.
 * All scenario math lives in src/lib/tierCalculations.ts; this component is a
 * thin wrapper that renders honest, currency-labeled outputs and suppresses
 * ROI/savings figures when no positive savings are identified.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Info,
  Mail,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { Link } from 'react-router-dom';
import { isLeadIntakeEnabled, persistLeadIntake } from '../lib/leadIntake';
import { trackEvent } from '../lib/analytics';
import { validateEmail } from '../lib/formValidation';
import { PrivacyCollectionNotice } from './PrivacyCollectionNotice';
import {
  useTIERPricing,
  calculateArbitrageSpread,
  TIER_MARKET_RATE_MAX_AGE_DAYS,
} from '../lib/tierPricing';
import { evaluateTierScenario } from '../lib/mlForecastingClient';
import type { TierScenarioResult } from '../lib/mlForecasting';
import { fetchLatestTierMarketRate } from '../lib/ratesSource';
import ProofPackPanel from './ProofPackPanel';
import {
  buildTierAppendixMarkdown,
  buildTierMemoDescriptor,
  buildTierProofBundle,
  buildTierPricingFreshnessGate,
  buildTierSourceCurrencyChecklistMarkdown,
} from '../lib/tierProofPack';
import {
  downloadPdfArtifact,
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../lib/proofPack';
import {
  computeTierRoiScenario,
  canRequestTierPilot,
  formatTierAmount,
  toTierRoiResultsView,
  SUCCESS_FEE_RATE,
  TIER_REGULATION_URL,
} from '../lib/tierCalculations';

// Scenario persistence (audit P2): calculator inputs save to localStorage so a
// returning visitor resumes their facility scenario. Defaults clear the key.
const TIER_SCENARIO_STORAGE_KEY = 'ceip_tier_roi_scenario_v1';

interface TierScenarioInputs {
  annualEmissions: number;
  benchmarkExceedance: number;
  directInvestCapex: number;
}

const DEFAULT_SCENARIO_INPUTS: TierScenarioInputs = {
  annualEmissions: 150000,
  benchmarkExceedance: 20000,
  directInvestCapex: 500000,
};

function loadSavedScenarioInputs(): TierScenarioInputs {
  if (typeof window === 'undefined') return DEFAULT_SCENARIO_INPUTS;
  try {
    const raw = window.localStorage.getItem(TIER_SCENARIO_STORAGE_KEY);
    if (!raw) return DEFAULT_SCENARIO_INPUTS;
    const parsed = JSON.parse(raw) as Partial<TierScenarioInputs>;
    const num = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return {
      annualEmissions: num(parsed.annualEmissions, DEFAULT_SCENARIO_INPUTS.annualEmissions),
      benchmarkExceedance: num(
        parsed.benchmarkExceedance,
        DEFAULT_SCENARIO_INPUTS.benchmarkExceedance,
      ),
      directInvestCapex: num(parsed.directInvestCapex, DEFAULT_SCENARIO_INPUTS.directInvestCapex),
    };
  } catch {
    return DEFAULT_SCENARIO_INPUTS;
  }
}

export const TIERROICalculator: React.FC = () => {
  useEffect(() => {
    trackEvent('tier_calculator_view', { source_route: '/roi-calculator' });
  }, []);

  const sampleFacilityPreset = {
    annualEmissions: 162000,
    benchmarkExceedance: 24000,
    directInvestCapex: 650000,
  };

  // User inputs (restored from localStorage when a prior scenario exists)
  const [initialScenario] = useState(loadSavedScenarioInputs);
  const [annualEmissions, setAnnualEmissions] = useState<number>(initialScenario.annualEmissions);
  const [benchmarkExceedance, setBenchmarkExceedance] = useState<number>(
    initialScenario.benchmarkExceedance,
  );
  const [directInvestCapex, setDirectInvestCapex] = useState<number>(
    initialScenario.directInvestCapex,
  );
  const [scenarioSaved, setScenarioSaved] = useState(false);
  const [emailCapture, setEmailCapture] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [contactName, setContactName] = useState('');
  const [complianceYear, setComplianceYear] = useState<string>('');
  const [showPilotRequest, setShowPilotRequest] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState<TierScenarioResult | null>(null);
  const [simulatorSource, setSimulatorSource] = useState<'edge' | 'local_fallback'>(
    'local_fallback',
  );
  const [liveTierMarketRate, setLiveTierMarketRate] = useState<number | null>(null);
  const [liveTierMarketRateSource, setLiveTierMarketRateSource] = useState<{
    sourceName?: string;
    sourceUrl?: string;
    observedAt?: string;
    claimLabel?: 'estimated' | 'advisory' | 'validated';
  } | null>(null);

  // TIER Pricing configuration (single source of truth)
  const tierPricing = useTIERPricing();
  const FUND_PRICE = tierPricing.fundPrice;
  const MARKET_PRICE = liveTierMarketRate ?? tierPricing.marketCreditPrice;
  const ARBITRAGE_SPREAD = calculateArbitrageSpread({
    ...tierPricing,
    marketCreditPrice: MARKET_PRICE,
  });

  useEffect(() => {
    let cancelled = false;
    fetchLatestTierMarketRate()
      .then((rate) => {
        if (cancelled) return;
        if (rate) {
          setLiveTierMarketRate(Number(rate.market_credit_price_cad_per_tonne));
          setLiveTierMarketRateSource({
            sourceName: rate.source_name,
            sourceUrl: rate.source_url,
            observedAt: rate.observed_at,
            claimLabel: rate.claim_label,
          });
        } else {
          setLiveTierMarketRate(null);
          setLiveTierMarketRateSource(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLiveTierMarketRate(null);
        setLiveTierMarketRateSource(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist calculator inputs locally; restoring defaults clears the saved key.
  useEffect(() => {
    try {
      const isDefault =
        annualEmissions === DEFAULT_SCENARIO_INPUTS.annualEmissions &&
        benchmarkExceedance === DEFAULT_SCENARIO_INPUTS.benchmarkExceedance &&
        directInvestCapex === DEFAULT_SCENARIO_INPUTS.directInvestCapex;
      if (isDefault) {
        window.localStorage.removeItem(TIER_SCENARIO_STORAGE_KEY);
        setScenarioSaved(false);
        return;
      }
      window.localStorage.setItem(
        TIER_SCENARIO_STORAGE_KEY,
        JSON.stringify({ annualEmissions, benchmarkExceedance, directInvestCapex }),
      );
      setScenarioSaved(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — persistence is best-effort
    }
  }, [annualEmissions, benchmarkExceedance, directInvestCapex]);

  const resetSavedScenario = () => {
    try {
      window.localStorage.removeItem(TIER_SCENARIO_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAnnualEmissions(DEFAULT_SCENARIO_INPUTS.annualEmissions);
    setBenchmarkExceedance(DEFAULT_SCENARIO_INPUTS.benchmarkExceedance);
    setDirectInvestCapex(DEFAULT_SCENARIO_INPUTS.directInvestCapex);
  };

  // Pathway economics live in src/lib/tierCalculations.ts (pure, unit-tested).
  // Direct Investment remains undetermined until the current Alberta Standard
  // status is verified; no credit conversion rate is assumed.
  // Rate inputs carry dated provenance; when provenance is missing or stale,
  // computeTierRoiScenario suppresses savings, ranking, and CTA outputs
  // ('stale_inputs') instead of showing optimistic economics.
  const results = useMemo(
    () =>
      computeTierRoiScenario({
        annualEmissionsTonnes: annualEmissions,
        benchmarkExceedanceTonnes: benchmarkExceedance,
        directInvestmentCapexCad: directInvestCapex,
        fundPriceCadPerTonne: FUND_PRICE,
        marketCreditPriceCadPerTonne: MARKET_PRICE,
        fundPriceProvenance: tierPricing.fundPriceProvenance,
        marketCreditProvenance: liveTierMarketRateSource
          ? {
              asOfDate: liveTierMarketRateSource.observedAt ?? '',
              source: liveTierMarketRateSource.sourceName ?? '',
              sourceUrl: liveTierMarketRateSource.sourceUrl,
              maxAgeDays: TIER_MARKET_RATE_MAX_AGE_DAYS,
            }
          : tierPricing.marketCreditProvenance,
      }),
    [
      annualEmissions,
      benchmarkExceedance,
      directInvestCapex,
      FUND_PRICE,
      MARKET_PRICE,
      tierPricing.fundPriceProvenance,
      tierPricing.marketCreditProvenance,
      liveTierMarketRateSource,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    evaluateTierScenario({
      annualEmissionsTonnes: annualEmissions,
      benchmarkExceedanceTonnes: benchmarkExceedance,
      directInvestmentCapexCad: directInvestCapex,
      creditAssumptions: {
        fundPriceCadPerTonne: FUND_PRICE,
        marketCreditPriceCadPerTonne: MARKET_PRICE,
        // No credit-rate assumption: current Standard status is unverified, so
        // the simulator models zero assumed credits.
        directInvestmentCreditRate: 0,
        lastVerifiedAt: tierPricing.lastVerifiedAt,
      },
      discountRate: 0.08,
    }).then(({ data, source }) => {
      if (cancelled) return;
      setSimulatorResult(data);
      setSimulatorSource(source);
    });
    return () => {
      cancelled = true;
    };
  }, [
    annualEmissions,
    benchmarkExceedance,
    directInvestCapex,
    FUND_PRICE,
    MARKET_PRICE,
    tierPricing.lastVerifiedAt,
  ]);

  // Every monetary output is labeled with its currency code: pathway amounts
  // are CAD; CEIP fees are USD (matching the subscription catalog).
  const formatCad = (value: number): string => formatTierAmount(value, 'CAD');
  const formatUsd = (value: number): string => formatTierAmount(value, 'USD');

  const proofSnapshot = useMemo(
    () => ({
      annualEmissions,
      benchmarkExceedance,
      directInvestCapex,
      pricing: tierPricing,
      marketPrice: MARKET_PRICE,
      // Proof-pack exports consume the legacy TierRoiResults shape; the
      // projection keeps the memo conservative (DI shown at its upper bound).
      results: toTierRoiResultsView(results),
      simulatorResult,
      simulatorSource,
      liveTierMarketRateSource,
    }),
    [
      MARKET_PRICE,
      annualEmissions,
      benchmarkExceedance,
      directInvestCapex,
      liveTierMarketRateSource,
      results,
      simulatorResult,
      simulatorSource,
      tierPricing,
    ],
  );

  const pricingFreshnessGate = useMemo(
    () => buildTierPricingFreshnessGate(proofSnapshot),
    [proofSnapshot],
  );
  const pilotRequestAllowed = canRequestTierPilot({
    pricingEvidenceFresh: !pricingFreshnessGate.blocksStrongSavingsClaim,
    ratesStale: results.ratesStale,
    status: results.status,
    netSavingsCad: results.netSavingsCad,
    roiPercent: results.roiPercent,
  });
  const handleEmailSubmit = async () => {
    if (showPilotRequest && !pilotRequestAllowed) {
      setEmailError(
        'Pilot requests are unavailable until current source pricing, positive modeled net savings, and dated FX are verified.',
      );
      return;
    }
    if (!isLeadIntakeEnabled()) {
      setEmailError('Pilot requests are disabled until the privacy collection notice is approved.');
      return;
    }
    if (!validateEmail(emailCapture)) {
      setEmailError('Enter a valid work email so our team can follow up.');
      return;
    }

    setEmailError('');
    trackEvent('tier_lead_submit', {
      segment: 'Industrial',
      source_route: '/roi-calculator',
      has_pilot_request: showPilotRequest,
    });

    // Facility-level fields are only sent when a permitted pilot request is
    // explicitly selected; otherwise the request contains contact details only.
    const persistResult = await persistLeadIntake({
      company_name: 'Industrial ROI Inquiry',
      contact_name: contactName.trim() || 'Industrial Lead',
      email: emailCapture,
      source_route: '/roi-calculator',
      channel: 'direct',
      segment: 'industrial',
      campaign_id: 'roi_calculator_2026q1',
      metadata: {
        pilot_request: showPilotRequest,
        ...(showPilotRequest
          ? {
              annual_emissions: annualEmissions,
              benchmark_exceedance: benchmarkExceedance,
              direct_invest_capex: directInvestCapex,
              compliance_year: complianceYear ? Number(complianceYear) : undefined,
            }
          : {}),
      },
    });

    if (!persistResult.ok) {
      setEmailError('We could not save your request. Please try again in a moment.');
      return;
    }

    setEmailCapture('');
    setEmailSubmitted(true);
  };
  const exportSnapshot = useMemo(
    () =>
      pricingFreshnessGate.blocksStrongSavingsClaim
        ? {
            ...proofSnapshot,
            results: {
              ...proofSnapshot.results,
              bestOption: 'none' as const,
              ceipFee: null,
              netSavings: null,
              roiPercent: null,
            },
          }
        : proofSnapshot,
    [pricingFreshnessGate.blocksStrongSavingsClaim, proofSnapshot],
  );
  const proofBundle = useMemo(() => buildTierProofBundle(exportSnapshot), [exportSnapshot]);
  const memoDescriptor = useMemo(() => buildTierMemoDescriptor(exportSnapshot), [exportSnapshot]);
  const appendixMarkdown = useMemo(
    () => buildTierAppendixMarkdown(exportSnapshot),
    [exportSnapshot],
  );
  const sourceCurrencyMarkdown = useMemo(
    () => buildTierSourceCurrencyChecklistMarkdown(exportSnapshot),
    [exportSnapshot],
  );

  const proofActions = useMemo(() => {
    const [pdfArtifact, htmlArtifact, appendixArtifact, sourceCurrencyArtifact] =
      proofBundle.artifacts;
    return [
      {
        ...pdfArtifact,
        onDownload: () => {
          trackEvent('tier_memo_export', { format: 'pdf' });
          downloadPdfArtifact(memoDescriptor);
        },
      },
      {
        ...htmlArtifact,
        onDownload: () => {
          trackEvent('tier_memo_export', { format: 'html' });
          downloadTextArtifact(
            htmlArtifact,
            renderHtmlProofDocument({ ...memoDescriptor, definition: htmlArtifact }),
            'text/html;charset=utf-8;',
          );
        },
      },
      {
        ...appendixArtifact,
        onDownload: () => {
          trackEvent('tier_memo_export', { format: 'appendix-md' });
          downloadTextArtifact(appendixArtifact, appendixMarkdown, 'text/markdown;charset=utf-8;');
        },
      },
      {
        ...sourceCurrencyArtifact,
        onDownload: () => {
          trackEvent('tier_memo_export', { format: 'source-currency-md' });
          downloadTextArtifact(
            sourceCurrencyArtifact,
            sourceCurrencyMarkdown,
            'text/markdown;charset=utf-8;',
          );
        },
      },
    ];
  }, [appendixMarkdown, memoDescriptor, proofBundle.artifacts, sourceCurrencyMarkdown]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <SEOHead
        title="Alberta TIER Scenario Planning Calculator"
        description={`Build draft Alberta TIER scenarios for human review. Compare a planning fund-price basis, market-credit inputs, and an undetermined Direct Investment pathway.`}
        path="/roi-calculator"
        keywords={[
          'TIER calculator',
          'Alberta TIER scenario planning',
          'TIER credit ledger',
          'EPC offset Alberta',
          'Direct Investment TIER',
        ]}
      />

      {/* Navigation */}
      <header className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-400" />
            <span className="font-bold">CEIP</span>
            <span className="text-slate-400 text-sm">TIER Calculator</span>
          </Link>
          <Link
            to="/enterprise"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
          >
            Talk to Sales
          </Link>
        </div>
      </header>

      {/* What is TIER? — SEO Explainer */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h1 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-emerald-400" />
            What is TIER? Alberta's Carbon Compliance System
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            The <strong>Technology Innovation and Emissions Reduction (TIER)</strong> regulation
            requires Alberta facilities emitting 100,000+ tonnes CO₂e/year to reduce emissions below
            a benchmark. Facilities exceeding their benchmark can review planning scenarios by:
            paying the <strong>CAD {FUND_PRICE}/tonne published fund-price basis</strong>,
            purchasing{' '}
            <strong>
              market credits (EPCs/Offsets) at a source-dated rate, when one is available
            </strong>
            , or using the
            <strong> Direct Investment pathway</strong>, whose current Standard status and buyer
            eligibility remain unverified. Cost figures are planning scenarios; the pricing evidence
            gate below controls whether pathway ranking and savings can be shown.
          </p>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <a
              href="https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Alberta.ca TIER Regulation
            </a>
            <a
              href="https://icapcarbonaction.com/en/ets/canada-alberta-technology-innovation-and-emissions-reduction-regulation"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> ICAP Carbon Action
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-6">
        <div
          className={`mb-4 rounded-xl border p-4 text-sm ${pricingFreshnessGate.blocksStrongSavingsClaim ? 'border-amber-500/40 bg-amber-950/30 text-amber-100' : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'}`}
        >
          <div className="font-semibold">
            TIER pricing freshness gate: {pricingFreshnessGate.status}
          </div>
          <p className="mt-1">{pricingFreshnessGate.message}</p>
          <Link
            to="/credit-banking"
            className="mt-3 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            Pair this memo with the credit banking audit pack <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ProofPackPanel
          title={proofBundle.title}
          summary={proofBundle.summary}
          artifacts={proofActions}
        />
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-600/20 rounded-xl">
              <Calculator className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">TIER Compliance Scenario Calculator</h2>
              <p className="text-slate-400">Compare three pathways under explicit evidence gates</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-sm px-2 py-0.5 rounded">1</span>
                Your Facility Data
              </h3>

              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-emerald-300">
                        Sample Alberta facility preset
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Preload one realistic industrial scenario to generate a CFO memo without
                        manual setup.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAnnualEmissions(sampleFacilityPreset.annualEmissions);
                        setBenchmarkExceedance(sampleFacilityPreset.benchmarkExceedance);
                        setDirectInvestCapex(sampleFacilityPreset.directInvestCapex);
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                    >
                      Load preset
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs">
                  <span className="text-slate-400">
                    {scenarioSaved
                      ? 'Scenario saved locally in this browser.'
                      : 'Inputs auto-save locally in this browser.'}
                  </span>
                  <button
                    onClick={resetSavedScenario}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Annual Emissions (tonnes CO₂e)
                  </label>
                  <input
                    type="number"
                    value={annualEmissions}
                    onChange={(e) => setAnnualEmissions(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Benchmark Exceedance (tonnes above limit)
                  </label>
                  <input
                    type="number"
                    value={benchmarkExceedance}
                    onChange={(e) => setBenchmarkExceedance(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Your compliance liability = {benchmarkExceedance.toLocaleString()} tonnes
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Direct Investment Capex (CAD planned efficiency spend)
                  </label>
                  <input
                    type="number"
                    value={directInvestCapex}
                    onChange={(e) => setDirectInvestCapex(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Planned on-site efficiency spend. Credit treatment remains undetermined until
                    the current publication status of Alberta&apos;s Direct Investment Standard is
                    verified.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-400">
                    Current planning price basis
                  </h4>
                  <div
                    className={`text-xs px-2 py-1 rounded-full border ${
                      liveTierMarketRateSource
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {liveTierMarketRateSource
                      ? `Source attached: ${liveTierMarketRateSource.sourceName ?? 'market rate'}`
                      : 'Fallback planning snapshot in use'}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-red-400">TIER Fund Price</div>
                    <div className="text-2xl font-bold text-red-500">CAD {FUND_PRICE}/t</div>
                  </div>
                  <div className="text-slate-500">vs</div>
                  <div className="text-right">
                    <div className="text-sm text-emerald-400">Market Credit Price</div>
                    <div className="text-2xl font-bold text-emerald-400">CAD {MARKET_PRICE}/t</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {liveTierMarketRateSource
                        ? `Observed ${new Date(liveTierMarketRateSource.observedAt ?? '').toLocaleDateString()} · ${liveTierMarketRateSource.claimLabel ?? 'estimated'}`
                        : `Illustrative planning input only—not a current market quote · snapshot dated ${tierPricing.lastVerifiedAt}`}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="text-sm bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                    {pricingFreshnessGate.blocksStrongSavingsClaim
                      ? 'CAD spread withheld until pricing evidence is current and validated'
                      : `CAD ${ARBITRAGE_SPREAD}/tonne scenario spread under current inputs`}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Fund price provenance
                    </div>
                    <div className="mt-2 text-sm text-white">{tierPricing.source}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Effective {tierPricing.effectiveDate} • verified {tierPricing.lastVerifiedAt}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Market price provenance
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {liveTierMarketRateSource?.sourceName ?? tierPricing.marketPriceSource}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {liveTierMarketRateSource
                        ? `Observed ${new Date(liveTierMarketRateSource.observedAt ?? '').toLocaleDateString()} • ${liveTierMarketRateSource.claimLabel ?? 'estimated'}`
                        : `${tierPricing.marketPriceDisclosure} Reviewed ${tierPricing.lastVerifiedAt}.`}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Simulator: {simulatorResult?.meta.model_version ?? 'tier-deterministic-v1'} via{' '}
                  {simulatorSource === 'edge' ? 'Supabase Edge' : 'local fallback'}.
                  {simulatorResult?.meta.staleness_status === 'stale'
                    ? ' Pricing assumptions need reverification.'
                    : ''}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-sm px-2 py-0.5 rounded">2</span>
                Pathway costs and gated savings
              </h3>

              <div className="space-y-3">
                {/* Fund payment pathway — included in the best-option comparison */}
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-red-400">Fund Payment Pathway</div>
                      <div className="text-xs text-slate-500">
                        {benchmarkExceedance.toLocaleString()} t × {formatCad(FUND_PRICE)}/t
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-500">
                      {formatCad(results.pathways.fundPayment.costCad)}
                    </div>
                  </div>
                </div>

                {/* Market credits pathway */}
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-emerald-400">Market Credits Pathway</div>
                      <div className="text-xs text-slate-500">
                        {benchmarkExceedance.toLocaleString()} t × {formatCad(MARKET_PRICE)}/t
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatCad(results.pathways.marketCredits.costCad)}
                    </div>
                  </div>
                </div>

                {/* Direct Investment pathway — bounded, undetermined pending Standard */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-blue-400">Direct Investment Pathway</span>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                          Undetermined — current Standard status unverified
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatCad(results.pathways.directInvestment.capexCad)} planned capex;
                        eligible capital capped at{' '}
                        {formatCad(results.pathways.directInvestment.eligibleCapitalCapCad)} (50%)
                        under the Canada–Alberta implementation agreement
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-300">
                        {formatCad(results.pathways.directInvestment.costRangeCad.low)} –{' '}
                        {formatCad(results.pathways.directInvestment.costRangeCad.high)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        illustrative range, unverified
                      </div>
                    </div>
                  </div>
                </div>

                {/* CEIP Fee — billed USD to match the subscription catalog */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-slate-400">CEIP Platform Fee (USD)</div>
                      <div className="text-xs text-slate-500">
                        {formatUsd(results.fees.baseUsd)} annual base + {SUCCESS_FEE_RATE * 100}%
                        success fee on modeled savings
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-300">
                        {results.fees.totalUsd !== null ? formatUsd(results.fees.totalUsd) : '—'}
                      </div>
                      {results.fees.totalCadEquivalent !== null && (
                        <div className="text-[10px] text-slate-500">
                          ≈ {formatCad(results.fees.totalCadEquivalent)} using the supplied USD→CAD
                          rate
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Result — honest states: no misleading numbers */}
              <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-2 border-emerald-500 rounded-xl p-6">
                {results.status === 'incomplete_inputs' ? (
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>Enter facility inputs above to model compliance pathway savings.</span>
                  </div>
                ) : results.ratesStale ? (
                  <div role="status">
                    <div className="text-sm text-amber-300">Stale or unprovenanced rate inputs</div>
                    <div className="text-xl font-semibold text-white">
                      Savings, ranking, and ROI are withheld
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      The fund or market-credit price input is outside its freshness window or lacks
                      dated source provenance. Refresh dated rate evidence before relying on pathway
                      economics.
                    </p>
                  </div>
                ) : pricingFreshnessGate.blocksStrongSavingsClaim ? (
                  <div role="status">
                    <div className="text-sm text-amber-300">Planning scenario only</div>
                    <div className="text-xl font-semibold text-white">
                      Savings and pathway ranking are withheld
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      The current market-price source is missing, stale, or not validated. Refresh
                      source evidence and provide dated FX before using net-savings figures.
                    </p>
                  </div>
                ) : results.status === 'no_savings' ? (
                  <div>
                    <div className="text-sm text-emerald-400">Your Net Savings</div>
                    <div className="text-xl font-semibold text-white">
                      No savings identified at these inputs
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      At the current price basis, purchasing market credits does not cost less than
                      the fund payment. Revisit when live pricing is refreshed.
                    </p>
                  </div>
                ) : results.netSavingsCad === null ? (
                  <div role="status">
                    <div className="text-sm text-amber-300">CAD-equivalent result unavailable</div>
                    <p className="mt-2 text-sm text-slate-400">
                      Provide current, sourced USD/CAD evidence before calculating net savings or
                      ROI.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-emerald-400">Your Net Savings (CAD)</div>
                        <div className="text-4xl font-bold text-white">
                          {formatCad(results.netSavingsCad)}
                        </div>
                      </div>
                      {results.roiPercent !== null && (
                        <div className="text-right">
                          <div className="text-sm text-emerald-400">ROI</div>
                          <div className="text-3xl font-bold text-emerald-400">
                            {results.roiPercent.toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-emerald-300 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        {results.netSavingsCad > 0
                          ? 'Scenario shows positive modeled savings under current assumptions'
                          : 'Modeled savings do not exceed CEIP fees at these inputs'}
                      </span>
                    </div>
                  </>
                )}
                {simulatorResult?.warnings.map((warning) => (
                  <p key={warning} className="mt-2 text-xs text-amber-200">
                    {warning}
                  </p>
                ))}
              </div>

              {/* Recommendation Badge — determined pathways only, never DI */}
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <span className="text-xs text-slate-400">Lowest-cost determined pathway: </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {pricingFreshnessGate.blocksStrongSavingsClaim || results.ratesStale
                    ? 'No ranking — refresh current source pricing and dated FX'
                    : results.recommendation.kind === 'market_credits'
                      ? 'Buy Market Credits'
                      : results.recommendation.kind === 'pay_fund'
                        ? 'Fund Payment'
                        : 'No recommendation — complete the inputs and pricing evidence'}
                </span>
              </div>

              {/* Uncertainty / eligibility boundary note (plain language) */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-xs text-slate-400 space-y-1">
                {results.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
                <p>
                  See{' '}
                  <a
                    href={TIER_REGULATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    Alberta&apos;s TIER regulation page
                    <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  for current guidance.
                </p>
              </div>

              {/* CTA */}
              {!pricingFreshnessGate.blocksStrongSavingsClaim &&
              results.netSavingsCad !== null &&
              isLeadIntakeEnabled() ? (
                <Link
                  to="/enterprise?tier=industrial&artifact=tier-cfo-memo"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  Request a human scenario review
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <p
                  role="status"
                  className="rounded-lg border border-slate-700 p-3 text-sm text-slate-400"
                >
                  Buyer follow-up is unavailable until current pricing, sourced FX, and privacy
                  collection gates pass.
                </p>
              )}
            </div>
          </div>

          {/* Trust Elements */}
          <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-slate-400">
                Published fund schedule + market scenario input
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-slate-400">3-Pathway Compliance Modeling</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-slate-400">Draft Scenario Exports</span>
            </div>
          </div>
        </div>

        {/* TIER Compliance Deadline Banner */}
        {!bannerDismissed && (
          <div className="mt-8 mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                TIER verified annual compliance reports due June 30 of the following year — start
                your 3-pathway memo now.
              </p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-400 hover:text-amber-300 text-sm"
              aria-label="Dismiss deadline banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* Lead Capture */}
        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <Mail className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Request TIER Scenario Follow-up</h3>
          <p className="text-sm text-slate-400 mb-4">
            The draft memo and scenario appendix are generated on this page — download them from the
            export panel above. Contact requests are available only when the privacy notice is
            approved.
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Changed scenario inputs are saved in this browser&apos;s local storage. Use Reset to
            remove the saved scenario from this device. Inputs are not submitted unless you
            explicitly request a pilot and submit while collection is enabled.
          </p>
          {emailSubmitted ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <span>
                Request saved. Download the memo and appendix from the export panel above — our team
                will follow up at your work email.
              </span>
            </div>
          ) : isLeadIntakeEnabled() ? (
            <>
              <PrivacyCollectionNotice className="mb-4 text-left" />
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={emailCapture}
                  onChange={(e) => setEmailCapture(e.target.value)}
                  placeholder="your@company.ca"
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleEmailSubmit}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors"
                >
                  Request follow-up
                </button>
              </div>
              {pilotRequestAllowed ? (
                <button
                  onClick={() => setShowPilotRequest(!showPilotRequest)}
                  className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  {showPilotRequest ? '− Hide pilot request' : '+ Request a TIER pilot'}
                </button>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Pilot requests stay unavailable until current source pricing, positive modeled net
                  savings, and dated FX are verified.
                </p>
              )}
              {showPilotRequest && pilotRequestAllowed && (
                <div className="mt-4 max-w-md mx-auto text-left">
                  <label className="block text-sm text-slate-400 mb-1">Your Name (optional)</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-3"
                  />
                  <label className="block text-sm text-slate-400 mb-1">Compliance Year</label>
                  <input
                    type="text"
                    value={complianceYear}
                    onChange={(e) => setComplianceYear(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-3"
                  />
                  <p className="text-xs text-slate-500">
                    Your facility emissions ({annualEmissions.toLocaleString()} tCO₂e) and benchmark
                    exceedance ({benchmarkExceedance.toLocaleString()} tCO₂e) will be included in
                    the pilot request.
                  </p>
                </div>
              )}
            </>
          ) : (
            <PrivacyCollectionNotice className="text-left" />
          )}
          {emailError && <p className="mt-3 text-sm text-rose-400">{emailError}</p>}
        </div>

        {/* Data Sources */}
        <div className="mt-6 text-xs text-slate-500 text-center space-y-1">
          <p>
            Data sources: Government of Alberta TIER materials plus route-level market pricing
            provenance when available.
          </p>
          <p>
            Fund price basis: CAD {FUND_PRICE}/t ({tierPricing.source}, effective{' '}
            {tierPricing.effectiveDate}). Market credit price:{' '}
            {liveTierMarketRateSource
              ? 'live route source shown above'
              : tierPricing.marketPriceDisclosure}{' '}
            Direct Investment eligibility and credit treatment remain undetermined until the current
            publication status of Alberta&apos;s Standard is verified; pathway economics are shown
            as an unverified range only.
          </p>
        </div>
      </section>
    </div>
  );
};

export default TIERROICalculator;
