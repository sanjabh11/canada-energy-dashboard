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
  if (arg === '--') continue;
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
    'Launch Blocker Action Queue',
    'Source Provenance Resolution Queue',
    'Branch Canonical Head Decision Deficits',
    'Buyer Evidence Hard Gate Deficits',
    'Buyer Evidence Remediation Queue',
    'Supabase Advisor Clearance Deficits',
    'Supabase Advisor Remediation Queue',
    'Release Toolchain And Approval Deficits',
    'Release Preflight Remediation Queue',
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
  assert(markdown.includes('## Launch Blocker Action Queue'), 'Report must include the launch blocker action queue table.');
  assert(markdown.includes('Launch blocker action queue'), 'Report must include structured launch action queue evidence from the manifest.');
  assert(markdown.includes('This is a sequenced execution plan only'), 'Report must preserve the action-queue non-execution boundary.');
  assert(markdown.includes('| source_provenance |'), 'Report must include the source provenance action phase.');
  assert(markdown.includes('| release_toolchain |'), 'Report must include the release toolchain action phase.');
  assert(markdown.includes('| branch_review |'), 'Report must include the branch review action phase.');
  assert(markdown.includes('| supabase_advisor |'), 'Report must include the Supabase advisor action phase.');
  assert(markdown.includes('| buyer_evidence |'), 'Report must include the buyer evidence action phase.');
  assert(markdown.includes('| production_approval |'), 'Report must include the production approval action phase.');
  assert(markdown.includes('| post_deploy_live_proof |'), 'Report must include the post-deploy live proof action phase.');
  assert(
    /\| 5 \| buyer_evidence \| (?:[1-9]\d*|unknown) buyer hard-gate deficit\(s\) remain \| buyer_operator \|[^|\n]+\| corepack pnpm run validate:pilot-evidence -- path\/to\/register\.csv --require-95 --evidence-root path\/to\/redacted-artifacts \|[^|\n]+\| blocked \|/.test(markdown),
    'Report must keep buyer evidence action blocked while hard-gate deficits remain.',
  );
  assert(markdown.includes('corepack pnpm run check:post-deploy-live'), 'Report must include the post-deploy live proof command.');
  assert(markdown.includes('## Source Provenance Resolution Queue'), 'Report must include the source provenance resolution queue table.');
  assert(markdown.includes('Source provenance resolution queue'), 'Report must include structured source-provenance resolution evidence from the manifest.');
  assert(markdown.includes('This queue is a decision aid only'), 'Report must preserve the source-provenance non-execution boundary.');
  assert(markdown.includes('without explicit owner intent'), 'Report must preserve the source-provenance owner-intent stop gate.');
  assert(markdown.includes('corepack pnpm run report:production-approval-packet -- --skip-release-readiness'), 'Report must include the source-provenance proof command.');
  assert(markdown.includes('## Branch Canonical Head Decision Deficits'), 'Report must include the branch canonical-head decision deficit table.');
  assert(markdown.includes('Canonical head decision ledger'), 'Report must include structured canonical-head decision evidence from the manifest.');
  assert(markdown.includes('This ledger is read-only'), 'Report must preserve the canonical-head decision non-execution boundary.');
  assert(
    /No checkout, merge, push, discard, deploy|does not checkout, merge, push, discard, deploy/i.test(markdown),
    'Report must preserve the canonical-head no-mutation stop gate.',
  );
  assert(markdown.includes('corepack pnpm run report:unmerged-branch-readiness'), 'Report must include focused branch review proof commands.');
  assert(markdown.includes('Batchable intake-packet outreach rows'), 'Report must include buyer-evidence actionability counts from the manifest.');
  assert(markdown.includes('## Buyer Evidence Hard Gate Deficits'), 'Report must include the buyer hard-gate deficit table.');
  assert(markdown.includes('Generated scaffolding, outreach headers, and starter registers do not count as buyer proof.'), 'Report must preserve the no-scaffolding buyer-deficit boundary.');
  assert(markdown.includes('## Buyer Evidence Remediation Queue'), 'Report must include the buyer evidence remediation queue table.');
  assert(markdown.includes('Buyer evidence remediation queue'), 'Report must include structured buyer evidence remediation from the manifest.');
  assert(markdown.includes('does not contact buyers'), 'Report must preserve the buyer remediation no-contact boundary.');
  assert(markdown.includes('create accepted evidence, move confidence'), 'Report must preserve the buyer remediation no-evidence boundary.');
  if (options.skipProbes) {
    assert(markdown.includes('Buyer hard-gate deficit ledger skipped'), 'Skipped report must preserve the skipped buyer-deficit evidence boundary.');
    assert(markdown.includes('Buyer evidence remediation queue skipped'), 'Skipped report must preserve the skipped buyer remediation queue boundary.');
  } else {
    assert(markdown.includes('| Utility forecast lane |'), 'Report must include the utility forecast buyer-deficit row.');
    assert(markdown.includes('| Retained-artifact 95% validation |'), 'Report must include the retained-artifact validation buyer-deficit row.');
    assert(markdown.includes('corepack pnpm run validate:pilot-evidence'), 'Report must include the retained-artifact 95% validation proof command.');
    assert(markdown.includes('Do not claim 95% buyer-proven confidence'), 'Report must preserve the buyer 95% stop gate.');
  }
  assert(markdown.includes('Supabase advisor review'), 'Report must include structured Supabase advisor evidence from the manifest.');
  assert(markdown.includes('Supabase security/performance advisor clearance remains unavailable'), 'Report must preserve the Supabase advisor clearance launch blocker.');
  assert(markdown.includes('## Supabase Advisor Clearance Deficits'), 'Report must include the Supabase advisor clearance deficit table.');
  assert(markdown.includes('Supabase advisor clearance deficit ledger'), 'Report must include structured Supabase advisor clearance deficit evidence from the manifest.');
  assert(markdown.includes('CLI app lint, repo security artifacts, and public status cards do not substitute'), 'Report must preserve the Supabase advisor substitution boundary.');
  assert(markdown.includes('| Security advisor evidence |'), 'Report must include the security advisor evidence deficit row.');
  assert(markdown.includes('| Performance advisor evidence |'), 'Report must include the performance advisor evidence deficit row.');
  assert(markdown.includes('| Advisor clearance claim |'), 'Report must include the no-clearance-claim deficit row.');
  assert(markdown.includes('## Supabase Advisor Remediation Queue'), 'Report must include the Supabase advisor remediation queue table.');
  assert(markdown.includes('Supabase advisor remediation queue'), 'Report must include structured Supabase advisor remediation evidence from the manifest.');
  assert(markdown.includes('does not authorize connectors'), 'Report must preserve the Supabase remediation no-authorization boundary.');
  assert(markdown.includes('mutate the database'), 'Report must preserve the Supabase remediation no-database-mutation boundary.');
  assert(markdown.includes('Supabase Dashboard > Database > Security Advisor'), 'Report must include the Security Advisor proof command.');
  assert(markdown.includes('Supabase Dashboard > Database > Performance Advisor'), 'Report must include the Performance Advisor proof command.');
  assert(markdown.includes('## Release Toolchain And Approval Deficits'), 'Report must include the release toolchain and approval deficit table.');
  assert(markdown.includes('Release toolchain and approval deficit ledger'), 'Report must include structured release-preflight evidence from the manifest.');
  assert(markdown.includes('Direct pnpm checks, skipped approval packets, and local commit hooks do not substitute'), 'Report must preserve the release-preflight substitution boundary.');
  assert(markdown.includes('| Corepack pnpm resolver |'), 'Report must include the Corepack resolver deficit row.');
  assert(markdown.includes('| Release-readiness execution |'), 'Report must include the release-readiness execution deficit row.');
  assert(markdown.includes('| Git LFS push-path proof |'), 'Report must include the Git LFS push-path deficit row.');
  assert(markdown.includes('| Explicit owner production approval |'), 'Report must include the explicit owner approval deficit row.');
  assert(markdown.includes('## Release Preflight Remediation Queue'), 'Report must include the release preflight remediation queue table.');
  assert(markdown.includes('Release preflight remediation queue'), 'Report must include structured release remediation evidence from the manifest.');
  assert(markdown.includes('This queue is a decision aid only'), 'Report must preserve the release remediation non-execution boundary.');
  assert(markdown.includes('does not install tools'), 'Report must preserve the release remediation no-tool-install boundary.');
  assert(markdown.includes('corepack pnpm run check:release-readiness'), 'Report must include the release-readiness remediation proof command.');
  assert(markdown.includes('corepack pnpm run check:production-deploy-request'), 'Report must include the production approval request proof command.');
  assert(markdown.includes('Source provenance:'), 'Report must include source provenance evidence from the manifest.');
  assert(markdown.includes('staging_state='), 'Report must include staged/unstaged source provenance classification from the manifest.');
  assert(markdown.includes('Branch family review'), 'Report must include branch-family evidence from the manifest.');
  assert(markdown.includes('High-risk, local/origin split, or stale/aging unmerged branches'), 'Report must preserve the branch-family and freshness launch blocker.');
  assert(markdown.includes('Branch freshness review'), 'Report must include branch freshness evidence from the manifest.');
  assert(markdown.includes('Branch review queue'), 'Report must include the actionable branch review queue evidence from the manifest.');
  assert(markdown.includes('Review-first branch packets'), 'Report must include review-first focused branch packet evidence from the manifest.');
  assert(markdown.includes('Top branch review packet'), 'Report must include the focused top branch review packet evidence from the manifest.');
  assert(markdown.includes('Canonical head comparison'), 'Report must include the local-vs-origin canonical head comparison evidence from the manifest.');
  assert(markdown.includes('approval_gate=no checkout/merge/deploy/migration/push'), 'Report must preserve the top branch packet no-mutation approval gate.');
  if (!options.skipProbes) {
    assert(markdown.includes('local_only='), 'Report must surface canonical-head local-only commit counts when branch probes run.');
    assert(markdown.includes('review_first'), 'Report must surface review-first branch queue priority when branch probes run.');
    assert(markdown.includes('canonical_states='), 'Report must surface review-first canonical head states when branch probes run.');
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
  const actionQueueSection = extractSection(markdown, 'Launch Blocker Action Queue');
  const sourceResolutionSection = extractSection(markdown, 'Source Provenance Resolution Queue');
  const branchCanonicalDecisionSection = extractSection(markdown, 'Branch Canonical Head Decision Deficits');
  const buyerDeficitSection = extractSection(markdown, 'Buyer Evidence Hard Gate Deficits');
  const buyerRemediationSection = extractSection(markdown, 'Buyer Evidence Remediation Queue');
  const supabaseDeficitSection = extractSection(markdown, 'Supabase Advisor Clearance Deficits');
  const supabaseRemediationSection = extractSection(markdown, 'Supabase Advisor Remediation Queue');
  const releasePreflightSection = extractSection(markdown, 'Release Toolchain And Approval Deficits');
  const releaseRemediationSection = extractSection(markdown, 'Release Preflight Remediation Queue');
  const evidenceSection = extractSection(markdown, 'Evidence Validation');
  const eccSection = extractSection(markdown, 'ECC Ledger');

  assert(countDataRows(launchSection) === 5, 'Launch score table must include five dimensions.');
  assert(countDataRows(gapSection) >= 4, 'Gap analysis table must include current P0/P1 launch blockers.');
  assert(countDataRows(actionQueueSection) >= 6, 'Launch blocker action queue must include the launch execution phases.');
  assert(countDataRows(sourceResolutionSection) >= 1, 'Source provenance resolution queue must include at least the clean/dirty boundary row.');
  assert(countDataRows(branchCanonicalDecisionSection) >= 1, 'Branch canonical-head decision table must include at least the skipped/empty boundary row.');
  assert(countDataRows(buyerDeficitSection) >= 1, 'Buyer evidence hard-gate deficit table must include at least one row.');
  assert(countDataRows(buyerRemediationSection) >= 1, 'Buyer evidence remediation queue must include at least one row or skipped boundary.');
  assert(countDataRows(supabaseDeficitSection) >= 3, 'Supabase advisor clearance deficit table must include the key advisor clearance rows.');
  assert(countDataRows(supabaseRemediationSection) >= 3, 'Supabase advisor remediation queue must include the key advisor remediation rows.');
  assert(countDataRows(releasePreflightSection) >= 4, 'Release preflight deficit table must include the key toolchain and approval rows.');
  assert(countDataRows(releaseRemediationSection) >= 2, 'Release preflight remediation queue must include current release remediation actions.');
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

console.log('Commercial launch readiness report check passed: required tables, blocked decision, source URLs, proof buckets, buyer evidence, launch action queue, source provenance resolution queue, canonical-head decision deficits, buyer hard-gate deficits, buyer evidence remediation queue, Supabase advisor evidence, Supabase advisor clearance deficits, Supabase advisor remediation queue, release preflight deficits, release preflight remediation queue, source provenance with staged/unstaged classification, branch families, branch freshness, branch review queue, review-first branch packets, top branch packet, canonical head comparison, and validation boundaries are present.');
