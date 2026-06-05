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
const failOnPreDeployBlocker = args.includes('--fail-on-predeploy-blocker');
const generatedAt = new Date().toISOString();
const hostedProofPackRouteGrep = 'route /(utility-demand-forecast|forecast-benchmarking|regulatory-filing|pilot-readiness|ga-ici-5cp|byo-csv-proof)';

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commandText(command, commandArgs) {
  return [command, ...commandArgs].map(shellQuote).join(' ');
}

function processErrorText(command, error) {
  if (!error) return '';

  const message = String(error.message ?? error);
  const code = String(error.code ?? '');
  if (command === 'corepack' && (code === 'ENOENT' || /ENOENT/i.test(message))) {
    return [
      'Corepack executable was not found on PATH.',
      'Production deploy preflight uses Corepack to honor the pinned packageManager pnpm version.',
      'Enable Corepack in this shell or run from a Corepack-enabled deploy environment; do not treat bare pnpm or a temporary local shim as production approval evidence.',
      `Raw error: ${message}`,
    ].join('\n');
  }

  return message;
}

function pnpmRunArgs(scriptName) {
  return ['pnpm', 'run', scriptName];
}

function pnpmExecArgs(commandName, commandArgs = []) {
  return ['pnpm', 'exec', commandName, ...commandArgs];
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
    error: processErrorText(command, result.error),
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

function runGit(commandArgs) {
  return spawnSync('git', commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 1024 * 1024,
  });
}

