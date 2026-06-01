#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { strategySourceAnchorUrls } from './lib/strategy-source-anchors.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const planRelativePath = readArg('--plan', '/Users/sanjayb/.windsurf/plans/ceip-95-strategy-feature-gap-76d135.md');
const roadmapRelativePath = readArg('--roadmap', 'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md');
const outPath = readArg('--out');
const failOnLocalChecks = args.includes('--fail-on-local-checks');
const includeChecks = args.includes('--include-checks') || failOnLocalChecks;
const generatedAt = new Date().toISOString();

const planPath = path.resolve(repoRoot, planRelativePath);
const roadmapPath = path.resolve(repoRoot, roadmapRelativePath);
const packagePath = path.join(repoRoot, 'package.json');
const gaIciPublicActualsRelativePath = 'public/data/ga_ici_5cp_public_historical_actuals.csv';
const gaIciPublicActualsPath = path.join(repoRoot, gaIciPublicActualsRelativePath);

function fileText(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commandText(command, commandArgs) {
  return [command, ...commandArgs].map(shellQuote).join(' ');
}

function runStep(label, command, commandArgs) {
  const startedAt = Date.now();
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    label,
    command: commandText(command, commandArgs),
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: typeof result.status === 'number' ? result.status : 1,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function hasAll(source, needles) {
  return needles.every((needle) => source.includes(needle));
}

function hasPattern(source, pattern) {
  return pattern.test(source);
}

function statusCell(status) {
  return status;
}

function requirementRow(id, requirement, status, evidence, remainingGate) {
  return { id, requirement, status, evidence, remainingGate };
}

const plan = fileText(planPath);
const roadmap = fileText(roadmapPath);
const packageJson = fileText(packagePath);

const deliverableSections = [
  '## 1. Verdict',
  '## 3. Market And Source Anchors',
  '## 4. Top 10 Feature Roadmap',
  '### 4.1 Radical Feature Deep-Dives',
  '## 5. Have-Vs-Needed Gap Analysis',
  '## 6. Prediction-Accuracy Uplift Track',
  '## 7. Marketability And Sellability Track',
  '## 8. Phased Implementation Plan',
  '## 9. Loophole To Fix Ledger',
];

const pillars = [
  'Niche correctness',
  'Feature-set completeness',
  'Uniqueness and defensibility',
  'Prediction credibility',
  'Marketability and sellability logic',
  'Feasibility, solo-dev',
  'Gap closeability',
];

const topTenFeatures = [
  'Utility demand forecast planning pack',
  'Forecast trust report',
  'OEB/AUC filing autobinder',
  'Ontario GA/ICI 5CP predictor',
  'Privacy-preserving BYO-CSV proof generator',
  'TIER CFO policy what-if and memo',
  'TIER credit banking audit',
  'Asset health capex pack',
  'Utility security procurement pack',
  'Shadow billing invoice proof pack',
];

const adversarialQuestions = [
  'Is the niche big enough?',
  'Does Amperon, EnergyCAP',
  'Is filing-prep recurring budget or one-off work?',
  'Can a solo dev credibly claim accurate predictions without real data?',
  'Does GA/ICI prediction need incumbent-scale infrastructure?',
  'Is privacy-preserving BYO-CSV proof real or just marketing?',
  'Does any top-10 feature require incumbent-scale resources?',
];

const sourceAnchors = strategySourceAnchorUrls;

const checkSteps = includeChecks
  ? [
      runStep('Strategy roadmap structure', 'pnpm', ['run', 'check:strategy-roadmap-doc']),
      runStep('Commercial source guard', 'pnpm', ['run', 'check:commercial-source']),
      runStep('Strategy source anchors', 'pnpm', ['run', 'check:strategy-source-anchors']),
      runStep('GA/ICI public historical actuals', 'pnpm', ['run', 'check:ga-ici-public-actuals']),
      runStep('Production deploy script guard', 'pnpm', ['run', 'check:production-deploy-script']),
      runStep('Pilot evidence fixture gate', 'pnpm', ['run', 'check:pilot-evidence-95-fixture-gate']),
      runStep('Pilot evidence template', 'pnpm', ['run', 'check:pilot-evidence-template']),
      runStep('Live public metadata', 'pnpm', ['run', 'check:live-public-metadata']),
      runStep('Live static dist parity', 'pnpm', ['run', 'check:live-static-parity']),
    ]
  : [];
const requiredLocalCheckLabels = new Set([
  'Strategy roadmap structure',
  'Commercial source guard',
  'Strategy source anchors',
  'GA/ICI public historical actuals',
  'Production deploy script guard',
  'Pilot evidence fixture gate',
  'Pilot evidence template',
]);
const failedRequiredLocalChecks = checkSteps.filter(
  (step) => requiredLocalCheckLabels.has(step.label) && step.status !== 'pass',
);
const liveMetadataStep = checkSteps.find((step) => step.label === 'Live public metadata');
const liveStaticParityStep = checkSteps.find((step) => step.label === 'Live static dist parity');
const liveParityChecked = Boolean(liveMetadataStep && liveStaticParityStep);
const liveParityAchieved =
  liveParityChecked && liveMetadataStep?.status === 'pass' && liveStaticParityStep?.status === 'pass';
const liveParityStatus = liveParityAchieved ? 'complete_live' : 'external_gate';
const liveParityEvidence = liveParityAchieved
  ? '`pnpm run check:live-public-metadata` and `pnpm run check:live-static-parity` passed in this audit, with the roadmap and production approval packet keeping the post-deploy gate explicit.'
  : 'Roadmap evidence ledger, production approval packet command, and static parity gate.';
const liveParityRemainingGate = liveParityAchieved
  ? 'No current live-static parity gate remains for the deployed metadata artifacts; rerun post-deploy live checks after future deploys.'
  : liveParityChecked
    ? 'Fix or redeploy until live metadata and static parity pass; buyer evidence remains separate.'
    : 'Run `pnpm run check:post-deploy-live` or this audit with `--include-checks` after approved deploy.';

const rows = [
  requirementRow(
    'R1',
    'Referenced 95% strategy plan is present and readable.',
    existsSync(planPath) && plan.includes('95% Strategy-Direction Confidence') ? 'complete_locally' : 'missing',
    planPath,
    'None if the plan remains readable.',
  ),
  requirementRow(
    'R2',
    'One new strategy doc exists at the planned path.',
    existsSync(roadmapPath) ? 'complete_locally' : 'missing',
    roadmapRelativePath,
    'None for desk-research deliverable.',
  ),
  requirementRow(
    'R3',
    'Deliverable covers verdict, whitespace, top-10, radical features, gap analysis, prediction uplift, marketability uplift, phased plan, and loophole ledger.',
    hasAll(roadmap, deliverableSections) ? 'complete_locally' : 'incomplete',
    'Roadmap headings plus `pnpm run check:strategy-roadmap-doc`.',
    'Keep structural guard passing when editing roadmap.',
  ),
  requirementRow(
    'R4',
    'Seven strategy-direction pillars each clear the 95% desk-research bar.',
    hasAll(roadmap, pillars) && hasPattern(roadmap, /Desk-research strategy-direction confidence:\s+\*\*95 \/ 100\*\*/) ? 'complete_locally' : 'incomplete',
    'Section 1 pillar table and 95/100 verdict.',
    'Do not convert this into buyer-proven market confidence.',
  ),
  requirementRow(
    'R5',
    'Buyer-evidence dependency is isolated as the desk-research blocker.',
    hasAll(roadmap, [
      'This is not a 95% market-confidence claim',
      'buyer-proven market confidence remains gated',
      'Fixtures and templates do not count as buyer proof',
      'validate:pilot-evidence --require-95 --evidence-root',
    ])
      ? 'complete_locally_external_gate'
      : 'incomplete',
    'Roadmap Sections 1, 2, 8, 11 and pilot evidence validator commands.',
    'Real filled buyer register plus retained redacted artifact hashes.',
  ),
  requirementRow(
    'R6',
    'Blended top-10 includes deepened wedges and radical net-new candidates.',
    hasAll(roadmap, topTenFeatures) ? 'complete_locally' : 'incomplete',
    'Section 4 top-10 table.',
    'Re-rank only with new buyer evidence.',
  ),
  requirementRow(
    'R7',
    'Adversarial loopholes are logged with fixes.',
    hasAll(roadmap, adversarialQuestions) ? 'complete_locally' : 'incomplete',
    'Sections 3.2 and 9.',
    'Keep loophole ledger current when new evidence changes a stop rule.',
  ),
  requirementRow(
    'R8',
    'Current external source anchors are represented and source-health reporting exists.',
    hasAll(roadmap, sourceAnchors) &&
      packageJson.includes('report:strategy-source-anchors') &&
      packageJson.includes('check:strategy-source-anchors')
      ? 'complete_locally'
      : 'incomplete',
    '`pnpm run report:strategy-source-anchors`, `pnpm run check:strategy-source-anchors`, and Section 3 source table.',
    'Manual review remains required for changed, expired, unreachable, or policy-sensitive sources.',
  ),
  requirementRow(
    'R9',
    'Forecast credibility is bounded by benchmark and trust-report evidence rather than broad accuracy claims.',
    hasAll(roadmap, [
      'Do not claim accurate predictions as a general product property',
      'seasonal MASE',
      'interval calibration gap',
      'prepare:forecast-trust-report-artifact',
    ])
      ? 'complete_locally'
      : 'incomplete',
    'Sections 2, 6, 7.1, 10 and focused forecast tests.',
    'Buyer-specific accuracy needs buyer backtests and reviewer acceptance.',
  ),
  requirementRow(
    'R10',
    'GA/ICI 5CP public historical actuals are curated as source-dated public evidence rather than synthetic-only fixtures.',
    existsSync(gaIciPublicActualsPath) &&
      roadmap.includes(gaIciPublicActualsRelativePath) &&
      packageJson.includes('check:ga-ici-public-actuals')
      ? 'complete_locally'
      : 'incomplete',
    `${gaIciPublicActualsRelativePath}, \`pnpm run check:ga-ici-public-actuals\`, and the GA/ICI gap row.`,
    'Buyer interval-load validation and reviewer acceptance remain external.',
  ),
  requirementRow(
    'R11',
    'Live production parity is verified when post-deploy live checks pass and remains gated when they do not.',
    hasAll(roadmap, [
      'Hosted root HTML',
      'Live metadata parity',
      'Live static parity',
      'check:live-static-parity',
      'future production deploy',
      'pnpm run report:production-approval-packet',
      'pnpm run check:post-deploy-live',
    ])
      ? liveParityStatus
      : 'incomplete',
    liveParityEvidence,
    liveParityRemainingGate,
  ),
  requirementRow(
    'R12',
    'Release/local verification gates are codified.',
    hasAll(packageJson, [
      'check:release-readiness',
      'check:commercial-source',
      'check:strategy-completion-audit',
      'check:strategy-roadmap-doc',
      'check:strategy-source-anchors',
      'check:ga-ici-public-actuals',
      'check:production-deploy-script',
      'test:strategy-audit-slice',
    ]) &&
      hasPattern(packageJson, /"check:release-readiness":\s*"[^"]*check:strategy-source-anchors/) &&
      hasPattern(packageJson, /"check:release-readiness":\s*"[^"]*check:ga-ici-public-actuals/) &&
      hasPattern(packageJson, /"check:release-readiness":\s*"[^"]*check:production-deploy-script/) &&
      hasPattern(packageJson, /"check:release-readiness":\s*"[^"]*check:strategy-completion-audit/)
      ? 'complete_locally'
      : 'incomplete',
    'package.json scripts and roadmap evidence ledger, including source-anchor currency, deploy-script drift, and completion-audit coverage in release readiness.',
    'Run before any approval or release request.',
  ),
];

