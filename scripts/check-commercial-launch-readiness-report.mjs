#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;

for (const arg of args) {
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  failures.push(`Unknown option: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:commercial-launch-readiness-report

Options:
  --skip-probes      Skip local readiness probes for fast unit-level checks.
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

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function extractSection(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const next = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, next < 0 ? markdown.length : next);
}

function countDataRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => (
      line.startsWith('| ')
      && !line.includes('---')
      && !line.startsWith('| Rank ')
      && !line.startsWith('| Dimension ')
      && !line.startsWith('| Gap ')
      && !line.startsWith('| Bucket ')
      && !line.startsWith('| Window ')
      && !line.startsWith('| Objection ')
      && !line.startsWith('| Item ')
      && !line.startsWith('| Lane ')
      && !line.startsWith('| Check ')
      && !line.startsWith('| Field ')
    ))
    .length;
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-commercial-launch-report-check-'));
const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');

try {
  if (failures.length === 0) {
    const reportArgs = ['scripts/report-commercial-launch-readiness.mjs', '--output', reportPath];
    if (skipProbes) reportArgs.push('--skip-probes');

    const report = run(process.execPath, reportArgs);
    if (report.status !== 0) {
      failures.push(`Commercial launch readiness report exited ${report.status}.`);
      if (report.error.trim()) failures.push(report.error.trim());
      if (report.stderr.trim()) failures.push(report.stderr.trim());
      if (report.stdout.trim()) failures.push(report.stdout.trim());
    } else {
      const fileText = readFileSync(reportPath, 'utf8');
      assert(report.stdout === fileText, 'Report stdout must match the --output Markdown file.');
      assertReport(fileText, { skipProbes });
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function assertReport(markdown, options = {}) {
  const requiredSections = [
    'Launch Decision',
    'Gap Analysis',
    'Proof Buckets',
    'Top 10 Pain Points',
    'Top 10 Target Customers Or Segments',
    'Outreach Plan',
    'Fix Report',
    'Adversarial Review',
    'Evidence Validation',
    'ECC Ledger',
  ];

  assert(markdown.startsWith('# CEIP Commercial Launch Readiness Report'), 'Report must start with the CEIP launch readiness heading.');
  for (const section of requiredSections) {
    assert(markdown.includes(`## ${section}`), `Report is missing required section: ${section}.`);
  }
  assert(markdown.includes('Decision: `blocked`'), 'Report must keep the current launch decision blocked.');
  assert(!markdown.includes('Decision: `commercial-ready`'), 'Report must not claim commercial-ready status.');
  assert(markdown.includes('| Evidence | 1 |'), 'Report must keep the evidence score at 1 while buyer proof is absent.');
  assert(markdown.includes('Do not claim buyer-proven 95% confidence'), 'Report must preserve the buyer-proof outreach boundary.');
  assert(markdown.includes('Local verification only; not deploy approval or buyer proof.'), 'Report must preserve the local-proof boundary.');
  assert(markdown.includes('Scaffolding, fixtures, and constructed demos do not count as buyer acceptance.'), 'Report must preserve the no-scaffolding-as-buyer-proof boundary.');
  assert(markdown.includes('Buyer evidence review'), 'Report must include structured buyer-evidence readiness from the manifest.');
  assert(markdown.includes('Batchable intake-packet outreach rows'), 'Report must include buyer-evidence actionability counts from the manifest.');
  assert(markdown.includes('Supabase advisor review'), 'Report must include structured Supabase advisor evidence from the manifest.');
  assert(markdown.includes('Supabase security/performance advisor clearance remains unavailable'), 'Report must preserve the Supabase advisor clearance launch blocker.');
  assert(markdown.includes('Source provenance:'), 'Report must include source provenance evidence from the manifest.');
  assert(markdown.includes('Branch family review'), 'Report must include branch-family evidence from the manifest.');
  assert(markdown.includes('High-risk, local/origin split, or stale/aging unmerged branches'), 'Report must preserve the branch-family and freshness launch blocker.');
  assert(markdown.includes('Branch freshness review'), 'Report must include branch freshness evidence from the manifest.');
  assert(markdown.includes('Branch review queue'), 'Report must include the actionable branch review queue evidence from the manifest.');
  assert(markdown.includes('Top branch review packet'), 'Report must include the focused top branch review packet evidence from the manifest.');
  assert(markdown.includes('approval_gate=no checkout/merge/deploy/migration/push'), 'Report must preserve the top branch packet no-mutation approval gate.');
  if (!options.skipProbes) {
    assert(markdown.includes('review_first'), 'Report must surface review-first branch queue priority when branch probes run.');
  }
  assert(markdown.includes('| validate_launch_evidence.py | pass | VALID |'), 'Report must include a passing launch evidence schema validation row.');
  assert(markdown.includes('Open P0='), 'Report must include P0/P1 blocker evidence.');
  assert(markdown.includes('commercial-ready'), 'Report must mention commercial-ready only as a blocked/do-not-claim boundary.');

  for (const bucket of ['Hosted/live', 'Local', 'Repo artifact', 'Candidate/shadow', 'Roadmap']) {
    assert(markdown.includes(`| ${bucket} |`), `Report is missing proof bucket: ${bucket}.`);
  }

  const painSection = extractSection(markdown, 'Top 10 Pain Points');
  const targetSection = extractSection(markdown, 'Top 10 Target Customers Or Segments');
  const launchSection = extractSection(markdown, 'Launch Decision');
  const gapSection = extractSection(markdown, 'Gap Analysis');
  const evidenceSection = extractSection(markdown, 'Evidence Validation');
  const eccSection = extractSection(markdown, 'ECC Ledger');

  assert(countDataRows(launchSection) === 5, 'Launch score table must include five dimensions.');
  assert(countDataRows(gapSection) >= 4, 'Gap analysis table must include current P0/P1 launch blockers.');
  assert(countDataRows(painSection) === 10, 'Pain point table must include exactly ten rows.');
  assert(countDataRows(targetSection) === 10, 'Target customer table must include exactly ten rows.');
  assert(countDataRows(evidenceSection) >= 5, 'Evidence validation table must include all validation gates.');
  assert(countDataRows(eccSection) >= 9, 'ECC ledger must include the route, mode, checks, decision, and next adjustment fields.');
  assert((painSection.match(/https?:\/\//g) ?? []).length >= 10, 'Pain point table must include current source URLs.');
}

if (failures.length > 0) {
  console.error('Commercial launch readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commercial launch readiness report check passed: required tables, blocked decision, source URLs, proof buckets, buyer evidence, Supabase advisor evidence, source provenance, branch families, branch freshness, branch review queue, top branch packet, and validation boundaries are present.');
