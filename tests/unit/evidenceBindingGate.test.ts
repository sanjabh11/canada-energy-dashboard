import { describe, expect, it } from 'vitest';
import {
  assertEvidenceOnlyDiff,
  assertRunBinding,
  diffTreeArgs,
  justifiedFiles,
  parseFileList,
  parseBoundIdentity,
  staleDescendants,
  workflowRunsFromPages,
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
        'docs/security/SECRET_EXPOSURE_INCIDENTS.md',
        'docs/staging/FOUR_TABLE_DECISIONS.md',
        'docs/staging/FUNCTION_DEPLOYMENT_MANIFEST.md',
        'docs/staging/MIGRATION_REPLAY_COMPARISON.md',
        'docs/staging/OWNER_SIGNOFF_MATRIX.md',
        'docs/staging/SUPABASE_OWNER_RUNBOOK.md',
        'docs/staging/STORAGE_RECEIPT_TEMPLATE.md',
        'docs/staging/WITHHELD_ROWS_RECONCILIATION_PACKET.md',
        '.phase-loop/ceip-controlled-pilot-mission.jsonl',
        '.positioning-audit/artifacts/phase-1-evidence-reconnaissance.md',
      ]),
    ).not.toThrow();
  });

  it('does not allow arbitrary staging or remediation documents to bypass binding', () => {
    for (const f of [
      'docs/staging/UNREVIEWED_NOTE.md',
      'docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md',
    ]) {
      expect(() => assertEvidenceOnlyDiff([f]), f).toThrow();
    }
  });

  it('uses parent-aware diff-tree arguments for merge commits', () => {
    expect(diffTreeArgs('abc123')).toEqual([
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      '-m',
      'abc123',
    ]);
    expect(parseFileList('src/a.ts\nsrc/a.ts\n\n')).toEqual(['src/a.ts']);
  });

  it('attributes aggregate paths to covered code descendants', () => {
    const commits = [
      { sha: 'covered', files: ['src/covered.ts'] },
      { sha: 'docs', files: ['goal.md'] },
      { sha: 'head', files: ['src/current.ts'] },
    ];
    expect(justifiedFiles(commits, new Set(['covered']), 'head')).toEqual(
      new Set(['src/covered.ts', 'goal.md', 'src/current.ts']),
    );
  });

  it('reads every paginated workflow-run page, including an empty page', () => {
    expect(
      workflowRunsFromPages([
        { workflow_runs: [{ database_id: 1, head_sha: 'a' }] },
        { workflow_runs: [] },
        { workflow_runs: [{ database_id: 2, head_sha: 'b' }] },
      ]),
    ).toHaveLength(2);
    expect(workflowRunsFromPages({ workflow_runs: [] })).toEqual([]);
  });

  it('fails a run/head mismatch', () => {
    expect(() =>
      assertRunBinding(
        { head_sha: 'aaaaaaa', conclusion: 'success' },
        [{ name: 'test', conclusion: 'success' }],
        'bbbbbbb',
      ),
    ).toThrow(/headSha/);
  });

  it('fails when any verification job is not green; tolerates a red gate job', () => {
    expect(() =>
      assertRunBinding(
        { head_sha: 'aaaaaaa', conclusion: 'failure' },
        [
          { name: 'test', conclusion: 'success' },
          { name: 'lint-typecheck', conclusion: 'success' },
          { name: 'evidence-binding', conclusion: 'failure' },
        ],
        'aaaaaaa',
      ),
    ).not.toThrow();
    expect(() =>
      assertRunBinding(
        { head_sha: 'aaaaaaa', conclusion: 'failure' },
        [
          { name: 'test', conclusion: 'failure' },
          { name: 'evidence-binding', conclusion: 'failure' },
        ],
        'aaaaaaa',
      ),
    ).toThrow(/test=failure/);
    expect(() => assertRunBinding(null, [], 'aaaaaaa')).toThrow(/not found/);
    expect(() =>
      assertRunBinding(
        { head_sha: 'aaaaaaa', conclusion: 'success' },
        [{ name: 'evidence-binding', conclusion: 'success' }],
        'aaaaaaa',
      ),
    ).toThrow(/no verification jobs/);
    expect(() =>
      assertRunBinding(
        { head_sha: 'aaaaaaa', conclusion: 'success' },
        [
          { name: 'lint-typecheck', conclusion: 'success' },
          { name: 'test', conclusion: 'success' },
          { name: 'build-and-smoke', conclusion: 'success' },
        ],
        'aaaaaaa',
        ['lint-typecheck', 'test', 'build-and-smoke'],
      ),
    ).not.toThrow();
    expect(() =>
      assertRunBinding(
        { head_sha: 'aaaaaaa', conclusion: 'success' },
        [{ name: 'test', conclusion: 'success' }],
        'aaaaaaa',
        ['lint-typecheck', 'test', 'build-and-smoke'],
      ),
    ).toThrow(/required verification jobs missing/);
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
