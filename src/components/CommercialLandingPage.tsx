import React, { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Building2, ChevronRight, FileCheck2, LineChart, Shield, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import {
  buyerSegments,
  reserveWedges,
  segmentNarratives,
  supportSurfaces,
  topCommercialWedges,
  type BuyerSegment,
} from '../lib/commercialPositioning';

export function CommercialLandingPage() {
  const [activeSegment, setActiveSegment] = useState<BuyerSegment>('Utility');

  const activeNarrative = useMemo(
    () => segmentNarratives.find((segment) => segment.id === activeSegment) ?? segmentNarratives[0],
    [activeSegment],
  );

  const activeWedges = useMemo(
    () => topCommercialWedges.filter((wedge) => wedge.buyerSegment === activeSegment),
    [activeSegment],
  );

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <SEOHead
        title="CEIP | Alberta-First Energy Workflows for Utilities, Industrials, and Indigenous Projects"
        description="Commercial landing page for CEIP's top ten sellable Canadian utility and energy proof packs: forecasts, filings, benchmarks, asset decisions, security review, billing, TIER, reporting, APIs, and large-load readiness."
        path="/"
        keywords={[
          'Alberta energy software',
          'utility demand forecasting',
          'TIER compliance',
          'regulatory filing templates',
          'asset health index',
          'Indigenous energy reporting',
        ]}
      />

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.22),_transparent_32%),linear-gradient(135deg,_#020617,_#0f172a_50%,_#052e2b)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-6 py-6">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.16)]">
                  <LineChart className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">CEIP</div>
                  <div className="text-sm text-slate-300">Prediction inside budget-owned energy workflows</div>
                </div>
              </Link>

              <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <Link to="/solutions" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-300/40 hover:text-white">
                  Solutions
                </Link>
                <Link to="/pilot-readiness" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-300/40 hover:text-white">
                  Pilot readiness
                </Link>
                <a href="#proof" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-300/40 hover:text-white">
                  Proof
                </a>
                <Link to="/dashboard" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-300/40 hover:text-white">
                  Dashboard
                </Link>
                <Link
                  to="/enterprise"
                  className="rounded-full bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Start a Pilot
                </Link>
              </nav>
            </header>

            <div className="grid gap-12 py-16 lg:grid-cols-[1.3fr_0.9fr] lg:py-24">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
                  <Sparkles className="h-4 w-4" />
                  Alberta-first. Canada-expandable. Built for 30 to 60 day pilots.
                </div>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                  Sell the energy workflow that owns a budget, not the prediction demo that gets admired and parked.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                  CEIP now leads with ten proof packs that buyers can understand in under ninety seconds:
                  utility planning, regulatory filing, benchmark proof, asset-health justification, and procurement-ready trust.
                  Prediction stays central, but only where it changes a filing, savings estimate, capital plan, security review, or funder report.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/solutions"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    View the top 10 proof packs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/pilot-readiness"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/5"
                  >
                    Check pilot evidence gates
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  <MetricCard value="10" label="Sellable proof packs" />
                  <MetricCard value="30-60d" label="Target pilot path" />
                  <MetricCard value="Utility-first" label="Go-to-market sequence" />
                </div>
              </div>

              <div className="grid gap-4 self-start">
                {topCommercialWedges.map((wedge) => (
                  <Link
                    key={wedge.id}
                    to={wedge.href}
                    className="group rounded-[1.7rem] border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                          Rank {wedge.rank} • Demand {wedge.score.toFixed(1)}/5
                        </div>
                        <h2 className="mt-2 text-xl font-semibold text-white">{wedge.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{wedge.pain}</p>
                      </div>
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-medium text-cyan-100">
                        {wedge.buyerSegment}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                      <span>{wedge.timelineToValue}</span>
                      <span className="inline-flex items-center gap-1 text-cyan-200 transition group-hover:translate-x-0.5">
                        Open wedge
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="segments" className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-emerald-200/70">Segment Switcher</p>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                  The front door now starts from buyer pain, not from a generic dashboard.
                </h2>
              </div>
              <Link to="/solutions" className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">
                See the full use-case navigator →
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {buyerSegments.map((segment) => (
                <button
                  key={segment}
                  onClick={() => setActiveSegment(segment)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeSegment === segment
                      ? 'bg-emerald-300 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-300/30 hover:text-white'
                  }`}
                >
                  {segment}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(6,78,59,0.55),rgba(15,23,42,0.92))] p-8">
                <div className="flex items-center gap-3 text-emerald-100">
                  <Building2 className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-[0.22em]">Active segment</span>
                </div>
                <h3 className="mt-4 text-3xl font-semibold text-white">{activeNarrative.headline}</h3>
                <p className="mt-4 text-base leading-7 text-slate-200">{activeNarrative.summary}</p>
                <div className="mt-8 space-y-3">
                  {activeNarrative.priorities.map((priority) => (
                    <div
                      key={priority}
                      className="flex items-center gap-3 rounded-2xl border border-emerald-200/10 bg-black/10 px-4 py-3 text-sm text-slate-100"
                    >
                      <BadgeCheck className="h-4 w-4 text-emerald-200" />
                      <span>{priority}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {activeWedges.map((wedge) => (
                  <div key={wedge.id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">{wedge.primaryBuyer}</div>
                        <h4 className="mt-2 text-2xl font-semibold text-white">{wedge.title}</h4>
                      </div>
                      <Link to={wedge.href} className="rounded-full border border-cyan-300/25 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/10">
                        View page
                      </Link>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-300">{wedge.outcome}</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <InfoCell label="Why now" value={wedge.whyNow} />
                      <InfoCell label="Minimum pilot" value={wedge.pilotScope} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="proof" className="border-b border-white/10 bg-slate-900/70">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-center gap-3 text-cyan-200">
              <FileCheck2 className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.28em]">Proof ribbon</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
              The new primary journey points buyers to proof pages, not to generic surface area.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              Forecast benchmarking, utility-security disclosure, and program-specific reporting proof stay visible.
              The broad dashboard, sandbox connector demo, and illustrative API-doc surface are intentionally secondary.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {supportSurfaces.map((surface) => (
                <Link
                  key={surface.id}
                  to={surface.href}
                  className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:border-cyan-300/30 hover:bg-white/10"
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Supporting proof</div>
                  <h3 className="mt-2 text-xl font-semibold text-white">{surface.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{surface.role}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(4,47,46,0.92))] p-8 md:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-[0.22em]">Trust strip</span>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-white">
                    Stronger first impression, stricter truth model.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                    Page one now explains what CEIP sells before it asks for attention. It foregrounds budget-owned workflows,
                    acknowledges where proof is strong, and keeps demo-heavy or fallback-heavy surfaces out of the primary conversion path.
                  </p>
                </div>

                <div className="grid gap-4">
                  <TrustCell
                    icon={<Zap className="h-4 w-4 text-amber-200" />}
                    title="Prediction is still central"
                    body="It is now framed as the decision engine inside filings, savings cases, maintenance prioritization, and grant reporting."
                  />
                  <TrustCell
                    icon={<Shield className="h-4 w-4 text-cyan-200" />}
                    title="Connector truth stays explicit"
                    body="Utility onboarding is not presented as production approval, and interval-cadence claims remain conservative."
                  />
                  <TrustCell
                    icon={<LineChart className="h-4 w-4 text-emerald-200" />}
                    title="Primary CTA is commercial"
                    body="The route structure now drives buyers toward the top ten proof packs and a pilot conversation before any broad dashboard exploration."
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row">
                <Link
                  to="/solutions"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                >
                  Open the solutions navigator
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/pilot-readiness"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/5"
                >
                  Check pilot readiness
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/5"
                >
                  Keep the dashboard as secondary proof
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {reserveWedges.map((wedge) => (
                <Link
                  key={wedge.id}
                  to={wedge.href}
                  className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Reserve lane</div>
                  <h3 className="mt-2 text-xl font-semibold text-white">{wedge.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{wedge.currentState}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-black/15 p-5 backdrop-blur">
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-300">{label}</div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-200">{value}</div>
    </div>
  );
}

function TrustCell({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">{icon}</div>
        <div className="text-base font-semibold text-white">{title}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