function compactOutput(step) {
  const combined = `${step.stdout}\n${step.stderr}\n${step.error}`.trim();
  if (!combined) return 'No output captured.';
  return combined
    .split(/\r?\n/)
    .filter((line) =>
      /passed|failed|Verified anchors|Live-verified anchors|Manual-verified anchors|Network-unreachable anchors|Fetch-failed anchors|Fetch retries|manual evidence|static parity|remote static content|does not match dist|stale metadata|missing proof-pack|Strategy roadmap|Commercial source|Public metadata/i.test(
        line,
      ),
    )
    .slice(0, 80)
    .join('\n');
}

const summary = rows.reduce(
  (acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  },
  {},
);
const hasIncompleteRows = rows.some((row) => row.status === 'missing' || row.status === 'incomplete');

const rowMarkdown = rows
  .map(
    (row) =>
      `| ${row.id} | ${row.requirement} | ${statusCell(row.status)} | ${row.evidence} | ${row.remainingGate} |`,
  )
  .join('\n');

const checkMarkdown =
  checkSteps.length === 0
    ? 'Not run. Pass `--include-checks` to execute the linked local/network gates.'
    : checkSteps
        .map(
          (step) =>
            [
              `### ${step.label}`,
              '',
              `- Status: ${step.status}`,
              `- Exit code: ${step.exitCode}`,
              `- Duration: ${(step.durationMs / 1000).toFixed(1)}s`,
              `- Command: \`${step.command}\``,
              '',
              '```text',
              compactOutput(step),
              '```',
            ].join('\n'),
        )
        .join('\n\n');

