import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Clock3, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import {
  buildIciFiveCpDecisionSupportReport,
  iciFiveCpReportToMarkdown,
  type IciPeakRiskWindow,
  type IciSystemPeakHour,
  type IciCustomerLoadHour,
} from '../lib/gaIciPeakPredictor';

const SAMPLE_SYSTEM_PEAKS: IciSystemPeakHour[] = [
  { timestamp: '2026-07-08T18:00:00.000Z', ontario_demand_mw: 22540, status: 'candidate', source: 'IESO peak tracker sample' },
  { timestamp: '2026-07-15T19:00:00.000Z', ontario_demand_mw: 22380, status: 'candidate', source: 'IESO peak tracker sample' },
  { timestamp: '2026-08-03T18:00:00.000Z', ontario_demand_mw: 22290, status: 'forecast', source: 'IESO peak tracker sample' },
  { timestamp: '2026-07-22T20:00:00.000Z', ontario_demand_mw: 22070, status: 'forecast', source: 'IESO peak tracker sample' },
  { timestamp: '2026-08-11T19:00:00.000Z', ontario_demand_mw: 21960, status: 'candidate', source: 'IESO peak tracker sample' },
  { timestamp: '2026-06-29T18:00:00.000Z', ontario_demand_mw: 21820, status: 'prelim', source: 'IESO peak tracker sample' },
  { timestamp: '2026-08-19T20:00:00.000Z', ontario_demand_mw: 21640, status: 'forecast', source: 'IESO peak tracker sample' },
  { timestamp: '2026-09-02T19:00:00.000Z', ontario_demand_mw: 21510, status: 'candidate', source: 'IESO peak tracker sample' },
  { timestamp: '2026-06-18T17:00:00.000Z', ontario_demand_mw: 21380, status: 'prelim', source: 'IESO peak tracker sample' },
  { timestamp: '2026-07-30T18:00:00.000Z', ontario_demand_mw: 21230, status: 'forecast', source: 'IESO peak tracker sample' },
];

const SAMPLE_CUSTOMER_LOAD: IciCustomerLoadHour[] = [
  { timestamp: '2026-07-08T18:00:00.000Z', load_mw: 8.4 },
  { timestamp: '2026-07-15T19:00:00.000Z', load_mw: 7.9 },
  { timestamp: '2026-08-03T18:00:00.000Z', load_mw: 8.1 },
  { timestamp: '2026-07-22T20:00:00.000Z', load_mw: 7.7 },
  { timestamp: '2026-08-11T19:00:00.000Z', load_mw: 7.4 },
  { timestamp: '2026-06-29T18:00:00.000Z', load_mw: 7.1 },
  { timestamp: '2026-08-19T20:00:00.000Z', load_mw: 7.0 },
  { timestamp: '2026-09-02T19:00:00.000Z', load_mw: 6.8 },
  { timestamp: '2026-06-18T17:00:00.000Z', load_mw: 6.5 },
  { timestamp: '2026-07-30T18:00:00.000Z', load_mw: 6.2 },
];

function formatNumber(value: number | null, digits = 3): string {
  return value === null ? 'Missing' : value.toFixed(digits);
}

function formatActionLabel(window: IciPeakRiskWindow): string {
  if (window.action_label === 'curtail_if_operationally_safe') return 'Curtail if operationally safe';
  if (window.action_label === 'history_only') return 'History only';
  return 'Watch';
}

