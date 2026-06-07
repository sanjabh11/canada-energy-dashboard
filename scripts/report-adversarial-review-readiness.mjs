#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;
let jsonOutput = false;
let failOnBlocker = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--json') {
    jsonOutput = true;
    continue;
  }
  if (arg === '--fail-on-blocker') {
    failOnBlocker = true;
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
  corepack pnpm run report:adversarial-review-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, branch, or buyer probes.
  --json               Emit the focused adversarial review payload as JSON.
  --fail-on-blocker    Exit nonzero while launch blockers remain open.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Adversarial review readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function runNodeScript(scriptPath, extraArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
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

function runManifest() {
  const commandArgs = [];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = runNodeScript('scripts/report-launch-evidence-manifest.mjs', commandArgs);

  if (result.status !== 0) {
    return {
      ok: false,
      error: `Launch evidence manifest exited ${result.status}.`,
      stdout: result.stdout,
      stderr: result.stderr,
      processError: result.error,
    };
  }

  try {
    return { ok: true, manifest: JSON.parse(result.stdout ?? '{}') };
  } catch (error) {
    return {
      ok: false,
      error: `Could not parse launch evidence manifest JSON: ${error.message}`,
      stdout: String(result.stdout ?? '').slice(0, 4000),
      stderr: result.stderr,
      processError: result.error,
    };
  }
}

function readPublicStatusHandle(id) {
  try {
    const publicManifestPath = path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json');
    const publicManifest = JSON.parse(readFileSync(publicManifestPath, 'utf8'));
    return (publicManifest.items ?? []).find((item) => item?.id === id) ?? null;
  } catch {
    return null;
  }
}

function cell(value) {
  const text = String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  return text || '-';
}

function renderTable(headers, rows) {
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

function reviewStatus(manifest, reviews) {
  return manifest.launch_decision === 'commercial-ready' && reviews.length >= 5 ? 'pass' : 'blocked';
}

function focusedPayload(manifest) {
  const reviews = Array.isArray(manifest.adversarial_reviews) ? manifest.adversarial_reviews : [];
  const lanes = reviews.map((review) => review.lane).filter(Boolean);
  const missingCoreLanes = [
    'buyer evidence',
    'production approval',
    'release toolchain',
    'Supabase advisor clearance',
    'branch risk',
  ].filter((lane) => !lanes.includes(lane));

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    adversarial_review_ledger: {
      status: reviewStatus(manifest, reviews),
      proof_type: 'adversarial_review_ledger',
      review_count: reviews.length,
      missing_core_lane_count: missingCoreLanes.length,
      missing_core_lanes: missingCoreLanes,
      lanes,
      evidence: reviews.length > 0
        ? `Adversarial review ledger present with ${reviews.length} claim-refutation lanes: ${lanes.join(', ')}.`
        : 'Adversarial review ledger is missing from the launch evidence manifest.',
    },
    adversarial_reviews: reviews,
    public_status_handle: readPublicStatusHandle('adversarial_review_ledger'),
    package_script_handles: {
      report_adversarial_review_readiness: 'corepack pnpm run report:adversarial-review-readiness',
      check_adversarial_review_report: 'corepack pnpm run check:adversarial-review-report',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
      report_commercial_launch_readiness: 'corepack pnpm run report:commercial-launch-readiness',
      check_commercial_launch_readiness_report: 'corepack pnpm run check:commercial-launch-readiness-report',
    },
    proof_boundary: 'Focused adversarial review evidence only; this report renders current manifest claim-refutation lanes, public status handle, and package-script handles, but it does not prove production approval, create buyer evidence, contact buyers, prove buyer acceptance, run release-readiness as clearance, authorize Supabase, clear Supabase advisor findings, approve branches, resolve source provenance, request owner approval, deploy, mutate live services, prove hosted/live parity, clear launch blockers, or create commercial launch readiness.',
    stop_gate: 'Do not treat this focused adversarial review report, checker pass, public status handle, manifest output, generated Markdown, challenge lane, claim-refutation row, or package handle as production approval, buyer acceptance, release readiness, source readiness, branch approval, Supabase advisor clearance, deployment approval, hosted/live parity, commercial-ready status, or launch-goal completion.',
  };
}

function reviewRows(reviews) {
  return reviews.map((review, index) => [
    index + 1,
    review.lane,
    review.proof_type,
    review.finding,
    review.decision,
    review.proof_boundary,
    review.stop_gate,
  ]);
}

function sourceProofTypeText(handle) {
  const proofType = handle?.sourceProofType ?? handle?.sourceProofTypes;
  return Array.isArray(proofType) ? proofType.join(', ') : proofType;
}

function renderMarkdown(payload) {
  const ledger = payload.adversarial_review_ledger ?? {};
  const publicHandle = payload.public_status_handle ?? {};
  const publicRows = [[
    publicHandle.id,
    publicHandle.status,
    publicHandle.sourceManifestPath,
    sourceProofTypeText(publicHandle),
    publicHandle.command,
    publicHandle.evidenceBoundary,
    publicHandle.nextAction,
  ]];
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  return `${[
    '# CEIP Adversarial Review Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Adversarial review readiness status: \`${ledger.status ?? 'unknown'}\``,
    `Adversarial review proof type: \`${ledger.proof_type ?? 'unknown'}\``,
    `Claim-refutation lane count: \`${ledger.review_count ?? 0}\``,
    `Missing core lane count: \`${ledger.missing_core_lane_count ?? 0}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Adversarial Review Summary',
    '',
    renderTable(
      ['Status', 'Proof Type', 'Review Count', 'Missing Core Lanes', 'Lanes', 'Evidence'],
      [[ledger.status, ledger.proof_type, ledger.review_count, ledger.missing_core_lane_count, (ledger.lanes ?? []).join('; '), ledger.evidence]],
    ),
    '',
    '## Claim-Refutation Lanes',
    '',
    renderTable(['Rank', 'Lane', 'Proof Type', 'Finding', 'Decision', 'Proof Boundary', 'Stop Gate'], reviewRows(payload.adversarial_reviews ?? [])),
    '',
    '## Public Release Status Handle',
    '',
    renderTable(['Handle', 'Status', 'Source Manifest Path', 'Source Proof Types', 'Command', 'Evidence Boundary', 'Next Action'], publicRows),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
    '',
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Adversarial review readiness report failed:\n');
  console.error(`- ${manifestResult.error}`);
  if (manifestResult.processError) console.error(`- ${manifestResult.processError}`);
  if (manifestResult.stderr) console.error(manifestResult.stderr.slice(0, 4000));
  process.exit(1);
}

const payload = focusedPayload(manifestResult.manifest);
const output = jsonOutput ? `${JSON.stringify(payload, null, 2)}\n` : renderMarkdown(payload);
const outputPath = values.get('output');
if (outputPath) {
  writeFileSync(path.resolve(repoRoot, outputPath), output, 'utf8');
}

process.stdout.write(output);

if (failOnBlocker && payload.adversarial_review_ledger.status !== 'pass') {
  process.exit(1);
}
