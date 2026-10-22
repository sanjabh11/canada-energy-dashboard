import { describe, expect, it } from 'vitest';
import {
  assertEvidenceOnlyDiff,
  assertRunBinding,
  parseBoundIdentity,
  staleDescendants,
} from '../../scripts/evidence-binding-lib.mjs';

describe('evidence-binding gate — negative fixtures', () => {
  it('fails when a stale ancestor diff contains a code change', () => {
    expect(() =>
      assertEvidenceOnlyDiff(['goal.md', 'src/components/App.tsx']),
    ).toThrow(/src\/components\/App\.tsx/);
  });

  it('fails when a stale ancestor diff contains a CI workflow change', () => {
    expect(() =>
      assertEvidenceOnlyDiff(['goal.md', '.github/workflows/ci.yml']),
    ).toThrow(/ci\.yml/);
  });

  it('fails on tests, migrations, package files, security scripts and config', () => {
    for (const f of [
      'tests/unit/x.test.ts',
      'supabase/migrations/001.sql',
      'package.json',
      'pnpm-lock.yaml',
      'scripts/check-secret-scan.mjs',
      'vitest.config.ts',
      '.env.example',
    ]) {
      expect(() => assertEvidenceOnlyDiff(['goal.md', f]), f).toThrow();
    }
  });

  it('passes an evidence-only descendant', () => {
    expect(() =>
      assertEvidenceOnlyDiff([
        'goal.md',
        'mission.md',
        'docs/remediation/CEIP_AUDIT_ADDENDUM_2026-10-22.md',
        '.phase-loop/ceip-controlled-pilot-mission.jsonl',
        '.positioning-audit/artifacts/phase-1-evidence-reconnaissance.md',
      ]),
    ).not.toThrow();
  });

  it('fails a run/head mismatch', () => {
    expect(() =>
      assertRunBinding({ head_sha: 'aaaaaaa', conclusion: 'success' }, 'bbbbbbb'),
    ).toThrow(/headSha/);
  });

  it('fails a failed or missing run', () => {
    expect(() =>
      assertRunBinding({ head_sha: 'aaaaaaa', conclusion: 'failure' }, 'aaaaaaa'),
    ).toThrow(/failure/);
    expect(() => assertRunBinding(null, 'aaaaaaa')).toThrow(/not found/);
  });

  it('staleDescendants exempts only the current run head commit', () => {
    const code = { sha: 'aaa1111', files: ['src/App.tsx'] };
    const docs = { sha: 'bbb2222', files: ['goal.md'] };
    const head = { sha: 'ccc3333', files: ['.github/workflows/ci.yml'] };
    // code commit after bound source, not the run head → stale
    expect(staleDescendants([code, docs, head], 'ccc3333')).toHaveLength(1);
    expect(staleDescendants([code, docs, head], 'ccc3333')[0].sha).toBe('aaa1111');
    // only the run head changed code → nothing stale (it self-binds)
    expect(staleDescendants([docs, head], 'ccc3333')).toHaveLength(0);
    // evidence-only descendants → nothing stale
    expect(staleDescendants([docs], 'ccc3333')).toHaveLength(0);
    // prefix matching for short SHAs
    expect(staleDescendants([head], 'ccc3333aaaaa')).toHaveLength(0);
  });

  it('parses the milestone binding pair and rejects a missing one', () => {
    const parsed = parseBoundIdentity(
      '> **Milestone status:** bound HEAD `97e0d433` — CI run\n> `39748877686` green',
    );
    expect(parsed).toEqual({ boundSha: '97e0d433', runId: '39748877686' });
    expect(() => parseBoundIdentity('no binding here')).toThrow();
  });
});