const completionVerdict =
  failedRequiredLocalChecks.length > 0
    ? `The completion audit found failing local verification gates: ${failedRequiredLocalChecks
        .map((step) => step.label)
        .join(', ')}.`
    : rows.every(
          (row) =>
            row.status === 'complete_locally' ||
            row.status === 'complete_live' ||
            row.status === 'complete_locally_external_gate' ||
            row.status === 'external_gate',
        )
      ? liveParityAchieved
        ? 'The desk-research strategy-direction deliverable and current live static metadata parity are complete. The full product/business goal is not complete because buyer-proven market confidence remains an external gate.'
        : 'The desk-research strategy-direction deliverable is complete locally. The full product/business goal is not complete because live production parity has not been checked or achieved in this audit and buyer-proven market confidence remains an external gate.'
    : 'The completion audit found missing or incomplete desk-research requirements.';

const markdown = [
  '# CEIP Strategy Completion Audit',
  '',
  `Generated: ${generatedAt}`,
  `Plan: ${planRelativePath}`,
  `Roadmap: ${roadmapRelativePath}`,
  '',
  '## Verdict',
  '',
  completionVerdict,
  '',
  '## Status Counts',
  '',
  `- complete_locally: ${summary.complete_locally ?? 0}`,
  `- complete_live: ${summary.complete_live ?? 0}`,
  `- complete_locally_external_gate: ${summary.complete_locally_external_gate ?? 0}`,
  `- external_gate: ${summary.external_gate ?? 0}`,
  `- incomplete: ${summary.incomplete ?? 0}`,
  `- missing: ${summary.missing ?? 0}`,
  '',
  '## Requirement Audit',
  '',
  '| ID | Requirement | Status | Evidence | Remaining gate |',
  '|---|---|---|---|---|',
  rowMarkdown,
  '',
  '## Optional Command Evidence',
  '',
  checkMarkdown,
  '',
].join('\n');

if (outPath) {
  const resolvedOutPath = path.resolve(repoRoot, outPath);
  const outputDir = path.dirname(resolvedOutPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(resolvedOutPath, markdown);
  console.log(`Strategy completion audit written to ${resolvedOutPath}`);
} else {
  console.log(markdown);
}

if (failOnLocalChecks && (failedRequiredLocalChecks.length > 0 || hasIncompleteRows)) {
  process.exit(1);
}
