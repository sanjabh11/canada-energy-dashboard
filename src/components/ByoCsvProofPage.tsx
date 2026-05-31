import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, FileText, LockKeyhole, ShieldCheck, TableProperties, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import {
  buildByoCsvProofReport,
  byoCsvProofReportToMarkdown,
  type ByoCsvColumnProfile,
} from '../lib/byoCsvProofGenerator';

const CLEAN_SAMPLE = [
  'timestamp,feeder_id,demand_mw,temperature_c',
  '2026-01-01T00:00:00.000Z,FDR-1,12.5,-6',
  '2026-01-01T01:00:00.000Z,FDR-1,13.1,-7',
  '2026-01-01T02:00:00.000Z,FDR-1,12.9,-7',
].join('\n');

const IDENTIFIER_RISK_SAMPLE = [
  'timestamp,account_id,email,demand_mw',
  '2026-01-01T00:00:00.000Z,account id: ABCD-1234,ops@example.com,12.5',
  '2026-01-01T01:00:00.000Z,account id: ABCD-1234,ops@example.com,13.1',
].join('\n');

function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

export function ByoCsvProofPage() {
  const [csvText, setCsvText] = useState(CLEAN_SAMPLE);
  const [sourceLabel, setSourceLabel] = useState('buyer-redacted-load.csv');
  const [route, setRoute] = useState('/utility-demand-forecast');

  const report = useMemo(() => buildByoCsvProofReport({
    csvText,
    sourceLabel,
    route,
    generatedAt: '2026-05-31T00:00:00.000Z',
  }), [csvText, route, sourceLabel]);

  const markdown = useMemo(() => byoCsvProofReportToMarkdown(report), [report]);

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
      data-testid="byo-csv-proof-page"
    >
      <SEOHead
        title="BYO-CSV Proof Generator | CEIP"
        description="A bounded BYO-CSV proof-pack route for schema, completeness, and direct-identifier screening without retaining raw values in the generated report."
        path="/byo-csv-proof"
        keywords={[
          'BYO CSV proof pack',
          'utility data intake',
          'direct identifier screening',
          'forecast evidence gate',
          'energy buyer data review',
        ]}
      />

      <main id="main-content">
        <section className="border-b border-white/10 bg-[linear-gradient(135deg,#020617,#0f172a_58%,#123229)]">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10">
                  <LockKeyhole className="h-5 w-5 text-emerald-100" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-emerald-100/80">BYO-CSV proof</div>
                  <div className="text-sm text-slate-300">Schema and direct-identifier screening</div>
                </div>
              </Link>

              <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <Link to="/ga-ici-5cp" className="rounded-lg border border-white/10 px-4 py-2 transition hover:border-emerald-300/40 hover:text-white">
                  GA/ICI 5CP
                </Link>
                <Link to="/pilot-readiness" className="rounded-lg border border-white/10 px-4 py-2 transition hover:border-emerald-300/40 hover:text-white">
                  Pilot gate
                </Link>
                <Link to="/utility-demand-forecast" className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200">
                  Forecast route
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </nav>
            </header>

            <div className="grid gap-10 py-14 lg:grid-cols-[1.12fr_0.88fr] lg:py-20">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-emerald-200/80">Buyer evidence intake</div>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                  BYO-CSV Privacy Proof Generator
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                  Paste a redacted CSV sample to generate a reviewable report covering headers, row count,
                  completeness, inferred column type, and direct-identifier findings. The report does not retain
                  raw values and does not certify privacy status.
                </p>
              </div>

              <div className="grid gap-3 self-start" data-testid="byo-csv-proof-report">
                <SummaryMetric label="Rows" value={String(report.row_count)} />
                <SummaryMetric label="Columns" value={String(report.column_count)} />
                <SummaryMetric label="Retained raw values" value={formatBoolean(report.retained_raw_values)} />
                <SummaryMetric label="Direct identifier findings" value={String(report.direct_identifier_findings.length)} />
                <SummaryMetric label="Confidence gate ready" value={formatBoolean(report.confidence_gate_ready)} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <div className="flex items-center gap-3 text-emerald-100">
                <Upload className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.24em]">CSV sample</span>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm text-slate-300">
                  Source label
                  <input
                    value={sourceLabel}
                    onChange={(event) => setSourceLabel(event.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/50"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  Route under review
                  <select
                    value={route}
                    onChange={(event) => setRoute(event.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/50"
                  >
                    <option value="/utility-demand-forecast">/utility-demand-forecast</option>
                    <option value="/ga-ici-5cp">/ga-ici-5cp</option>
                    <option value="/forecast-benchmarking">/forecast-benchmarking</option>
                    <option value="/pilot-readiness">/pilot-readiness</option>
                  </select>
                </label>
                <textarea
                  aria-label="CSV text"
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  className="min-h-72 rounded-lg border border-white/10 bg-black/35 p-4 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-emerald-300/50"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceLabel('buyer-redacted-load.csv');
                      setCsvText(CLEAN_SAMPLE);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Use redacted sample
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceLabel('raw-customer-load.csv');
                      setCsvText(IDENTIFIER_RISK_SAMPLE);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Use identifier-risk sample
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 text-emerald-100">
                <TableProperties className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.24em]">Column profile</span>
              </div>
              <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Column</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Non-empty</th>
                      <th className="px-4 py-3">Empty</th>
                      <th className="px-4 py-3">Identifier risk</th>
                      <th className="px-4 py-3">Labels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-slate-900/35 text-slate-200">
                    {report.column_profiles.map((profile) => (
                      <ColumnProfileRow key={profile.column} profile={profile} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-lg border border-amber-200/15 bg-amber-300/10 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  Proof boundary
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{report.proof_boundary}</p>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-300">
                  {report.do_not_claim.map((claim) => (
                    <li key={claim}>Do-not-claim boundary: {claim}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/45">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="flex items-center gap-3 text-emerald-100">
              <FileText className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.24em]">Markdown proof artifact</span>
            </div>
            <pre className="mt-4 max-h-[34rem] overflow-auto rounded-lg border border-white/10 bg-black/35 p-5 text-xs leading-6 text-slate-200">
              {markdown}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function ColumnProfileRow({ profile }: { profile: ByoCsvColumnProfile }) {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-white">{profile.column}</td>
      <td className="px-4 py-3 capitalize">{profile.inferred_type}</td>
      <td className="px-4 py-3">{profile.non_empty_count}</td>
      <td className="px-4 py-3">{profile.empty_count}</td>
      <td className="px-4 py-3">{formatBoolean(profile.direct_identifier_risk)}</td>
      <td className="px-4 py-3">{profile.risk_labels.join(', ') || 'none'}</td>
    </tr>
  );
}

export default ByoCsvProofPage;
