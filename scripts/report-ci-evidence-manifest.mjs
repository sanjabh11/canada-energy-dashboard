#!/usr/bin/env node
/**
 * report-ci-evidence-manifest.mjs — machine-readable identity for CI evidence.
 *
 * The build-and-smoke job uploads Playwright HTML/JSON reports and coverage,
 * but the artifact previously carried no binding to the tree/commit that
 * produced it. This writes ci-evidence-manifest.json at the repo root with:
 *
 *   - git HEAD sha and `git status --porcelain` entry count (dirty-tree signal)
 *   - working-tree fingerprint, shelled out to scripts/tree-fingerprint.mjs
 *   - generation timestamp (UTC ISO 8601)
 *   - GitHub Actions identity vars (GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT,
 *     GITHUB_SHA, GITHUB_WORKFLOW, GITHUB_JOB) when present — `ci` is null
 *     outside Actions so the script runs locally unchanged
 *   - sha256 + byte size for EVERY uploaded artifact file, recursively:
 *       playwright-report-[name] and all files beneath it
 *       (phase0 / phase6 / wedge / a11y dirs)
 *       playwright-results-*.json
 *       coverage/lcov.info
 *   - required_files / missing_files / complete: the concrete expected set
 *     derived from the upload-artifact `path:` globs in ci.yml, so a partial
 *     or failed job can no longer emit a green-looking manifest — the
 *     manifest itself declares what is absent
 *   - ci-evidence-manifest.json.sha256 sidecar (`<sha256>  <filename>`),
 *     uploaded alongside the manifest so its own integrity is verifiable
 *   - jobs: per-step outcomes when a caller provides them (CEIP_JOB_OUTCOMES
 *     env, JSON-encoded); Actions does not expose step outcomes to steps via
 *     env, so the explicit `"not-recorded"` sentinel is recorded otherwise
 *   - CEIP_PR_HEAD_SHA env (pull_request head sha) so branch SHA and merge
 *     SHA are recorded separately — PR checkouts test a merge commit.
 *
 * Usage: node scripts/report-ci-evidence-manifest.mjs [--require-complete]
 * Exits non-zero if git identity or the tree fingerprint cannot be computed.
 * Default invocation is record-only: missing evidence is declared in
 * missing_files (it may not exist when an earlier Playwright step failed).
 * --require-complete additionally exits non-zero when missing_files is
 * non-empty — used by the "Verify evidence completeness" gate step so
 * diagnostic upload stays always-on while release eligibility is gated.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(repoRoot, 'ci-evidence-manifest.json');

const fail = (message) => {
  console.error(`ci-evidence-manifest: ${message}`);
  process.exit(1);
};

const git = (args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let headSha;
let porcelainCount;
try {
  headSha = git(['rev-parse', 'HEAD']).trim();
  const porcelain = git(['status', '--porcelain', '-uall']);
  porcelainCount = porcelain.split('\n').filter((line) => line.trim() !== '').length;
} catch (error) {
  fail(`git identity unavailable: ${error.message}`);
}

// Tree identity — delegate to the canonical fingerprint implementation so the
// manifest covers exactly the same tracked + untracked (non-ignored) file set.
let treeFingerprint;
let treeFingerprintStats = null;
try {
  const out = execFileSync('node', ['scripts/tree-fingerprint.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const fingerprintMatch = out.match(/^TREE_FINGERPRINT: ([0-9a-f]{64})$/m);
  const statsMatch = out.match(/^hashed (\d+) files, skipped (\d+) /m);
  if (!fingerprintMatch) {
    fail('tree-fingerprint.mjs produced no TREE_FINGERPRINT line');
  }
  treeFingerprint = fingerprintMatch[1];
  if (statsMatch) {
    treeFingerprintStats = {
      hashed_files: Number(statsMatch[1]),
      skipped_entries: Number(statsMatch[2]),
    };
  }
} catch (error) {
  fail(`tree-fingerprint.mjs failed: ${error.message}`);
}

// CI identity — present only inside GitHub Actions.
const CI_ENV_VARS = [
  'GITHUB_RUN_ID',
  'GITHUB_RUN_ATTEMPT',
  'GITHUB_SHA',
  'GITHUB_REF',
  'GITHUB_EVENT_NAME',
  'GITHUB_WORKFLOW',
  'GITHUB_JOB',
  'CEIP_PR_HEAD_SHA',
];
const ciEnv = {};
for (const name of CI_ENV_VARS) {
  if (process.env[name]) {
    ciEnv[name] = process.env[name];
  }
}
const ci = Object.keys(ciEnv).length > 0 ? ciEnv : null;

// Step/job outcomes are not exposed to a step via environment in GitHub
// Actions (they live in the github/needs/job contexts). A caller that can
// provide them — e.g. a JSON-encoded CEIP_JOB_OUTCOMES env — is recorded
// verbatim; otherwise the sentinel makes the absence explicit.
let jobs = 'not-recorded';
if (process.env.CEIP_JOB_OUTCOMES) {
  try {
    jobs = JSON.parse(process.env.CEIP_JOB_OUTCOMES);
  } catch {
    jobs = process.env.CEIP_JOB_OUTCOMES;
  }
}

// Evidence file set: EVERY file under each playwright-report*/ directory
// (recursively — not only index.html), playwright-results-*.json, and
// coverage/lcov.info — whatever exists at run time.
const collectFilesRecursively = (dir, prefix) => {
  const collected = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      collected.push(...collectFilesRecursively(path.join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      collected.push(rel);
    }
  }
  return collected;
};

