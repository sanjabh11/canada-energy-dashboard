import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const tempRoots: string[] = [];

const REQUIRED_REPORT_DIRS = [
  'playwright-report-phase0',
  'playwright-report-phase6',
  'playwright-report-wedge',
  'playwright-report-a11y',
];
const REQUIRED_RESULT_FILES = [
  'playwright-results-phase0.json',
  'playwright-results-phase6.json',
  'playwright-results-wedge.json',
  'playwright-results-a11y.json',
];

interface EvidenceManifest {
  complete: boolean;
  missing_files: string[];
  required_files: string[];
  file_count: number;
  jobs: unknown;
  files: Array<{ path: string; sha256: string; bytes: number }>;
}

// The script derives its repo root from its own location (import.meta.url),
// so the fixture is a synthetic mini-repo: the script + tree-fingerprint.mjs
// copied under scripts/, a git commit for HEAD/porcelain identity, and stub
// evidence files.
function makeFixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-ci-evidence-'));
  tempRoots.push(root);
  mkdirSync(path.join(root, 'scripts'), { recursive: true });
  for (const script of ['report-ci-evidence-manifest.mjs', 'tree-fingerprint.mjs']) {
    copyFileSync(path.join(repoRoot, 'scripts', script), path.join(root, 'scripts', script));
  }
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync(
    'git',
    ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'add', '.'],
    { cwd: root },
  );
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.test',
      'commit',
      '--quiet',
      '-m',
      'synthetic ci evidence fixture',
    ],
    { cwd: root },
  );
  return root;
}

function writeFixture(root: string, relativePath: string, content: string) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function writeAllRequiredEvidence(root: string, omit: string[] = []) {
  for (const dir of REQUIRED_REPORT_DIRS) {
    if (!omit.includes(dir)) {
      writeFixture(root, `${dir}/index.html`, `<html><body>${dir}</body></html>\n`);
    }
  }
  for (const file of REQUIRED_RESULT_FILES) {
    if (!omit.includes(file)) {
      writeFixture(root, file, `${JSON.stringify({ suite: file })}\n`);
    }
  }
  if (!omit.includes('coverage/lcov.info')) {
    writeFixture(root, 'coverage/lcov.info', 'TN:\nSF:src/app.ts\nend_of_record\n');
  }
}

function runManifest(root: string, args: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/report-ci-evidence-manifest.mjs'), ...args],
    { cwd: root, encoding: 'utf8' },
  );
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function readManifest(root: string): EvidenceManifest {
  return JSON.parse(readFileSync(path.join(root, 'ci-evidence-manifest.json'), 'utf8')) as EvidenceManifest;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('ci evidence manifest', () => {
  it('records complete:true and exits 0 with --require-complete when all required evidence exists', () => {
    const root = makeFixtureRoot();
    writeAllRequiredEvidence(root);

    const record = runManifest(root);
    expect(record.status).toBe(0);

    const manifest = readManifest(root);
    expect(manifest.complete).toBe(true);
    expect(manifest.missing_files).toEqual([]);
    expect(manifest.jobs).toBe('not-recorded');
    expect(manifest.required_files).toEqual(
      expect.arrayContaining([
        'playwright-report-phase0/index.html',
        'playwright-report-phase6/index.html',
        'playwright-report-wedge/index.html',
        'playwright-report-a11y/index.html',
        'playwright-results-phase0.json',
        'playwright-results-phase6.json',
        'playwright-results-wedge.json',
        'playwright-results-a11y.json',
        'coverage/lcov.info',
        'ci-evidence-manifest.json',
        'ci-evidence-manifest.json.sha256',
      ]),
    );

    const gate = runManifest(root, ['--require-complete']);
    expect(gate.status).toBe(0);
  });

  it('records complete:false with missing_files, and --require-complete exits non-zero', () => {
    const root = makeFixtureRoot();
    writeAllRequiredEvidence(root, ['playwright-results-wedge.json']);

    // Record-only default still succeeds — diagnostics must not be blocked.
    const record = runManifest(root);
    expect(record.status).toBe(0);

    const manifest = readManifest(root);
    expect(manifest.complete).toBe(false);
    expect(manifest.missing_files).toEqual(['playwright-results-wedge.json']);
    expect(manifest.required_files).toContain('playwright-results-wedge.json');

    const gate = runManifest(root, ['--require-complete']);
    expect(gate.status).not.toBe(0);
    expect(gate.stderr).toContain('playwright-results-wedge.json');
  });

  it('writes a .sha256 sidecar matching the manifest bytes', () => {
    const root = makeFixtureRoot();
    writeAllRequiredEvidence(root);

    const record = runManifest(root);
    expect(record.status).toBe(0);

    const manifestPath = path.join(root, 'ci-evidence-manifest.json');
    const sidecarPath = `${manifestPath}.sha256`;
    expect(existsSync(sidecarPath)).toBe(true);

    const manifestSha256 = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
    expect(readFileSync(sidecarPath, 'utf8')).toBe(`${manifestSha256}  ci-evidence-manifest.json\n`);
  });
});
