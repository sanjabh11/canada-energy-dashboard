#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const baseUrl = readArg('--base-url', 'https://canada-energy.netlify.app');
const outPath = readArg('--out');
const skipReleaseReadiness = args.includes('--skip-release-readiness');
const includeHostedSmoke = args.includes('--include-hosted-smoke');
const failOnBlocker = args.includes('--fail-on-blocker');
const generatedAt = new Date().toISOString();

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commandText(command, commandArgs) {
  return [command, ...commandArgs].map(shellQuote).join(' ');
}

function runStep(label, command, commandArgs, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      ...(options.env ?? {}),
    },
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    label,
    command: commandText(command, commandArgs),
    exitCode: typeof result.status === 'number' ? result.status : 1,
    status: result.status === 0 ? 'pass' : 'fail',
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function skippedStep(label, reason) {
  return {
    label,
    command: 'not run',
    exitCode: null,
    status: 'skipped',
    durationMs: 0,
    stdout: '',
    stderr: reason,
    error: '',
  };
}

function relevantLines(step) {
  const combined = `${step.stdout}\n${step.stderr}\n${step.error}`.trim();
  if (!combined) return ['No output captured.'];

  const lines = combined
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (step.label === 'Live metadata parity') {
    return lines.filter((line) => /^-|Public metadata check/.test(line)).slice(0, 80);
  }

  if (step.label === 'Live static dist parity') {
    return lines.filter((line) => /^-|Live static parity check/.test(line)).slice(0, 80);
  }

  const important = lines.filter((line) =>
    /passed|failed|PASS|FAIL|Test Files|Tests|Public metadata check|Claim-boundary|Commercial source|Pilot evidence|bundle budgets|built in/i.test(
      line,
    ),
  );

  return (important.length > 0 ? important : lines).slice(-80);
}

function markdownForStep(step) {
  const duration = step.durationMs > 0 ? `${(step.durationMs / 1000).toFixed(1)}s` : 'n/a';
  const output = relevantLines(step).join('\n');
  return [
    `### ${step.label}`,
    '',
    `- Status: ${step.status}`,
    `- Exit code: ${step.exitCode ?? 'n/a'}`,
    `- Duration: ${duration}`,
    `- Command: \`${step.command}\``,
    '',
    '```text',
    output,
    '```',
  ].join('\n');
}

const steps = [];

if (skipReleaseReadiness) {
  steps.push(skippedStep('Local release readiness', 'Skipped by --skip-release-readiness.'));
} else {
  steps.push(runStep('Local release readiness', 'pnpm', ['run', 'check:release-readiness']));
}

steps.push(runStep('Live metadata parity', 'node', ['scripts/check-public-metadata.mjs', '--base-url', baseUrl]));
steps.push(runStep('Live static dist parity', 'node', ['scripts/check-live-static-parity.mjs', '--base-url', baseUrl]));

if (includeHostedSmoke) {
  steps.push(
    runStep(
      'Hosted proof-pack route smoke',
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        '--config=playwright.config.ts',
        'tests/component/phase6-browser-smoke.spec.ts',
        '--project=chromium',
        '--grep',
        'route /(utility-demand-forecast|forecast-benchmarking|regulatory-filing|pilot-readiness)',
      ],
      {
        env: {
          PLAYWRIGHT_SKIP_WEBSERVER: 'true',
          TEST_BASE_URL: baseUrl,
        },
      },
    ),
  );
} else {
  steps.push(skippedStep('Hosted proof-pack route smoke', 'Skipped by default. Pass --include-hosted-smoke to run it.'));
}

const localReadiness = steps.find((step) => step.label === 'Local release readiness');
const liveMetadata = steps.find((step) => step.label === 'Live metadata parity');
const liveStaticParity = steps.find((step) => step.label === 'Live static dist parity');
const hostedSmoke = steps.find((step) => step.label === 'Hosted proof-pack route smoke');
const localPreflightClean = localReadiness?.status === 'pass';
const liveParityAchieved =
  liveMetadata?.status === 'pass' && liveStaticParity?.status === 'pass' && hostedSmoke?.status === 'pass';
const blockedByLiveMetadata = liveMetadata?.status === 'fail';
const blockedByStaticParity = liveStaticParity?.status === 'fail';
const hostedSmokeNotRun = hostedSmoke?.status === 'skipped';

const summaryRows = steps
  .map((step) => `| ${step.label} | ${step.status} | ${step.exitCode ?? 'n/a'} | \`${step.command}\` |`)
  .join('\n');

const markdown = [
  '# CEIP Production Approval Packet',
  '',
  `Generated: ${generatedAt}`,
  `Base URL: ${baseUrl}`,
  '',
  '## Decision Boundary',
  '',
  `- Local source approval state: ${localReadiness?.status === 'pass' ? 'preflight-clean' : localReadiness?.status}.`,
  `- Live metadata parity: ${liveMetadata?.status}.`,
  `- Live static dist parity: ${liveStaticParity?.status}.`,
  `- Hosted proof-pack smoke: ${hostedSmoke?.status}.`,
  '- Production deployment: not performed by this report.',
  '- Production approval: still requires an explicit owner approval before any deploy command.',
  '- Buyer-confidence boundary: this report does not raise buyer-proven 95% market confidence; that still requires `validate:pilot-evidence --require-95 --evidence-root ...` against redacted buyer artifacts.',
  '',
  '## Gate Summary',
  '',
  '| Gate | Status | Exit | Command |',
  '|---|---|---:|---|',
  summaryRows,
  '',
  '## Approval Recommendation',
  '',
  liveParityAchieved
    ? 'Local and live gates are green. Live parity can be considered achieved, but this script itself is not production approval.'
    : !localPreflightClean
      ? 'Do not ask for production approval until local release readiness is passing.'
      : blockedByLiveMetadata
      ? 'Do not declare live parity. Production is still serving stale metadata; deploy current source only after explicit approval, then rerun `pnpm run check:post-deploy-live`.'
      : blockedByStaticParity
        ? 'Do not declare live parity. Production static files do not match built `dist`; deploy current source only after explicit approval, then rerun `pnpm run check:post-deploy-live`.'
      : hostedSmokeNotRun
        ? 'Metadata is green, but hosted proof-pack smoke was not run. Use `--include-hosted-smoke` or `pnpm run check:post-deploy-live` before declaring live parity.'
      : 'Do not approve production release until failed or skipped required gates are resolved.',
  '',
  '## Operator Checklist',
  '',
  '1. Review this packet and confirm local release readiness is passing.',
  '2. Confirm the owner explicitly approves production deployment.',
  '3. Deploy current source using the approved release path only after approval.',
  '4. Run `pnpm run check:post-deploy-live` after deploy; it checks live metadata, static `dist` parity, and hosted proof-pack smoke.',
  '5. Keep buyer-proven 95% market confidence unchanged until the filled buyer register and retained redacted artifact hashes pass the pilot-evidence gate.',
  '',
  '## Evidence',
  '',
  steps.map(markdownForStep).join('\n\n'),
  '',
].join('\n');

if (outPath) {
  const resolvedOutPath = path.resolve(repoRoot, outPath);
  const outputDir = path.dirname(resolvedOutPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(resolvedOutPath, markdown);
  console.log(`Production approval packet written to ${resolvedOutPath}`);
} else {
  console.log(markdown);
}

if (failOnBlocker && !liveParityAchieved) {
  process.exit(1);
}
