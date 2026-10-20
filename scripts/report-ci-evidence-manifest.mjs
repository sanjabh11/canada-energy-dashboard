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
 *   - sha256 + byte size for every evidence file matching:
 *       playwright-report*\/index.html   (phase0 / phase6 / wedge / default dirs)
 *       playwright-results-*.json
 *       coverage/lcov.info
 *
 * Usage: node scripts/report-ci-evidence-manifest.mjs
 * Exits non-zero if git identity or the tree fingerprint cannot be computed;
 * missing evidence files are simply absent from the manifest (they may not
 * exist when an earlier Playwright step failed).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  'GITHUB_WORKFLOW',
  'GITHUB_JOB',
];
const ciEnv = {};
for (const name of CI_ENV_VARS) {
  if (process.env[name]) {
    ciEnv[name] = process.env[name];
  }
}
const ci = Object.keys(ciEnv).length > 0 ? ciEnv : null;

// Evidence file set: playwright-report*/index.html, playwright-results-*.json,
// coverage/lcov.info — whatever exists at run time.
const targets = new Set();
for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.startsWith('playwright-report')) {
    const indexHtml = `${entry.name}/index.html`;
    if (existsSync(path.join(repoRoot, indexHtml))) {
      targets.add(indexHtml);
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
  file_count: files.length,
  files,
};

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`ci-evidence-manifest: wrote ${outputPath}`);
console.log(`ci-evidence-manifest: hashed ${files.length} evidence file(s)`);
