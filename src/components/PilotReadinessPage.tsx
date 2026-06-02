import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ClipboardCheck, FileSearch, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import {
  getPilotEvidenceCoverageSummary,
  pilotConfidenceRules,
  pilotEvidenceRequirements,
  pilotIntakeRoutePlans,
  pilotMinimumEvidenceLanes,
  pilotNinetyFiveGateCommand,
  pilotNinetyFiveGates,
  pilotOperatorCommands,
  pilotOutcomeMetrics,
  pilotStopConditions,
} from '../lib/pilotEvidence';

export function PilotReadinessPage() {
  const summary = getPilotEvidenceCoverageSummary();
  const [selectedRoute, setSelectedRoute] = useState(pilotIntakeRoutePlans[0]?.route ?? '');
  const selectedPlan = useMemo(
    () => pilotIntakeRoutePlans.find((plan) => plan.route === selectedRoute) ?? pilotIntakeRoutePlans[0],
    [selectedRoute],
  );

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <SEOHead
        title="CEIP Pilot Readiness | Evidence Intake and Confidence Gates"
        description="Buyer evidence checklist for CEIP utility, TIER, billing, asset, and security proof-pack pilots. Shows what data is required before stronger market claims are allowed."
        path="/pilot-readiness"
        keywords={[
          'utility pilot evidence',
          'TIER compliance pilot',
          'forecast validation checklist',
          'energy proof pack pilot',
          'utility procurement evidence',
        ]}
      />

      <main id="main-content">
        <section className="border-b border-white/10 bg-[linear-gradient(135deg,#020617,#0f172a_55%,#052e2b)]">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10">
                  <ClipboardCheck className="h-5 w-5 text-emerald-100" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.28em] text-emerald-100/80">Pilot readiness</div>
                  <div className="text-sm text-slate-300">Evidence gates before stronger market claims</div>
                </div>
              </Link>

              <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <Link to="/solutions" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-emerald-300/35 hover:text-white">
                  Solutions
                </Link>
                <Link to="/utility-demand-forecast" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-emerald-300/35 hover:text-white">
                  Utility forecast
                </Link>
                <Link to="/enterprise" className="rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200">
                  Start a pilot
                </Link>
              </nav>
            </header>

            <div className="grid gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
              <div>
                <div className="text-sm uppercase tracking-[0.26em] text-cyan-200/80">Confidence gate</div>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                  CEIP has a 95/100 desk-research strategy direction. Buyer evidence is what moves market confidence.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                  This page shows the exact inputs needed before CEIP can honestly move from public-system,
                  starter, or constructed proof into buyer-specific claims. It keeps pilots fast while blocking
                  production utility, trading, engineering, certification, and real-customer-data overclaims.
                </p>
              </div>

              <div className="grid gap-4 self-start">
                <Metric value={`${summary.requirementCount}`} label="Evidence items" />
                <Metric value={`${summary.laneCount}`} label="Buyer lanes" />
                <Metric value={`${summary.confidenceRuleCount}`} label="Confidence rules" />
                <Metric value={`${summary.ninetyFiveGateCount}`} label="95% gates" />
                <Metric value={`${summary.minimumLaneCount}`} label="Minimum lanes" />
                <Metric value={`${summary.operatorCommandCount}`} label="Operator commands" />
                <Metric value={`${summary.intakeRoutePlanCount}`} label="Route planners" />
                <Metric value={`${summary.outcomeMetricCount}`} label="Outcome metrics" />
                <Metric value={`${summary.stopConditionCount}`} label="Stop conditions" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="text-sm uppercase tracking-[0.26em] text-cyan-100/80">Operator runbook</div>
                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                  The practical next step is a three-lane buyer-evidence workspace, not another demo.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  Use this sequence with real anonymized buyer activity only. It creates the collection workspace,
                  records route-specific outreach, attaches retained text-inspectable artifacts, and keeps the hard
                  95% gate blocked until the evidence is actually present.
                </p>
              </div>

              <div className="grid gap-4">
                {pilotMinimumEvidenceLanes.map((lane) => (
                  <article key={lane.id} className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white">{lane.label}</h3>
                      <div className="text-xs uppercase tracking-[0.18em] text-cyan-100">
                        {lane.routeOptions.join(' or ')}
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-200 md:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Proof pack</dt>
                        <dd className="mt-1">{lane.proofPackOptions.join(' or ')}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Manual input</dt>
                        <dd className="mt-1">{lane.requiredManualInput}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Acceptance signal</dt>
                        <dd className="mt-1">{lane.acceptanceSignal}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4">
              {pilotOperatorCommands.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">
                        Step {index + 1}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-white">{item.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.whenToUse}</p>
                    </div>
                    <div className="w-full overflow-x-auto rounded-xl border border-emerald-200/15 bg-slate-950 p-3 lg:max-w-2xl">
                      <code className="whitespace-nowrap text-xs leading-6 text-emerald-100">{item.command}</code>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {selectedPlan && (
              <div className="mt-10 rounded-[1.5rem] border border-emerald-200/15 bg-emerald-300/[0.06] p-6">
                <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                  <div>
                    <div className="text-sm uppercase tracking-[0.26em] text-emerald-100/80">
                      Route-aware intake planner
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                      Pick the proof-pack lane before running a real outreach or intake command.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      The selector keeps the route, proof_pack_id, buyer lane, manual input, and do-not-claim boundary
                      together. It still creates collection records only; confidence movement stays blocked until retained
                      buyer artifacts, reviewer acceptance, day-14 proceed, and commercial evidence are attached.
                    </p>

                    <label htmlFor="pilot-intake-route" className="mt-6 block text-sm font-semibold text-emerald-100">
                      Buyer proof-pack route
                    </label>
                    <select
                      id="pilot-intake-route"
                      value={selectedRoute}
                      onChange={(event) => setSelectedRoute(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-emerald-200/25 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-200 focus:ring-2 focus:ring-emerald-200/20"
                    >
                      {pilotIntakeRoutePlans.map((plan) => (
                        <option key={plan.route} value={plan.route}>
                          {plan.label} ({plan.route})
                        </option>
                      ))}
                    </select>

                    <dl className="mt-5 grid gap-3 text-sm leading-6 text-slate-200">
                      <RoutePlanInfo label="Buyer lane" value={selectedPlan.buyerLane} />
                      <RoutePlanInfo label="Proof pack ID" value={selectedPlan.proofPackId} />
                      <RoutePlanInfo label="Current rating" value={`${selectedPlan.rating}/5 before buyer evidence`} />
                      <RoutePlanInfo label="Required manual input" value={selectedPlan.requiredInput} />
                    </dl>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Claim boundary</div>
                      <div className="mt-2 text-sm leading-6 text-slate-200">{selectedPlan.claimBoundary}</div>
                      <div className="mt-3 text-xs uppercase tracking-[0.2em] text-amber-100">Do not claim</div>
                      <div className="mt-2 text-sm leading-6 text-slate-200">{selectedPlan.doNotClaim}</div>
                    </div>

                    <CommandBlock label="Append outreach row" command={selectedPlan.outreachCommand} />
                    <CommandBlock label="Create intake packet" command={selectedPlan.intakePacketCommand} />
                    <CommandBlock label="Attach retained artifact" command={selectedPlan.registerUpdateCommand} />

                    <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-5 text-sm leading-6 text-slate-200">
                      Run the 95% retained-evidence gate only after all three minimum lanes have accepted buyer artifacts,
                      matching SHA-256 references, complete reviewer feedback, day_14_decision=proceed, and a real
                      commercial signal.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-center gap-3 text-cyan-100">
              <FileSearch className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.26em]">Evidence intake</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
              What the buyer must supply before stronger claims are allowed
            </h2>

            <div className="mt-10 grid gap-5">
              {pilotEvidenceRequirements.map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
                          {item.lane}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                          {item.requiredFor}
                        </span>
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{item.minimumInput}</p>
                      <Link
                        to={item.route}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                      >
                        Open route
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Info label="Artifact" value={item.artifact} />
                      <Info label="Accepted formats" value={item.acceptedFormats.join(', ')} />
                      <div className="rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4 md:col-span-2">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-100">
                          <LockKeyhole className="h-4 w-4" />
                          Blocked without evidence
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-100">{item.blockedClaim}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Acceptance checks</div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                          {item.acceptance.map((check) => (
                            <li key={check} className="flex gap-2">
                              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                              <span>{check}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-center gap-3 text-emerald-100">
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.26em]">Pilot outcome scorecard</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
              What must be measured before CEIP can claim stronger market proof
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              These metrics keep the 14-day pilot focused on evidence that a buyer can review, reuse, and challenge.
              They do not replace buyer data; they define how buyer data changes confidence.
            </p>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {pilotOutcomeMetrics.map((metric) => (
                <article key={metric.id} className="rounded-[1.5rem] border border-emerald-200/15 bg-emerald-300/[0.06] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-white">{metric.label}</h3>
                    <Link
                      to={metric.route}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/50 hover:text-white"
                    >
                      Evidence route
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <dl className="mt-5 space-y-4 border-t border-white/10 pt-5 text-sm leading-6">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Required evidence</dt>
                      <dd className="mt-1 text-slate-200">{metric.requiredEvidence}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Measurement syntax</dt>
                      <dd className="mt-1 text-slate-200">{metric.howToMeasure}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Confidence use</dt>
                      <dd className="mt-1 text-slate-200">{metric.confidenceUse}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <div className="text-sm uppercase tracking-[0.26em] text-cyan-100/80">95% market gate</div>
                <h2 className="mt-4 text-3xl font-semibold text-white">
                  CEIP cannot claim 95% until the filled buyer-evidence register passes this gate.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  This command is the hard stop before moving from strategic readiness to stronger market-confidence language.
                  Public samples, constructed cases, and single-route pilot wins are not enough.
                </p>
                <div className="mt-6 overflow-x-auto rounded-2xl border border-cyan-200/15 bg-black/30 p-4">
                  <code className="whitespace-nowrap text-sm text-cyan-100">{pilotNinetyFiveGateCommand}</code>
                </div>
              </div>

              <div className="grid gap-3">
                {pilotNinetyFiveGates.map((gate) => (
                  <div key={gate.id} className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] p-5">
                    <div className="text-sm font-semibold text-white">{gate.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{gate.evidence}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="text-sm uppercase tracking-[0.26em] text-emerald-100/80">Confidence rules</div>
                <h2 className="mt-4 text-3xl font-semibold text-white">
                  Evidence changes confidence only when it is buyer-specific and reviewable.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  Constructed samples prove workflow shape, not market outcome. Ratings move only after buyer data,
                  accepted artifacts, reviewer feedback, or paid pilot evidence.
                </p>
              </div>

              <div className="grid gap-3">
                {pilotConfidenceRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-sm font-semibold text-white">{rule.evidenceState}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{rule.confidenceMovement}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-[2rem] border border-red-300/15 bg-red-500/10 p-8">
              <div className="flex items-center gap-3 text-red-100">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.26em]">Stop conditions</span>
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white">
                Park the pilot when the requested outcome outruns the proof.
              </h2>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {pilotStopConditions.map((condition) => (
                  <div key={condition} className="rounded-2xl border border-red-200/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-200">
                    {condition}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-300">{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-200">{value}</div>
    </div>
  );
}

function RoutePlanInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <dt className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">{label}</dt>
      <dd className="mt-1 break-words text-slate-200">{value}</dd>
    </div>
  );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200/15 bg-black/30 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">{label}</div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-3">
        <code className="whitespace-nowrap text-xs leading-6 text-emerald-100">{command}</code>
      </div>
    </div>
  );
}