function gitOutput(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error ? String(result.error.message ?? result.error) : ''}`.trim();
}

function parsePorcelainStatusLine(line) {
  const statusCode = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const renameParts = rawPath.includes(' -> ') ? rawPath.split(' -> ').map((item) => item.trim()) : [];
  const filePath = renameParts.length > 0 ? renameParts.at(-1) : rawPath;
  const oldPath = renameParts.length > 1 ? renameParts[0] : null;
  return { statusCode, rawPath, filePath, oldPath };
}

function gitPathCheck(commandArgs) {
  const result = runGit(commandArgs);
  return result.status === 0;
}

function statusLabel(statusCode) {
  if (statusCode === '??') return 'untracked';
  if (statusCode === '!!') return 'ignored';
  if (statusCode.includes('D')) return 'deleted';
  if (statusCode.includes('R')) return 'renamed';
  if (statusCode.includes('A')) return 'added';
  if (statusCode.includes('M')) return 'modified';
  return statusCode.trim() || 'changed';
}

function statusSlotLabel(code) {
  return {
    ' ': 'clean',
    M: 'modified',
    A: 'added',
    D: 'deleted',
    R: 'renamed',
    C: 'copied',
    U: 'unmerged',
    T: 'type_changed',
    '?': 'untracked',
    '!': 'ignored',
  }[code] ?? (code || 'unknown');
}

function stagingStateForStatus(statusCode) {
  if (statusCode === '??') {
    return { indexStatus: 'untracked', worktreeStatus: 'untracked', stagingState: 'untracked' };
  }
  if (statusCode === '!!') {
    return { indexStatus: 'ignored', worktreeStatus: 'ignored', stagingState: 'ignored' };
  }

  const indexStatus = statusSlotLabel(statusCode[0] ?? ' ');
  const worktreeStatus = statusSlotLabel(statusCode[1] ?? ' ');
  const staged = indexStatus !== 'clean';
  const unstaged = worktreeStatus !== 'clean';
  return {
    indexStatus,
    worktreeStatus,
    stagingState: staged && unstaged
      ? 'staged_and_unstaged'
      : staged
        ? 'staged_only'
        : unstaged
          ? 'unstaged_only'
          : 'clean',
  };
}

function dirtyPathAction({ tracked, ignoredByRule, stagingState }) {
  if (tracked && ignoredByRule) {
    return 'tracked generated-or-local artifact; unstage, restore, or intentionally remove from index before deploy';
  }
  if (!tracked && ignoredByRule) {
    return 'ignored local artifact; remove local copy before deploy if it appears in status';
  }
  if (!tracked) {
    return 'untracked non-ignored path; move outside repo, add an intentional ignore rule, or commit only if source evidence';
  }
  if (stagingState === 'staged_only') {
    return 'staged source change; commit, unstage, stash, or revert before deploy';
  }
  if (stagingState === 'unstaged_only') {
    return 'unstaged source change; commit, stash, or revert before deploy';
  }
  if (stagingState === 'staged_and_unstaged') {
    return 'staged and unstaged source changes; resolve both index and worktree before deploy';
  }
  return 'tracked source change; commit, stash, or revert before deploy';
}

function classifyDirtyPath(statusLine) {
  const { statusCode, rawPath, filePath, oldPath } = parsePorcelainStatusLine(statusLine);
  const tracked = gitPathCheck(['ls-files', '--error-unmatch', '--', filePath]);
  const ignoredByRule = gitPathCheck(['check-ignore', '--no-index', '-q', '--', filePath]);
  const { indexStatus, worktreeStatus, stagingState } = stagingStateForStatus(statusCode);
  return {
    rawPath,
    filePath,
    oldPath,
    status: statusLabel(statusCode),
    indexStatus,
    worktreeStatus,
    stagingState,
    tracked,
    ignoredByRule,
    action: dirtyPathAction({ tracked, ignoredByRule, stagingState }),
  };
}

function sourceProvenanceStep() {
  const branch = runGit(['branch', '--show-current']);
  const commit = runGit(['rev-parse', '--short', 'HEAD']);
  const status = runGit(['status', '--short']);
  const failures = [];

  if (branch.status !== 0) failures.push(`git branch --show-current failed: ${gitOutput(branch) || 'no output'}`);
  if (commit.status !== 0) failures.push(`git rev-parse --short HEAD failed: ${gitOutput(commit) || 'no output'}`);
  if (status.status !== 0) failures.push(`git status --short failed: ${gitOutput(status) || 'no output'}`);

  const branchName = (branch.stdout ?? '').trim() || '(detached or unknown)';
  const commitSha = (commit.stdout ?? '').trim() || '(unknown)';
  const statusLines = (status.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const dirtyDetails = status.status === 0 ? statusLines.slice(0, 40).map(classifyDirtyPath) : [];

  if (branch.status === 0 && branchName !== 'main') {
    failures.push(`deploy script requires branch main; current branch is ${branchName}.`);
  }
  if (status.status === 0 && statusLines.length > 0) {
    failures.push(`deploy script requires a clean worktree; ${statusLines.length} dirty path(s) detected.`);
  }

  return {
    label: 'Source deploy provenance',
    command: 'git branch --show-current && git rev-parse --short HEAD && git status --short',
    exitCode: failures.length === 0 ? 0 : 1,
    status: failures.length === 0 ? 'pass' : 'fail',
    durationMs: 0,
    stdout: [
      `Branch: ${branchName}`,
      `Commit: ${commitSha}`,
      `Worktree: ${statusLines.length === 0 ? 'clean' : 'dirty'}`,
      ...statusLines.slice(0, 40).map((line) => `Dirty: ${line}`),
      ...dirtyDetails.map((detail) =>
        `Dirty detail: ${detail.filePath} | status=${detail.status} | index_status=${detail.indexStatus} | worktree_status=${detail.worktreeStatus} | staging_state=${detail.stagingState}${detail.oldPath ? ` | old_path=${detail.oldPath}` : ''} | tracked=${detail.tracked ? 'yes' : 'no'} | ignored_by_rule=${detail.ignoredByRule ? 'yes' : 'no'} | action=${detail.action}`,
      ),
      ...failures.map((failure) => `Blocker: ${failure}`),
    ].join('\n'),
    stderr: '',
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

  if (step.status === 'skipped') {
    return lines.slice(0, 80);
  }

  if (step.label === 'Local release readiness' && step.status === 'pass') {
    const noisyNestedLiveEvidence =
      /^(?:[-# ]*Status: fail|Public metadata check failed:|Live static parity check failed:|.*ELIFECYCLE.*|[-] https?:\/\/|[-] \/: remote static content|[-] \/manifest\.json: remote static content|[-] \/schema-webapp\.jsonld: remote static content)/i;
    const localPassLines = lines.filter((line) =>
      !noisyNestedLiveEvidence.test(line)
      && /passed|PASS|Test Files|Tests|Claim-boundary|Commercial source|Pilot evidence|bundle budgets|built in|Public metadata check passed|GA\/ICI public historical actuals|Production deploy script guard/i.test(
        line,
      ),
    );

    return [
      'Local release readiness passed; live parity is reported by the dedicated live metadata, static parity, and hosted smoke gates below.',
      ...localPassLines,
    ].slice(0, 80);
  }

  if (step.label === 'Live metadata parity') {
    return lines.filter((line) => /^-|Public metadata check/.test(line)).slice(0, 80);
  }

  if (step.label === 'Live static dist parity') {
    return lines.filter((line) => /^-|Live static parity check/.test(line)).slice(0, 80);
  }

  if (step.label === 'Source deploy provenance') {
    return lines.filter((line) => /^(Branch|Commit|Worktree|Dirty|Dirty detail|Blocker):/.test(line)).slice(0, 100);
  }

  if (step.label === 'Launch evidence manifest validation') {
    return lines.slice(0, 100);
  }

  if (step.label === 'Public release status manifest validation') {
    return lines.slice(0, 100);
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

steps.push(sourceProvenanceStep());
steps.push(runStep('Launch evidence manifest validation', 'node', ['scripts/check-launch-evidence-manifest.mjs']));
steps.push(runStep('Public release status manifest validation', 'node', ['scripts/generate-public-release-status.mjs', '--check']));

if (skipReleaseReadiness) {
  steps.push(skippedStep('Local release readiness', 'Skipped by --skip-release-readiness.'));
} else {
  steps.push(runStep('Local release readiness', 'corepack', pnpmRunArgs('check:release-readiness')));
}

steps.push(runStep('Live metadata parity', 'node', ['scripts/check-public-metadata.mjs', '--base-url', baseUrl]));
if (skipReleaseReadiness) {
  steps.push(
    skippedStep(
      'Live static dist parity',
      'Skipped because local release readiness was skipped; exact static parity requires a freshly built dist from `corepack pnpm run check:release-readiness` or `corepack pnpm run check:post-deploy-live`.',
    ),
  );
} else {
  steps.push(runStep('Live static dist parity', 'node', ['scripts/check-live-static-parity.mjs', '--base-url', baseUrl]));
}

if (includeHostedSmoke) {
  steps.push(
    runStep(
      'Hosted proof-pack route smoke',
      'corepack',
      pnpmExecArgs('playwright', [
        'test',
        '--config=playwright.config.ts',
        'tests/component/phase6-browser-smoke.spec.ts',
        '--project=chromium',
        '--grep',
        hostedProofPackRouteGrep,
      ]),
      {
        env: {
          PLAYWRIGHT_SKIP_WEBSERVER: 'true',
          TEST_BASE_URL: baseUrl,
          PLAYWRIGHT_HTML_OUTPUT_DIR: '/tmp/ceip-approval-hosted-proof-packs-playwright-report',
          PLAYWRIGHT_JSON_OUTPUT_FILE: '/tmp/ceip-approval-hosted-proof-packs-playwright-results.json',
        },
      },
    ),
  );
} else {
  steps.push(skippedStep('Hosted proof-pack route smoke', 'Skipped by default. Pass --include-hosted-smoke to run it.'));
}

const localReadiness = steps.find((step) => step.label === 'Local release readiness');
const launchEvidenceManifest = steps.find((step) => step.label === 'Launch evidence manifest validation');
const publicReleaseStatus = steps.find((step) => step.label === 'Public release status manifest validation');
const sourceProvenance = steps.find((step) => step.label === 'Source deploy provenance');
const liveMetadata = steps.find((step) => step.label === 'Live metadata parity');
const liveStaticParity = steps.find((step) => step.label === 'Live static dist parity');
const hostedSmoke = steps.find((step) => step.label === 'Hosted proof-pack route smoke');
const sourceDeployable = sourceProvenance?.status === 'pass';
const launchEvidenceManifestClean = launchEvidenceManifest?.status === 'pass';
const publicReleaseStatusClean = publicReleaseStatus?.status === 'pass';
const localPreflightClean = localReadiness?.status === 'pass';
const liveMetadataGreen = liveMetadata?.status === 'pass';
const liveStaticParityGreen = liveStaticParity?.status === 'pass';
const hostedSmokeGreen = hostedSmoke?.status === 'pass';
const deploymentRequestReady = sourceDeployable && launchEvidenceManifestClean && publicReleaseStatusClean && localPreflightClean;
const liveParityAchieved = deploymentRequestReady && liveMetadataGreen && liveStaticParityGreen && hostedSmokeGreen;
const fullLiveGateGreen = liveParityAchieved;
const blockedByLiveMetadata = liveMetadata?.status === 'fail';
const blockedByStaticParity = liveStaticParity?.status === 'fail';
const staticParityNotRun = liveStaticParity?.status === 'skipped';
const hostedSmokeNotRun = hostedSmoke?.status === 'skipped';
const preDeployBlockers = [
  !sourceDeployable ? 'source deploy provenance is not deploy-script-ready' : null,
  !launchEvidenceManifestClean ? 'launch evidence manifest validation is not passing' : null,
  !publicReleaseStatusClean ? 'public release status manifest validation is not passing' : null,
  !localPreflightClean ? 'local release readiness is not passing' : null,
].filter(Boolean);
const liveParityBlockers = [
  blockedByLiveMetadata ? 'live metadata parity is failing' : null,
  blockedByStaticParity ? 'live static dist parity is failing' : null,
  staticParityNotRun ? 'live static dist parity was skipped' : null,
  hostedSmokeNotRun ? 'hosted proof-pack route smoke was skipped' : null,
].filter(Boolean);
const blockers = [...preDeployBlockers, ...liveParityBlockers];

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
  `- Source deploy provenance: ${sourceProvenance?.status}.`,
  `- Launch evidence manifest validation: ${launchEvidenceManifest?.status}.`,
  `- Public release status manifest validation: ${publicReleaseStatus?.status}.`,
  `- Local source approval state: ${localReadiness?.status === 'pass' ? 'preflight-clean' : localReadiness?.status}.`,
  `- Live metadata parity: ${liveMetadata?.status}.`,
  `- Live static dist parity: ${liveStaticParity?.status}.`,
  `- Hosted proof-pack smoke: ${hostedSmoke?.status}.`,
  `- Deployment request readiness: ${deploymentRequestReady ? 'ready for explicit owner approval' : 'blocked'}.`,
  `- Live parity achieved: ${liveParityAchieved ? 'yes' : 'no'}.`,
  '- Production deployment: not performed by this report.',
  '- Production approval: still requires an explicit owner approval before any deploy command.',
  '- Commercial launch boundary: launch evidence manifest validation checks structure and proof boundaries only; it does not prove commercial-ready status, production approval, or buyer acceptance.',
  '- Public status boundary: public release-status validation checks `/status/release-health.json` sync only; it does not prove production approval, deployment, buyer acceptance, or current hosted/live parity.',
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
  preDeployBlockers.length > 0
    ? `Do not request production deploy approval. Blocking pre-deploy gates: ${preDeployBlockers.join('; ')}.`
    : fullLiveGateGreen
    ? 'Local and live gates are green. Treat this as observed live parity for the currently checked artifact; it is not production approval and it is not proof of a new deployment unless this packet was run after an explicitly approved deploy.'
    : blockedByLiveMetadata
      ? 'Local source is ready to request explicit production remediation approval, but live parity is not achieved. Production is still serving stale metadata; deploy current source only after explicit owner approval, then rerun `corepack pnpm run check:post-deploy-live`.'
      : blockedByStaticParity
        ? 'Local source is ready to request explicit production remediation approval, but live parity is not achieved. Production static files do not match built `dist`; deploy current source only after explicit owner approval, then rerun `corepack pnpm run check:post-deploy-live`.'
      : staticParityNotRun
        ? 'Local source is ready to request explicit production remediation approval, but live parity is not achieved. Static parity was skipped because local release readiness did not provide a freshly built `dist`; run the full packet or `corepack pnpm run check:post-deploy-live` before declaring live parity.'
      : hostedSmokeNotRun
        ? 'Metadata is green, but hosted proof-pack smoke was not run. Use `--include-hosted-smoke` or `corepack pnpm run check:post-deploy-live` before declaring live parity.'
      : 'Do not approve production release until failed or skipped required gates are resolved.',
  '',
  '## Operator Checklist',
  '',
  '1. Review this packet and confirm source deploy provenance is on `main` with a clean worktree.',
  '2. Confirm launch evidence manifest validation is passing while the commercial launch decision remains proof-bound.',
  '3. Confirm public release-status validation is passing so `/status/release-health.json` is synced before any approval request.',
  '4. Confirm local release readiness is passing.',
  '5. Confirm the owner explicitly approves production deployment.',
  '6. Deploy current source using the guarded production deploy path only after approval.',
  '7. Run `corepack pnpm run check:post-deploy-live` after deploy; it checks live metadata, static `dist` parity, and hosted proof-pack smoke.',
  '8. Keep buyer-proven 95% market confidence unchanged until the filled buyer register and retained redacted artifact hashes pass the pilot-evidence gate.',
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

if (failOnBlocker && !fullLiveGateGreen) {
  process.exit(1);
}

if (failOnPreDeployBlocker && !deploymentRequestReady) {
  process.exit(1);
}
