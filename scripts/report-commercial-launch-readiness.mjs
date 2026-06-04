#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['output'].includes(key)) {
      failures.push(`Unknown option: ${arg}`);
    } else if (!value || value.startsWith('--')) {
      failures.push(`${arg} requires a value.`);
    } else if (values.has(key)) {
      failures.push(`Duplicate option: ${arg}`);
    } else {
      values.set(key, value);
    }
    continue;
  }
  failures.push(`Unexpected positional argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run report:commercial-launch-readiness

Options:
  --output <path>    Write the Markdown report to a file instead of stdout only.
  --skip-probes      Skip local readiness probes for fast unit tests.
`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function text(value) {
  if (Array.isArray(value)) return value.map(text).join('<br>');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '<br>')
    .replaceAll('|', '\\|')
    .trim();
}

function mdList(items) {
  if (!Array.isArray(items) || items.length === 0) return 'None.';
  return items.map((item) => `- ${text(item)}`).join('\n');
}

function row(cells) {
  return `| ${cells.map(text).join(' | ')} |`;
}

function sourceList(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  return sources.map((source) => `<${source}>`).join('<br>');
}

function proofBucketLabel(key) {
  return {
    hosted_live: 'Hosted/live',
    local: 'Local',
    repo_artifact: 'Repo artifact',
    candidate_shadow: 'Candidate/shadow',
    roadmap: 'Roadmap',
  }[key] ?? key;
}

function scoreEvidence(dimension) {
  return {
    security: 'Client env, claim-boundary, source-anchor, and security/procurement proof surfaces are release-gated locally.',
    readiness: 'Release readiness is locally gateable, but production approval depends on clean source provenance and owner approval.',
    sellability: 'Top proof-pack routes and target segments are defined, with strong buyer pain fit.',
    evidence: 'Buyer-proven evidence is absent; no production register or retained redacted artifacts are present.',
    overall: 'Commercial launch status is blocked by P0 buyer-evidence and deploy-provenance gates.',
  }[dimension] ?? '';
}

function scoreCaveat(dimension, manifest) {
  return {
    security: 'Supabase advisor evidence and owner-side permission checks remain separate approval gates.',
    readiness: manifest.launch_decision === 'blocked'
      ? 'A passing local gate is not deploy approval.'
      : 'Recheck after every deploy candidate.',
    sellability: 'Buyer proof can change route ranking and scores.',
    evidence: 'Scaffolding, fixtures, and constructed demos do not count as buyer acceptance.',
    overall: 'Do not report commercial-ready while unresolved P0 gaps remain.',
  }[dimension] ?? '';
}

