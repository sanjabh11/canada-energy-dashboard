import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ClipboardCheck, FileSearch, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import {
  getPilotEvidenceCoverageSummary,
  pilotConfidenceRules,
  pilotBuyerEvidenceReadinessCommand,
  pilotEvidenceRequirements,
  pilotIntakeRoutePlans,
  pilotMinimumEvidenceLanes,
  pilotNinetyFiveGateCommand,
  pilotNinetyFiveGates,
  pilotOperatorCommands,
  pilotOutcomeMetrics,
  pilotStopConditions,
} from '../lib/pilotEvidence';
import { previewPilotEvidenceRegister, type PilotEvidenceRegisterPreview } from '../lib/pilotEvidenceRegisterPreview';
import { computeRetainedArtifactHash, type RetainedArtifactHashResult } from '../lib/retainedArtifactHash';

const MAX_REGISTER_PREVIEW_BYTES = 1024 * 1024;

export function PilotReadinessPage() {
  const summary = getPilotEvidenceCoverageSummary();
  const [selectedRoute, setSelectedRoute] = useState(pilotIntakeRoutePlans[0]?.route ?? '');
  const [artifactFileName, setArtifactFileName] = useState('retained-artifact.md');
  const [artifactText, setArtifactText] = useState('');
  const [artifactHashResult, setArtifactHashResult] = useState<RetainedArtifactHashResult | null>(null);
  const [artifactHashError, setArtifactHashError] = useState('');
  const [artifactHashPending, setArtifactHashPending] = useState(false);
  const [registerText, setRegisterText] = useState('');
  const [registerFileStatus, setRegisterFileStatus] = useState('');
  const [registerFileError, setRegisterFileError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const selectedPlan = useMemo(
    () => pilotIntakeRoutePlans.find((plan) => plan.route === selectedRoute) ?? pilotIntakeRoutePlans[0],
    [selectedRoute],
  );
  const phaseFIntakeSteps = useMemo(() => {
    if (!selectedPlan) return [];

    const commandById = new Map(pilotOperatorCommands.map((command) => [command.id, command.command]));
    return [
      {
        id: 'workspace',
        label: 'Start evidence workspace',
        status: 'Scaffold',
        command: commandById.get('create-workspace') ?? '',
        evidence: 'Creates outreach, starter-register, retained-artifact, and report folders with confidence_delta=0.',
        gate: 'Not buyer proof; use only as the collection workspace.',
      },
      {
        id: 'outreach',
        label: 'Log real anonymized buyer reply',
        status: 'Buyer action',
        command: selectedPlan.outreachCommand,
        evidence: `${selectedPlan.label}: ${selectedPlan.requiredInput}`,
        gate: 'Only real anonymized replies can enter the response log; rehearsal, no-reply, and not-fit rows do not move confidence.',
      },
      {
        id: 'intake-packet',
        label: 'Create route intake packet',
        status: 'Scaffold',
        command: selectedPlan.intakePacketCommand,
        evidence: `Creates packet scaffolding for ${selectedPlan.proofPackId}.`,
        gate: 'Starter packet rows stay at confidence_delta=0 until retained artifacts and reviewer acceptance exist.',
      },
      {
        id: 'retained-artifact',
        label: 'Prepare retained artifact hash',
        status: 'Local proof',
        command: `Use the retained artifact hash helper below, then attach ${selectedPlan.route}/artifact.md#sha256=<64-hex>.`,
        evidence: selectedPlan.artifactPromised,
        gate: selectedPlan.doNotClaim,
      },
      {
        id: 'register-update',
        label: 'Update selected register row',
        status: 'Candidate row',
        command: selectedPlan.registerUpdateCommand,
        evidence: selectedPlan.claimBoundary,
        gate: 'Updater must validate the candidate register before writing output; do not hand-edit confidence-moving rows.',
      },
      {
        id: 'workspace-report',
        label: 'Report workspace blockers',
        status: 'Read-only',
        command: commandById.get('report-workspace') ?? '',
        evidence: 'Summarizes which Phase F lane, hash, reviewer, fast-delivery, and commercial-signal gates remain blocked.',
        gate: 'Report output does not create buyer evidence.',
      },
      {
        id: 'hard-gate',
        label: 'Run hard 95% gate',
        status: 'Approval gate',
        command: commandById.get('hard-gate') ?? pilotNinetyFiveGateCommand,
        evidence: 'Requires all three minimum lanes, retained hashes, reviewer acceptance, day-14 proceed, and a real commercial signal.',
        gate: 'Passing this gate is required before stronger market-confidence language; failing it keeps launch blocked.',
      },
    ];
  }, [selectedPlan]);
  const registerPreview = useMemo<PilotEvidenceRegisterPreview | null>(() => {
    if (registerText.trim().length === 0) return null;
    return previewPilotEvidenceRegister(registerText);
  }, [registerText]);

  async function handleRetainedArtifactHash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setArtifactHashError('');
    setArtifactHashPending(true);

    try {
      const result = await computeRetainedArtifactHash({
        fileName: artifactFileName,
        text: artifactText,
      });
      setArtifactHashResult(result);
    } catch (error) {
      setArtifactHashResult(null);
      setArtifactHashError(error instanceof Error ? error.message : 'Unable to compute retained artifact hash.');
    } finally {
      setArtifactHashPending(false);
    }
  }

  async function handleRegisterFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setRegisterFileError('');
    setRegisterFileStatus('');

    if (!file) return;
    if (file.size > MAX_REGISTER_PREVIEW_BYTES) {
      setRegisterFileError(`Register file is ${formatBytes(file.size)}; limit is ${formatBytes(MAX_REGISTER_PREVIEW_BYTES)} for browser-only preview.`);
      event.target.value = '';
      return;
    }

    const text = await file.text();
    setRegisterText(text);
    setRegisterFileStatus(`${file.name} loaded locally for preview; no upload was performed.`);
  }

  async function handleCopy(value: string, label: string) {
    setCopyStatus('');

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Unable to copy ${label}. Select the text and copy it manually.`);
    }
  }

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
              <div data-testid="phase-f-intake-wizard" className="mt-10 rounded-[1.5rem] border border-cyan-200/15 bg-cyan-300/[0.06] p-6">
                <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                  <div>
                    <div className="text-sm uppercase tracking-[0.26em] text-cyan-100/80">
                      Phase F intake wizard
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-slate-50 md:text-3xl">
                      Follow the buyer-evidence path without turning scaffolding into proof.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      This sequence keeps {selectedPlan.label} tied to the minimum Phase F lane map. It separates
                      collection setup, real buyer reply evidence, retained artifact hashing, register update, workspace
                      reporting, and the hard 95% gate.
                    </p>
                    <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                      None of these steps raises market confidence until the filled register and retained artifacts pass
                      the canonical validator with real buyer-supplied evidence.
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {phaseFIntakeSteps.map((step, index) => (
                      <article key={step.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                              Step {index + 1}
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-slate-50">{step.label}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{step.evidence}</p>
                          </div>
                          <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                            {step.status}
                          </span>
                        </div>
                        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-3">
                          <code className="whitespace-nowrap text-xs leading-6 text-cyan-100">{step.command}</code>
                        </div>
                        <div className="mt-3 rounded-xl border border-amber-200/10 bg-amber-300/[0.07] p-3 text-sm leading-6 text-amber-50">
                          {step.gate}
                        </div>
                        <CopyButton
                          label={`Copy step ${index + 1} command`}
                          onClick={() => handleCopy(step.command, `Step ${index + 1} command`)}
                        />
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}

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

            <div className="mt-10 rounded-[1.5rem] border border-cyan-200/15 bg-cyan-300/[0.06] p-6">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <div className="flex items-center gap-3 text-cyan-100">
                    <FileSearch className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-[0.26em]">Retained artifact hash helper</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    Hash the redacted retained extract before updating the evidence register.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    Use this only after the original buyer file has been reduced to a text-inspectable retained artifact.
                    The browser computes a SHA-256 reference locally from the pasted retained text. Do not paste raw buyer
                    files, account numbers, meter identifiers, secrets, or unapproved personal data.
                  </p>
                  <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                    This helper creates a hash reference only. It does not prove reviewer acceptance, commercial commitment,
                    day_14_decision=proceed, or confidence_delta movement.
                  </div>
                </div>

                <form onSubmit={handleRetainedArtifactHash} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <label htmlFor="retained-artifact-file-name" className="block text-sm font-semibold text-cyan-100">
                    Retained artifact filename
                  </label>
                  <input
                    id="retained-artifact-file-name"
                    value={artifactFileName}
                    onChange={(event) => setArtifactFileName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-cyan-200/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20"
                    placeholder="redacted-utility-forecast-retained.md"
                  />

                  <label htmlFor="retained-artifact-text" className="mt-5 block text-sm font-semibold text-cyan-100">
                    Redacted retained artifact text
                  </label>
                  <textarea
                    id="retained-artifact-text"
                    value={artifactText}
                    onChange={(event) => setArtifactText(event.target.value)}
                    className="mt-2 min-h-44 w-full rounded-2xl border border-cyan-200/20 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20"
                    placeholder="Paste only the retained extract: schema, completeness, reviewer notes, source labels, and no raw buyer values."
                  />

                  <button
                    type="submit"
                    disabled={artifactHashPending}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {artifactHashPending ? 'Computing SHA-256...' : 'Generate SHA-256 reference'}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {artifactHashError && (
                    <div className="mt-4 rounded-2xl border border-red-200/15 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {artifactHashError}
                    </div>
                  )}

                  {artifactHashResult && (
                    <div className="mt-5 space-y-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/10 p-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Evidence reference</div>
                        <code className="mt-2 block break-all rounded-xl border border-white/10 bg-slate-950 p-3 text-xs leading-6 text-emerald-100">
                          {artifactHashResult.reference}
                        </code>
                        <CopyButton
                          label="Copy evidence reference"
                          onClick={() => handleCopy(artifactHashResult.reference, 'Evidence reference')}
                        />
                      </div>

                      <dl className="grid gap-3 text-sm leading-6 text-slate-200 md:grid-cols-3">
                        <RoutePlanInfo label="Normalized file" value={artifactHashResult.fileName} />
                        <RoutePlanInfo label="Bytes hashed" value={`${artifactHashResult.byteLength}`} />
                        <RoutePlanInfo label="Line count" value={`${artifactHashResult.lineCount}`} />
                      </dl>

                      {artifactHashResult.warnings.length > 0 ? (
                        <div className="rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-amber-100">Review warnings</div>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50">
                            {artifactHashResult.warnings.map((warning) => (
                              <li key={warning} className="flex gap-2">
                                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-emerald-200/15 bg-slate-950/50 p-4 text-sm leading-6 text-emerald-100">
                          No retained-artifact warnings were detected. Still verify the extract manually before attaching it
                          to the buyer-evidence register.
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div data-testid="pilot-register-preview" className="mt-10 rounded-[1.5rem] border border-emerald-200/15 bg-emerald-300/[0.06] p-6">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <ClipboardCheck className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-[0.26em]">95% register preview</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    Check whether a local buyer-evidence register is even close before running the hard gate.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    Paste or select the filled register CSV to preview obvious 95% blockers in the browser. The file is
                    read locally and is not uploaded. This preview is intentionally narrower than the canonical CLI; the
                    final gate remains the validator command below with an evidence-root directory.
                  </p>
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-200/15 bg-slate-950 p-4">
                    <code className="whitespace-nowrap text-xs leading-6 text-emerald-100">{pilotNinetyFiveGateCommand}</code>
                  </div>
                  <CopyButton
                    label="Copy 95% gate command"
                    onClick={() => handleCopy(pilotNinetyFiveGateCommand, '95% gate command')}
                  />
                  <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Readiness report command</div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                      Run this non-mutating report first when the question is what still blocks Phase F, not whether the
                      hard 95% gate can already pass.
                    </p>
                    <code className="mt-3 block overflow-x-auto whitespace-nowrap rounded-xl border border-white/10 bg-slate-950 p-3 text-xs leading-6 text-cyan-100">
                      {pilotBuyerEvidenceReadinessCommand}
                    </code>
                    <CopyButton
                      label="Copy readiness report command"
                      onClick={() => handleCopy(pilotBuyerEvidenceReadinessCommand, 'Readiness report command')}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <label htmlFor="pilot-register-local-file" className="block text-sm font-semibold text-emerald-100">
                    Local filled register CSV
                  </label>
                  <input
                    id="pilot-register-local-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleRegisterFileChange}
                    className="mt-2 w-full rounded-2xl border border-emerald-200/20 bg-slate-950 px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                  />
                  <div className="mt-2 text-xs leading-5 text-slate-400">
                    Max file size: {formatBytes(MAX_REGISTER_PREVIEW_BYTES)}. Use redacted register rows only.
                  </div>

                  {registerFileStatus && (
                    <div className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">
                      {registerFileStatus}
                    </div>
                  )}
                  {registerFileError && (
                    <div className="mt-4 rounded-2xl border border-red-200/15 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                      {registerFileError}
                    </div>
                  )}

                  <label htmlFor="pilot-register-csv-text" className="mt-5 block text-sm font-semibold text-emerald-100">
                    Register CSV text
                  </label>
                  <textarea
                    id="pilot-register-csv-text"
                    value={registerText}
                    onChange={(event) => {
                      setRegisterText(event.target.value);
                      setRegisterFileStatus('');
                      setRegisterFileError('');
                    }}
                    className="mt-2 min-h-44 w-full rounded-2xl border border-emerald-200/20 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-200 focus:ring-2 focus:ring-emerald-200/20"
                    placeholder="Paste the filled 24-column pilot evidence register CSV here."
                  />

                  {registerPreview && (
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-3 text-sm leading-6 text-slate-200 md:grid-cols-4">
                        <RoutePlanInfo label="Rows" value={`${registerPreview.rowCount}`} />
                        <RoutePlanInfo label="Columns" value={`${registerPreview.columnCount}`} />
                        <RoutePlanInfo label="Accepted rows" value={`${registerPreview.acceptedConfidenceRowCount}`} />
                        <RoutePlanInfo label="Confidence delta" value={`${registerPreview.totalAcceptedConfidenceDelta}`} />
                      </div>

                      {(registerPreview.warnings.length > 0 || registerPreview.missingRequiredColumns.length > 0 || registerPreview.forbiddenColumnsFound.length > 0) && (
                        <div className="rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-amber-100">Preview warnings</div>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50">
                            {registerPreview.missingRequiredColumns.length > 0 && (
                              <li>Missing required columns: {registerPreview.missingRequiredColumns.join(', ')}</li>
                            )}
                            {registerPreview.forbiddenColumnsFound.length > 0 && (
                              <li>Forbidden sensitive columns: {registerPreview.forbiddenColumnsFound.join(', ')}</li>
                            )}
                            {registerPreview.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid gap-3">
                        {registerPreview.gates.map((gate) => (
                          <div
                            key={gate.id}
                            data-testid={`pilot-register-preview-gate-${gate.id}`}
                            className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-white">{gate.label}</div>
                                <div className="mt-2 text-sm leading-6 text-slate-300">{gate.evidence}</div>
                                {gate.status !== 'pass' && (
                                  <div className="mt-2 text-sm leading-6 text-amber-100">{gate.nextAction}</div>
                                )}
                              </div>
                              <GateStatusPill status={gate.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Canonical validator command</div>
                        <code className="mt-3 block overflow-x-auto whitespace-nowrap rounded-xl border border-white/10 bg-slate-950 p-3 text-xs leading-6 text-cyan-100">
                          {registerPreview.cliCommand}
                        </code>
                        <CopyButton
                          label="Copy validator command"
                          onClick={() => handleCopy(registerPreview.cliCommand, 'Validator command')}
                        />
                      </div>
                    </div>
                  )}

                  {copyStatus && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-200" role="status">
                      {copyStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
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

function GateStatusPill({ status }: { status: 'pass' | 'blocked' | 'warning' }) {
  const label = status === 'pass' ? 'Pass' : status === 'warning' ? 'Review' : 'Blocked';
  const className = status === 'pass'
    ? 'border-emerald-200/30 bg-emerald-300/15 text-emerald-100'
    : status === 'warning'
      ? 'border-amber-200/30 bg-amber-300/15 text-amber-100'
      : 'border-red-200/30 bg-red-500/15 text-red-100';

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}>
      {label}
    </span>
  );
}

function CopyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center justify-center rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-200/40 hover:text-white"
    >
      {label}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
