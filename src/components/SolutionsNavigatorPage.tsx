import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Clock3, FileSearch, ShieldCheck, Target } from 'lucide-react';
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

export function SolutionsNavigatorPage() {
  const [activeSegment, setActiveSegment] = useState<BuyerSegment>('Utility');

  const filteredWedges = useMemo(() => {
    return topCommercialWedges.filter(
      (wedge) => wedge.buyerSegment === activeSegment || wedge.buyerSegment === 'Utility',
    );
  }, [activeSegment]);

  const activeNarrative = useMemo(
    () => segmentNarratives.find((segment) => segment.id === activeSegment) ?? segmentNarratives[0],
    [activeSegment],
  );

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <SEOHead
        title="CEIP Solutions | Alberta-First Energy Use Cases and Pilot Wedges"
        description="Solutions navigator for CEIP's top commercial wedges, including buyer, pain, proof artifact, timeline to value, and minimum pilot scope."
        path="/solutions"
        keywords={[
          'energy software use cases',
          'utility pilots Alberta',
          'industrial compliance software',
          'Indigenous energy reporting',
          'utility asset health',
        ]}
      />

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.16),_transparent_35%),linear-gradient(180deg,_rgba(2,6,23,1),_rgba(15,23,42,0.95))]" />
          <div className="relative mx-auto max-w-7xl px-6 py-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10">
                  <Target className="h-5 w-5 text-emerald-100" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.26em] text-emerald-100/80">Solutions</div>
                  <div className="text-sm text-slate-300">The page-two use-case navigator for buyers and pilots</div>
                </div>
              </div>

              <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <Link to="/" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-emerald-300/30 hover:text-white">
                  Home
                </Link>
                <Link to="/dashboard" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-emerald-300/30 hover:text-white">
                  Dashboard
                </Link>
                <Link to="/enterprise" className="rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200">
                  Start a pilot
                </Link>
              </nav>
            </header>

            <div className="py-16">
              <div className="max-w-4xl">
                <div className="text-sm uppercase tracking-[0.26em] text-cyan-200/80">Page two</div>
                <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
                  Each wedge now explains who buys it, why they pay, what proof they need, and how little CEIP has to build first.
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-300">
                  This page is the commercial navigator. It is designed to get a utility planner, industrial compliance lead,
                  Indigenous project team, or municipal operator to the right wedge with one click and one credible proof path.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {buyerSegments.map((segment) => (
                  <button
                    key={segment}
                    onClick={() => setActiveSegment(segment)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      activeSegment === segment
                        ? 'bg-cyan-300 text-slate-950'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/30 hover:text-white'
                    }`}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(6,78,59,0.55))] p-8">
              <div className="flex items-center gap-3 text-cyan-100">
                <Building2 className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.22em]">Current segment</span>
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white">{activeNarrative.headline}</h2>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">{activeNarrative.summary}</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.26em] text-cyan-200/80">Top 10 proof packs</div>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                  Use cases optimized for fast buyer comprehension and first pilots
                </h2>
              </div>
              <Link to="/enterprise" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/5 md:inline-flex">
                Start the conversation
              </Link>
            </div>

            <div className="mt-10 space-y-6">
              {filteredWedges.map((wedge) => (
                <article
                  key={wedge.id}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur md:p-8"
                >
                  <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
                          Rank {wedge.rank} • Demand {wedge.score.toFixed(1)}/5
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
                          {wedge.buyerSegment}
                        </div>
                      </div>

                      <h3 className="mt-4 text-3xl font-semibold text-white">{wedge.title}</h3>
                      <p className="mt-4 text-base leading-7 text-slate-300">{wedge.pain}</p>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <DetailCard label="Primary buyer" value={wedge.primaryBuyer} icon={<Building2 className="h-4 w-4 text-emerald-200" />} />
                        <DetailCard label="Timeline to value" value={wedge.timelineToValue} icon={<Clock3 className="h-4 w-4 text-cyan-200" />} />
                        <DetailCard label="Minimum pilot scope" value={wedge.pilotScope} icon={<Target className="h-4 w-4 text-amber-200" />} />
                        <DetailCard label="Current state" value={wedge.currentState} icon={<CheckCircle2 className="h-4 w-4 text-emerald-200" />} />
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <Panel title="What this solves" body={wedge.outcome} />
                      <Panel title="Why this can close now" body={wedge.whyNow} />
                      <Link
                        to={wedge.proofHref}
                        className="rounded-[1.4rem] border border-emerald-200/15 bg-emerald-400/10 p-5 transition hover:border-emerald-200/25 hover:bg-emerald-400/15"
                      >
                        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-emerald-100">
                          <FileSearch className="h-4 w-4" />
                          Proof artifact
                        </div>
                        <div className="mt-3 text-lg font-semibold text-white">{wedge.proofLabel}</div>
                        <div className="mt-2 text-sm text-slate-200">Open supporting proof page →</div>
                      </Link>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                          to={wedge.href}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                        >
                          Open wedge
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/enterprise"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/5"
                        >
                          Talk to sales
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="text-sm uppercase tracking-[0.26em] text-emerald-100/75">Supporting proof</div>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              These routes stay visible, but they no longer lead the commercial story.
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {supportSurfaces.map((surface) => (
                <Link
                  key={surface.id}
                  to={surface.href}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-300/25 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-emerald-100/80">
                    <ShieldCheck className="h-4 w-4" />
                    Proof lane
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{surface.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{surface.role}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-8">
                <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Reserve lanes</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">Follow-on wedges after the first five</h2>
                <div className="mt-6 space-y-4">
                  {reserveWedges.map((wedge) => (
                    <Link key={wedge.id} to={wedge.href} className="block rounded-[1.2rem] border border-white/10 bg-black/10 p-4 transition hover:border-white/20">
                      <div className="text-base font-semibold text-white">{wedge.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{wedge.currentState}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(145deg,rgba(6,78,59,0.55),rgba(15,23,42,0.94))] p-8">
                <div className="text-sm uppercase tracking-[0.24em] text-emerald-100/75">Execution bias</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">Build 25% to 40% first, then sell.</h2>
                <p className="mt-4 text-base leading-7 text-slate-200">
                  The implementation strategy now favors minimum sellable slices: enough proof, export behavior, trust copy,
                  and buyer-specific language to win pilots before expanding the full platform scope.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/enterprise"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                  >
                    Start pilot outreach
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/30 hover:bg-white/5"
                  >
                    Return home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-black/10 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-200">{value}</div>
    </div>
  );
}

function Panel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/50 p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{title}</div>
      <div className="mt-3 text-sm leading-6 text-slate-200">{body}</div>
    </div>
  );
}