const targets = new Set();
for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.startsWith('playwright-report')) {
    for (const rel of collectFilesRecursively(path.join(repoRoot, entry.name), entry.name)) {
      targets.add(rel);
    }
  } else if (entry.isFile() && /^playwright-results-.*\.json$/.test(entry.name)) {
    targets.add(entry.name);
  }
}
if (existsSync(path.join(repoRoot, 'coverage', 'lcov.info'))) {
  targets.add('coverage/lcov.info');
}

const files = [...targets].sort().map((relativePath) => {
  const buffer = readFileSync(path.join(repoRoot, relativePath));
  return {
    path: relativePath,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.length,
  };
});

// Required evidence — the concrete expansion of the upload-artifact `path:`
// list in .github/workflows/ci.yml (build-and-smoke → "Upload browser +
// coverage artifacts"). The four suite names mirror the
// PLAYWRIGHT_HTML_OUTPUT_DIR / PLAYWRIGHT_JSON_OUTPUT_FILE env vars on the
// suite steps. Directory entries (trailing '/') glob-expand to every file
// beneath them; an absent or empty directory is itself the missing entry.
// The manifest and its .sha256 sidecar are written by this script, so they
// are required — keeping required_files equal to the uploaded set — but can
// never be missing.
const SELF_GENERATED_FILES = new Set([
  'ci-evidence-manifest.json',
  'ci-evidence-manifest.json.sha256',
]);
const REQUIRED_ENTRIES = [
  'playwright-report-phase0/',
  'playwright-report-phase6/',
  'playwright-report-wedge/',
  'playwright-report-a11y/',
  'playwright-results-phase0.json',
  'playwright-results-phase6.json',
  'playwright-results-wedge.json',
  'playwright-results-a11y.json',
  'coverage/lcov.info',
  ...SELF_GENERATED_FILES,
];

const requiredFiles = new Set();
const missingFiles = [];
for (const entry of REQUIRED_ENTRIES) {
  if (entry.endsWith('/')) {
    const dirName = entry.slice(0, -1);
    const dirPath = path.join(repoRoot, dirName);
    let expanded = [];
    try {
      if (statSync(dirPath).isDirectory()) {
        expanded = collectFilesRecursively(dirPath, dirName);
      }
    } catch {
      expanded = [];
    }
    if (expanded.length > 0) {
      for (const rel of expanded) requiredFiles.add(rel);
    } else {
      requiredFiles.add(entry);
      missingFiles.push(entry);
    }
  } else {
    requiredFiles.add(entry);
    if (!SELF_GENERATED_FILES.has(entry) && !existsSync(path.join(repoRoot, entry))) {
      missingFiles.push(entry);
    }
  }
}

const complete = missingFiles.length === 0;
const requireComplete = process.argv.slice(2).includes('--require-complete');

const manifest = {
  schema: 'ci-evidence-manifest/v1',
  generated_at: new Date().toISOString(),
  git: {
    head_sha: headSha,
    status_porcelain_count: porcelainCount,
    tree_fingerprint_sha256: treeFingerprint,
    tree_fingerprint_stats: treeFingerprintStats,
  },
  ci,
  jobs,
  required_files: [...requiredFiles].sort(),
  missing_files: [...missingFiles].sort(),
  complete,
  file_count: files.length,
  files,
};

const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(outputPath, manifestBody);

// sha256sum-format sidecar so the manifest's own integrity is verifiable —
// the manifest cannot carry its own hash.
const sidecarPath = `${outputPath}.sha256`;
const manifestSha256 = createHash('sha256').update(manifestBody).digest('hex');
writeFileSync(sidecarPath, `${manifestSha256}  ${path.basename(outputPath)}\n`);

console.log(`ci-evidence-manifest: wrote ${outputPath}`);
console.log(`ci-evidence-manifest: wrote ${sidecarPath}`);
console.log(`ci-evidence-manifest: hashed ${files.length} evidence file(s)`);
if (missingFiles.length > 0) {
  console.log(
    `ci-evidence-manifest: ${missingFiles.length} required ` +
      `${missingFiles.length === 1 ? 'entry' : 'entries'} missing: ${missingFiles.join(', ')}`,
  );
}
if (requireComplete && !complete) {
  console.error('ci-evidence-manifest: --require-complete failed — required evidence missing:');
  for (const missing of missingFiles) {
    console.error(`  ${missing}`);
  }
  process.exit(1);
}