export function GaIciPeakPredictorPage() {
  const report = useMemo(() => buildIciFiveCpDecisionSupportReport({
    systemPeaks: SAMPLE_SYSTEM_PEAKS,
    customerLoad: SAMPLE_CUSTOMER_LOAD,
    basePeriodStart: '2026-05-01',
    basePeriodEnd: '2027-04-30',
    generatedAt: '2026-05-31T00:00:00.000Z',
  }), []);

  const markdown = useMemo(() => iciFiveCpReportToMarkdown(report), [report]);

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
      data-testid="ga-ici-5cp-page"
    >
      <SEOHead
        title="Ontario GA/ICI 5CP Decision Support | CEIP"
        description="A bounded Ontario GA and ICI 5CP decision-support proof pack using candidate peak hours, supplied load, source links, and explicit do-not-claim boundaries."
        path="/ga-ici-5cp"
        keywords={[
          'Ontario GA ICI 5CP',
          'IESO peak tracker',
          'Class A global adjustment',
          'peak demand factor',
          'energy proof pack',
        ]}
      />

      <main id="main-content">
        <section className="border-b border-white/10 bg-[linear-gradient(135deg,#020617,#0f172a_58%,#0f3b3e)]">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10">
                  <BarChart3 className="h-5 w-5 text-cyan-100" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-cyan-100/80">Ontario GA/ICI</div>
                  <div className="text-sm text-slate-300">5CP decision-support prototype</div>
                </div>
              </Link>

              <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <Link to="/utility-demand-forecast" className="rounded-lg border border-white/10 px-4 py-2 transition hover:border-cyan-300/40 hover:text-white">
                  Utility forecast
                </Link>
                <Link to="/forecast-benchmarking" className="rounded-lg border border-white/10 px-4 py-2 transition hover:border-cyan-300/40 hover:text-white">
                  Forecast trust
                </Link>
                <Link to="/byo-csv-proof" className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200">
                  CSV proof
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </nav>
            </header>

            <div className="grid gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">Bounded wedge route</div>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                  Ontario GA/ICI 5CP Decision Support
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                  This prototype turns candidate IESO peak hours and buyer-supplied interval load into a reviewable
                  watchlist. It estimates exposure for planning conversations, not final settlement, eligibility,
                  legal advice, or operational control.
                </p>
              </div>

              <div className="grid gap-3 self-start" aria-label="GA ICI summary metrics">
                <SummaryMetric label="Estimated peak demand factor" value={formatNumber(report.estimated_peak_demand_factor, 6)} />
                <SummaryMetric label="Top five customer load" value={`${formatNumber(report.top_five_customer_load_mwh, 2)} MWh`} />
                <SummaryMetric label="Watchlist windows" value={String(report.watchlist.length)} />
                <SummaryMetric label="Base period" value={`${report.base_period.start} to ${report.base_period.end}`} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="flex items-center gap-3 text-cyan-100">
              <Clock3 className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.24em]">Top 10 candidate windows</span>
            </div>
            <div className="mt-6 overflow-x-auto rounded-lg border border-white/10" data-testid="ga-ici-watchlist">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Ontario demand MW</th>
                    <th className="px-4 py-3">Customer load MW</th>
                    <th className="px-4 py-3">Estimated PDF</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Planning label</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-slate-900/35 text-slate-200">
                  {report.watchlist.map((window) => (
                    <tr key={`${window.rank}-${window.timestamp}`}>
                      <td className="px-4 py-3 font-semibold text-white">{window.rank}</td>
                      <td className="px-4 py-3">{window.timestamp}</td>
                      <td className="px-4 py-3">{window.ontario_demand_mw.toLocaleString()}</td>
                      <td className="px-4 py-3">{formatNumber(window.customer_load_mw, 2)}</td>
                      <td className="px-4 py-3">{formatNumber(window.estimated_peak_demand_factor, 6)}</td>
                      <td className="px-4 py-3 capitalize">{window.status}</td>
                      <td className="px-4 py-3">{formatActionLabel(window)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-900/45">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="flex items-center gap-3 text-amber-100">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.24em]">Proof boundary</span>
              </div>
              <p className="mt-4 text-base leading-7 text-slate-200">{report.claim_boundary}</p>
              <ul className="mt-6 grid gap-3 text-sm leading-6 text-slate-300">
                {report.do_not_claim.map((claim) => (
                  <li key={claim} className="flex gap-3 rounded-lg border border-amber-200/15 bg-amber-300/10 p-4">
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-amber-100" />
                    <span>Do-not-claim boundary: {claim}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 text-cyan-100">
                <FileText className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.24em]">Markdown proof artifact</span>
              </div>
              <pre className="mt-4 max-h-[34rem] overflow-auto rounded-lg border border-white/10 bg-black/35 p-5 text-xs leading-6 text-slate-200">
                {markdown}
              </pre>
            </div>
          </div>
        </section>

        <section className="bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="grid gap-4 md:grid-cols-3">
              {report.source_urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-cyan-100 transition hover:border-cyan-300/40 hover:text-white"
                >
                  {url}
                </a>
              ))}
            </div>
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

export default GaIciPeakPredictorPage;
