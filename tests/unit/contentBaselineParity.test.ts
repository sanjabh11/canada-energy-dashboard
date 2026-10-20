import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * G19 baseline parity: the domain-module split must be a pure structural
 * refactor of the HEAD monoliths — same keys, byte-identical serialized
 * content. Forward-drift is guarded by the SHA-256 pins in
 * contentParity.test.ts; THIS test guards the migration itself against
 * `git show HEAD:` versions.
 *
 * If HEAD ever becomes a post-split commit, `git show HEAD:<file>` returns
 * the barrel (no content) — the test fails loudly telling the maintainer to
 * re-baseline rather than silently passing.
 */

const BASELINE_REF = process.env.CONTENT_BASELINE_REF ?? 'HEAD';
// Pinned at the last pre-split commit so the check stays meaningful after a
// post-split commit lands. Update ONLY when intentionally re-baselining.
const PINNED_REF = '2cdc44b6d85158865a167ec3b07f16b43677a119';

const stableSerialize = (value: unknown): string =>
  JSON.stringify(value, (_key, val) => (typeof val === 'function' ? `[fn ${val.name}]` : val));

async function importBaselineTs(file: string, dir: string) {
  const ts = execFileSync('git', ['show', `${PINNED_REF}:${file}`], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const tsPath = path.join(dir, file.replace(/\//g, '_'));
  writeFileSync(tsPath, ts, 'utf8');
  const { transform } = await import('esbuild');
  const mjsPath = tsPath.replace(/\.ts$/, '.mjs');
  writeFileSync(mjsPath, (await transform(ts, { loader: 'ts' })).code, 'utf8');
  return import(mjsPath);
}

function diffRecords<T extends Record<string, unknown>>(head: T, cur: T) {
  const headKeys = Object.keys(head).sort();
  const curKeys = Object.keys(cur).sort();
  return {
    added: curKeys.filter((k) => !(k in head)),
    removed: headKeys.filter((k) => !(k in cur)),
    changed: headKeys.filter((k) => k in cur && stableSerialize(head[k]) !== stableSerialize(cur[k])),
  };
}

describe('G19: split modules are content-identical to the HEAD monolith', () => {
  it('helpContent: identical keys and serialized content vs baseline', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ceip-baseline-'));
    try {
      const baseline = await importBaselineTs('src/lib/helpContent.ts', dir);
      const current = await import('../../src/lib/helpContent.ts');
      expect(baseline.HELP_CONTENT_DATABASE, 'baseline is a barrel — re-pin PINNED_REF').toBeDefined();
      const diff = diffRecords(baseline.HELP_CONTENT_DATABASE, current.HELP_CONTENT_DATABASE);
      expect(diff.added).toEqual([]);
      expect(diff.removed).toEqual([]);
      expect(diff.changed).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('moduleContent: identical keys and serialized content vs baseline', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ceip-baseline-'));
    try {
      const baseline = await importBaselineTs('src/lib/moduleContent.ts', dir);
      const current = await import('../../src/lib/moduleContent.ts');
      expect(baseline.ALL_MODULES, 'baseline is a barrel — re-pin PINNED_REF').toBeDefined();
      const diff = diffRecords(baseline.ALL_MODULES, current.ALL_MODULES);
      expect(diff.added).toEqual([]);
      expect(diff.removed).toEqual([]);
      expect(diff.changed).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