function renderReport(manifest, validationText) {
  const scores = manifest.scores ?? {};
  const gaps = Array.isArray(manifest.gaps) ? manifest.gaps : [];
  const openP0 = gaps.filter((gap) => gap?.severity === 'P0' && gap?.status === 'open').length;
  const openP1 = gaps.filter((gap) => gap?.severity === 'P1' && gap?.status === 'open').length;
  const painPoints = Array.isArray(manifest.pain_points) ? manifest.pain_points : [];
  const targetCustomers = Array.isArray(manifest.target_customers) ? manifest.target_customers : [];
  const proofBuckets = manifest.proof_buckets ?? {};
  const outreach = manifest.outreach_plan ?? {};
  const fixReport = manifest.fix_report ?? {};
  const reviews = Array.isArray(manifest.adversarial_reviews) ? manifest.adversarial_reviews : [];
  const ecc = manifest.ecc_ledger ?? {};
  const hasTenPainSources = painPoints.length >= 10 && painPoints.every((item) => (
    Array.isArray(item.source_evidence)
    && item.source_evidence.some((source) => /^https?:\/\//.test(source))
  ));
  const hasProofBuckets = ['hosted_live', 'local', 'repo_artifact', 'candidate_shadow', 'roadmap']
    .every((bucket) => Object.hasOwn(proofBuckets, bucket));

  return `# CEIP Commercial Launch Readiness Report

Generated: ${text(manifest.run?.generated_at)}
Repo: ${text(manifest.repo?.name)} (${text(manifest.repo?.path)})
Commit: ${text(manifest.repo?.commit)}
Mode: ${text(manifest.run?.mode)}

## Launch Decision

Decision: \`${text(manifest.launch_decision)}\`

| Dimension | Score / 5 | Evidence | Caveat |
|---|---:|---|---|
${['security', 'readiness', 'sellability', 'evidence', 'overall'].map((dimension) => row([
    dimension[0].toUpperCase() + dimension.slice(1),
    scores[dimension],
    scoreEvidence(dimension),
    scoreCaveat(dimension, manifest),
  ])).join('\n')}

## Gap Analysis

| Gap | Severity | Evidence | Framework Mapping | Buyer Impact | Fix | Status |
|---|---|---|---|---|---|---|
${gaps.map((gap) => row([
    gap.gap,
    gap.severity,
    gap.evidence,
    gap.framework_mapping,
    gap.buyer_impact,
    gap.fix,
    gap.status,
  ])).join('\n')}

## Proof Buckets

| Bucket | Evidence | Claim Allowed |
|---|---|---|
${Object.entries(proofBuckets).map(([bucket, evidence]) => row([
    proofBucketLabel(bucket),
    evidence,
    bucket === 'hosted_live'
      ? 'Hosted facts only after current live checks pass.'
      : bucket === 'local'
        ? 'Local verification only; not deploy approval or buyer proof.'
        : bucket === 'repo_artifact'
          ? 'Repo artifact proof only.'
          : bucket === 'candidate_shadow'
            ? 'Constructed or candidate demonstration only.'
            : 'Future work until implemented and verified.',
  ])).join('\n')}

## Top 10 Pain Points

| Rank | Pain Point | Affected Buyer | Source Evidence | Willingness-To-Pay Signal | Repo Proof Fit | Confidence |
|---:|---|---|---|---|---|---:|
${painPoints.map((item) => row([
    item.rank,
    item.pain_point,
    item.affected_buyer,
    sourceList(item.source_evidence),
    item.willingness_to_pay_signal,
    item.repo_proof_fit,
    item.confidence,
  ])).join('\n')}

## Top 10 Target Customers Or Segments

| Rank | Account/Segment | Pain | Trigger | Decision Maker | Outreach Angle | Proof To Show | Confidence |
|---:|---|---|---|---|---|---|---:|
${targetCustomers.map((item) => row([
    item.rank,
    item.account_or_segment,
    item.pain,
    item.trigger,
    item.decision_maker,
    item.outreach_angle,
    item.proof_to_show,
    item.confidence,
  ])).join('\n')}

## Outreach Plan

### 30/60/90 Plan

| Window | Action | Proof Needed | Success Metric |
|---|---|---|---|
${row(['0-30 days', outreach.phase_30_days, 'Real anonymized buyer activity only.', 'Workspace exists and readiness report still blocks confidence movement.'])}
${row(['31-60 days', outreach.phase_60_days, 'Retained redacted artifacts and reviewer acceptance.', 'Candidate register validates without direct identifiers.'])}
${row(['61-90 days', outreach.phase_90_days, 'Hard 95% gate output and commercial signal evidence.', 'validate:pilot-evidence --require-95 passes or blockers stay explicit.'])}

### Email Script

Subject: Redacted proof-pack review for [buyer lane]

Body:

${text(outreach.email_script_boundary)}

### LinkedIn Script

Message:

${text(outreach.linkedin_script_boundary)}

### Demo Narrative

Opening: CEIP is a proof-pack-first Canadian energy intelligence product with strict claim boundaries.

Proof: ${text(outreach.demo_narrative)}

Ask: Request a redacted buyer-file review that can flow into the Phase F evidence workspace.

### Objection Handling

| Objection | Response | Proof |
|---|---|---|
${row(['Where is buyer proof?', 'Buyer proof is still blocked until the hard 95% gate passes.', 'report:buyer-evidence-readiness and validate:pilot-evidence --require-95.'])}
${row(['Can this be deployed now?', 'Production deployment still requires clean source provenance, release readiness, and explicit owner approval.', 'report:production-approval-packet.'])}
${row(['Are these live utility customers?', 'No. Candidate routes and constructed proof packs are not live customer adoption.', 'Proof buckets in this report and COMMERCIAL_SOURCE_OF_TRUTH.md.'])}
${row(['Is security approved?', 'Repo-backed security artifacts exist, but owner-side Supabase advisor/security evidence remains a gate.', 'utility-security proof pack plus Supabase advisor gap.'])}

## Fix Report

| Item | Files Changed | Tests Run | Status | Approval Gate |
|---|---|---|---|---|
${row(['Manifest command boundary', fixReport.files_changed_by_manifest_command, fixReport.current_required_checks, 'read-only unless --output is used', fixReport.safe_fix_boundary])}
${(fixReport.unresolved_blockers ?? []).map((blocker, index) => row([
    `Unresolved blocker ${index + 1}`,
    'n/a',
    'See launch evidence manifest and production approval packet.',
    blocker,
    'Requires buyer evidence, clean provenance, branch review, or owner approval.',
  ])).join('\n')}

## Adversarial Review

| Lane | Claim Challenged | Result | Remaining Risk |
|---|---|---|---|
${reviews.map((review) => row([
    review.lane,
    review.finding,
    review.decision,
    review.decision === 'blocked' ? 'Decision remains blocked.' : 'Recheck if evidence changes.',
  ])).join('\n')}

## Evidence Validation

| Check | Result | Evidence |
|---|---|---|
${row(['validate_launch_evidence.py', validationText.includes('VALID') ? 'pass' : 'fail', validationText])}
${row(['Launch decision gate', manifest.launch_decision === 'blocked' && openP0 > 0 ? 'pass' : 'review', `${openP0} open P0 gap(s), ${openP1} open P1 gap(s), decision=${manifest.launch_decision}.`])}
${row(['P0/P1 blocker gate', openP0 > 0 || openP1 > 0 ? 'blocked' : 'clear', `Open P0=${openP0}; open P1=${openP1}.`])}
${row(['Source evidence gate', hasTenPainSources ? 'pass' : 'fail', `${painPoints.length} pain points; ${targetCustomers.length} target customers or segments.`])}
${row(['Proof bucket gate', hasProofBuckets ? 'pass' : 'fail', Object.keys(proofBuckets).join(', ')])}

## ECC Ledger

| Field | Value |
|---|---|
${Object.entries({
    Route: ecc.route,
    Tier: ecc.tier,
    Mode: ecc.mode,
    'Skills/Tools': ecc.skills_tools,
    Baseline: ecc.baseline,
    Checks: ecc.checks,
    Delta: ecc.delta,
    Reflection: ecc.reflection,
    Decision: ecc.decision,
    'Next Adjustment': ecc.next_adjustment,
  }).map(([key, value]) => row([key, value])).join('\n')}
`;
}

if (failures.length > 0) {
  console.error('Commercial launch readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-commercial-launch-report-'));
const manifestPath = path.join(tempRoot, 'launch-evidence.json');

try {
  const manifestArgs = ['scripts/report-launch-evidence-manifest.mjs', '--output', manifestPath];
  if (skipProbes) manifestArgs.push('--skip-probes');
  const manifestResult = run(process.execPath, manifestArgs);
  if (manifestResult.status !== 0) {
    failures.push(`Launch evidence manifest exited ${manifestResult.status}.`);
    if (manifestResult.error.trim()) failures.push(manifestResult.error.trim());
    if (manifestResult.stderr.trim()) failures.push(manifestResult.stderr.trim());
    if (manifestResult.stdout.trim()) failures.push(manifestResult.stdout.trim());
  }

  let manifest = null;
  if (failures.length === 0) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      failures.push(`Unable to read generated manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let validationText = '';
  if (failures.length === 0) {
    const validation = run('python3', [validatorPath, manifestPath, '--require-repo-exists']);
    validationText = `${validation.stdout}\n${validation.stderr}`.trim();
    if (validation.status !== 0) {
      failures.push(`Launch evidence schema validation exited ${validation.status}.`);
      if (validation.error.trim()) failures.push(validation.error.trim());
      if (validationText) failures.push(validationText);
    }
  }

  if (failures.length === 0 && manifest) {
    const markdown = renderReport(manifest, validationText);
    const outputPath = values.get('output');
    if (outputPath) {
      const absoluteOutput = path.resolve(repoRoot, outputPath);
      if (existsSync(absoluteOutput) && !/\.(md|markdown|txt)$/i.test(absoluteOutput)) {
        failures.push(`Refusing to overwrite non-Markdown output path: ${outputPath}`);
      } else {
        writeFileSync(absoluteOutput, markdown, 'utf8');
      }
    }
    if (failures.length === 0) process.stdout.write(markdown);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Commercial launch readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
