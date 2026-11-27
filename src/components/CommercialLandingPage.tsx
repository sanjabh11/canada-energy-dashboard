import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCheck2,
  LineChart,
  LockKeyhole,
  Mail,
  Printer,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { trackEvent } from '../lib/analytics';
import { topCommercialWedges } from '../lib/commercialPositioning';
import { ALBERTA_PILOT_SKUS_CAD, formatCadHypothesis } from '../lib/pricingCatalog';
import {
  buildProductValueProof,
  buildProductValueSampleCsv,
  PRODUCT_VALUE_SAMPLE_LABEL,
  productValueProofJson,
  type ProductValueProof,
} from '../lib/productValueProof';
import {
  downloadBlob,
  downloadPdfArtifact,
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../lib/proofPack';

const MAX_BROWSER_CSV_BYTES = 1_000_000;

export function CommercialLandingPage() {
  const utilityWedge = topCommercialWedges.find((wedge) => wedge.id === 'utility-demand-forecast');
  const [csvText, setCsvText] = useState(() => buildProductValueSampleCsv());
  const [sourceLabel, setSourceLabel] = useState(PRODUCT_VALUE_SAMPLE_LABEL);
  const [fileError, setFileError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const proof = useMemo<ProductValueProof>(
    () => buildProductValueProof({ csvText, sourceLabel }),
    [csvText, sourceLabel],
  );

  useEffect(() => {
    trackEvent('tier_hero_view', { source: 'homepage', workflow: 'utility-proof' });
  }, []);

  const handleSample = () => {
    setCsvText(buildProductValueSampleCsv());
    setSourceLabel(PRODUCT_VALUE_SAMPLE_LABEL);
    setFileError(null);
    setExportMessage(null);
    trackEvent('utility_proof_sample_loaded', { source: 'homepage' });
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BROWSER_CSV_BYTES) {
      setFileError('Choose a CSV under 1 MB. The file is read locally and is never uploaded.');
      setCsvText('');
      setSourceLabel('Uploaded CSV (browser-only)');
      return;
    }
    try {
      const text = await file.text();
      setCsvText(text);
      setSourceLabel('Uploaded CSV (browser-only)');
      setFileError(null);
      setExportMessage(null);
      trackEvent('utility_proof_csv_loaded', { source: 'homepage', bytes: file.size });
    } catch {
      setFileError('The CSV could not be read in this browser session.');
      setCsvText('');
      setSourceLabel('Uploaded CSV (browser-only)');
    }
  };

  const downloadJson = () => {
    downloadBlob(
      new Blob([productValueProofJson(proof)], { type: 'application/json;charset=utf-8' }),
      'ceip-utility-proof.json',
    );
    setExportMessage('JSON sidecar prepared locally; raw CSV values were not retained.');
    trackEvent('utility_proof_export', { format: 'json', source: 'homepage' });
  };

  const downloadCsv = () => {
    if (!proof.forecastCsv) return;
    downloadBlob(
      new Blob([proof.forecastCsv], { type: 'text/csv;charset=utf-8' }),
      'ceip-utility-forecast.csv',
    );
    setExportMessage('Forecast CSV sidecar prepared locally.');
    trackEvent('utility_proof_export', { format: 'csv', source: 'homepage' });
  };

  const downloadAppendix = () => {
    if (!proof.benchmarkAppendix || !proof.descriptor) return;
    downloadTextArtifact(
      {
        ...proof.descriptor.definition,
        id: 'utility-benchmark-appendix',
        label: 'Benchmark appendix',
        format: 'md',
        filename: 'ceip-forecast-benchmark-appendix.md',
      },
      proof.benchmarkAppendix,
      'text/markdown;charset=utf-8',
    );
    setExportMessage('Benchmark Appendix prepared locally.');
    trackEvent('utility_proof_export', { format: 'benchmark-appendix', source: 'homepage' });
  };

  const downloadPdf = async () => {
    if (!proof.descriptor) return;
    await downloadPdfArtifact({
      ...proof.descriptor,
      definition: {
        ...proof.descriptor.definition,
        id: 'utility-planning-pack-pdf',
        label: 'Forecast + Benchmark Appendix',
        format: 'pdf',
        filename: 'forecast-benchmark-appendix.pdf',
      },
      title: 'CEIP Forecast + Benchmark Appendix',
      summary: `${proof.descriptor.summary} The current source remains browser-local and bounded to planning review.`,
      sections: [
        ...proof.descriptor.sections,
        {
          heading: 'Reviewer Acceptance checklist',
          kind: 'bullet_list',
          body: proof.reviewerChecklist,
        },
      ],
    });
    setExportMessage('Forecast + Benchmark Appendix PDF prepared locally.');
    trackEvent('utility_proof_export', { format: 'pdf', source: 'homepage' });
  };

  const printProof = () => {
    if (!proof.descriptor) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setExportMessage('Allow pop-ups to open the printable proof document.');
      return;
    }
    const printable = renderHtmlProofDocument({
      ...proof.descriptor,
      title: 'CEIP Forecast + Benchmark Appendix',
      sections: [
        ...proof.descriptor.sections,
        {
          heading: 'Reviewer Acceptance checklist',
          kind: 'bullet_list',
          body: proof.reviewerChecklist,
        },
      ],
    });
    printWindow.document.write(printable);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    trackEvent('utility_proof_print', { source: 'homepage' });
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-50"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <SEOHead
        title="CEIP | Browser-local utility forecast proof"
        description="Load a synthetic or redacted utility CSV, review privacy and provenance checks in your browser, and export a bounded forecast proof pack."
        path="/"
        keywords={[
          'utility demand forecasting',
          'CSV privacy proof',
          'forecast benchmark appendix',
          'Alberta energy planning',
        ]}
      />

      <main id="main-content">
        <header className="border-b border-white/10 bg-slate-950/95">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <Link to="/" className="flex items-center gap-3" aria-label="CEIP home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
                <LineChart className="h-5 w-5 text-cyan-200" />
              </span>
              <span>
                <span className="block text-sm uppercase tracking-[0.25em] text-cyan-200">
                  CEIP
                </span>
                <span className="block text-xs text-slate-400">
                  Prediction inside budget-owned energy workflows
                </span>
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <Link
                className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300/40"
                to="/solutions"
              >
                All proof packs
              </Link>
              <Link
                className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300/40"
                to="/pilot-readiness"
              >
                Pilot evidence
              </Link>
              <Link
                className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300/40"
                to="/dashboard"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        <section className="border-b border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_38%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#042f2e)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-emerald-100">
                <LockKeyhole className="h-4 w-4" /> Browser-local utility proof
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-emerald-200/90">
                desk-research hypotheses • buyer validation pending
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                Desk-research confidence — unvalidated: {utilityWedge?.score.toFixed(1) ?? '—'}/5
              </p>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
                Turn a messy load CSV into a reviewable forecast proof pack.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Load a synthetic sample or redacted interval file, inspect privacy and source-risk
                checks, and export a Forecast + Benchmark Appendix. This is a planning workflow—not
                utility approval, regulator evidence, or a validated commercial offer.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                Buyer demand, delivery time, pricing, savings, and procurement fit have not been
                validated; they remain unvalidated. Ontario GA ICI 5CP and BYO CSV privacy proof
                remain proposed workflow concepts for review, not commitments to deliver.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  No backend request
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  No raw CSV persistence
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  Proposed workflow concepts: 13 designed / 0 executed experiments
                </span>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-6 shadow-2xl shadow-cyan-950/30">
              <div className="flex items-center gap-3 text-cyan-100">
                <FileCheck2 className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.2em]">
                  What the reviewer receives
                </span>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                {[
                  'Privacy and linkage-risk screen',
                  'Source, freshness, and formula boundaries',
                  'Forecast CSV and JSON sidecars',
                  'Printable Forecast + Benchmark Appendix',
                  'Reviewer Acceptance checklist',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-5 lg:grid-cols-3">
            <StepCard number="01" title="Load" testId="commercial-step-1" active>
              <p className="text-sm leading-6 text-slate-300">
                Start with a deterministic synthetic fixture or choose a redacted CSV. The file is
                read only in this tab and is never sent to an API.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSample}
                  data-testid="commercial-load-sample"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                >
                  <FileCheck2 className="h-4 w-4" /> Use sample
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:border-cyan-300/50">
                  <Upload className="h-4 w-4" /> Choose CSV
                  <input
                    className="sr-only"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFile}
                    data-testid="commercial-csv-input"
                  />
                </label>
              </div>
              {fileError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100"
                >
                  {fileError}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-slate-500">Current source: {sourceLabel}</p>
            </StepCard>

            <StepCard number="02" title="Review" testId="commercial-step-2">
              <p className="text-sm leading-6 text-slate-300">
                Every status is a screening result. Review any warning before using an export
                outside this browser.
              </p>
              <div className="mt-4 space-y-2" data-testid="commercial-proof-checks">
                {proof.checks.map((check) => (
                  <CheckRow key={check.id} {...check} />
                ))}
              </div>
              {proof.report.privacy_review_warnings.length > 0 ? (
                <p
                  data-testid="commercial-privacy-warning"
                  className="mt-4 text-xs leading-5 text-amber-100"
                >
                  {proof.report.privacy_review_warnings[0]}
                </p>
              ) : null}
            </StepCard>

            <StepCard number="03" title="Export" testId="commercial-step-3">
              <p className="text-sm leading-6 text-slate-300">
                Exports contain derived findings and aggregate forecast evidence. They do not
                include the original CSV rows.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  disabled={!proof.descriptor}
                  onClick={() => void downloadPdf()}
                  data-testid="commercial-export-pdf"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-200"
                >
                  <Download className="h-4 w-4" /> Forecast + Appendix PDF
                </button>
                <button
                  type="button"
                  disabled={!proof.descriptor}
                  onClick={printProof}
                  data-testid="commercial-print"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-300/50"
                >
                  <Printer className="h-4 w-4" /> Printable document
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  data-testid="commercial-export-json"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:border-cyan-300/50"
                >
                  <Download className="h-4 w-4" /> JSON sidecar
                </button>
                <button
                  type="button"
                  disabled={!proof.forecastCsv}
                  onClick={downloadCsv}
                  data-testid="commercial-export-csv"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-300/50"
                >
                  <Download className="h-4 w-4" /> Forecast CSV
                </button>
                <button
                  type="button"
                  disabled={!proof.benchmarkAppendix}
                  onClick={downloadAppendix}
                  data-testid="commercial-export-appendix"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-300/50"
                >
                  <Download className="h-4 w-4" /> Benchmark Appendix
                </button>
              </div>
              {exportMessage ? (
                <p role="status" className="mt-4 text-xs leading-5 text-emerald-100">
                  {exportMessage}
                </p>
              ) : null}
            </StepCard>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section
              className="rounded-[1.8rem] border border-white/10 bg-slate-900/70 p-6"
              data-testid="commercial-proof-ready"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Proof boundary
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {proof.forecastPackage
                      ? 'A bounded planning package is ready'
                      : 'Resolve the CSV checks before exporting'}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  {proof.report.row_count.toLocaleString()} rows screened
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{proof.report.proof_boundary}</p>
              <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-50">
                No production onboarding, regulator submission, live telemetry, ROI, savings, or
                buyer-validation claim is made by this workflow.
              </div>
            </section>

            <section
              className="rounded-[1.8rem] border border-emerald-300/20 bg-emerald-300/5 p-6"
              data-testid="pilot-options-card"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">
                Hypothesis pricing only
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Pilot &amp; White-Label Options (CAD)</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Non-validated planning hypotheses. Procurement is entity-specific; these are not
                universal thresholds or checkout offers.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>
                  Municipal/waste pilot —{' '}
                  <strong>
                    {formatCadHypothesis(ALBERTA_PILOT_SKUS_CAD.municipal_waste_pilot)}
                  </strong>{' '}
                  one-time
                </li>
                <li>
                  GST planning estimate —{' '}
                  <strong>
                    {formatCadHypothesis(ALBERTA_PILOT_SKUS_CAD.gst_planning_estimate)}
                  </strong>
                </li>
                <li>
                  Consultant white-label —{' '}
                  <strong>
                    {formatCadHypothesis(ALBERTA_PILOT_SKUS_CAD.consultant_white_label)}
                  </strong>{' '}
                  monthly
                </li>
              </ul>
              <a
                data-testid="commercial-pilot-cta"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-100"
                href="mailto:sanjabh11@gmail.com?subject=CEIP%20utility%20proof%20pilot%20inquiry&body=I%20would%20like%20to%20discuss%20a%20browser-local%20utility%20proof%20workflow.%20No%20CSV%20data%20is%20included%20in%20this%20inquiry."
              >
                <Mail className="h-4 w-4" /> Discuss a hypothesis
              </a>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-slate-400">
            <span>
              Secondary surfaces remain available through the{' '}
              <Link className="text-cyan-200 hover:text-cyan-100" to="/solutions">
                All Proof Packs index
              </Link>
              .
            </span>
            <span>Buyer evidence: 0/13 executed</span>
          </div>
        </section>
      </main>
    </div>
  );
}
function StepCard({
  number,
  title,
  children,
  testId,
  active = false,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  testId: string;
  active?: boolean;
}) {
  return (
    <section
      data-testid={testId}
      className={`rounded-[1.8rem] border p-6 ${active ? 'border-cyan-300/35 bg-cyan-300/5' : 'border-white/10 bg-slate-900/70'}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold tracking-[0.2em] text-cyan-200">STEP {number}</span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function CheckRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'pass' | 'review' | 'blocked';
  detail: string;
}) {
  const color =
    status === 'pass'
      ? 'text-emerald-200'
      : status === 'review'
        ? 'text-amber-200'
        : 'text-rose-200';
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-slate-100">{label}</span>
        <span className={`text-xs uppercase tracking-[0.16em] ${color}`}>{status}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}
