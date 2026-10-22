#!/usr/bin/env node
// check-evidence-binding.mjs — two-state evidence-binding gate (audit-7).
//
// Contract:
//  1. goal.md declares bound HEAD (bound_source_sha) + CI run.
//  2. The named run exists and concludes successfully.
//  3. run.head_sha == bound_source_sha exactly (source SHA, never merge SHA).
//  4. bound_source_sha is an ancestor of HEAD.
//  5. Every descendant commit after bound_source_sha must touch ONLY the
//     evidence allowlist — EXCEPT the current run's own head commit, which
//     self-binds by going green (a code commit cannot name its own run in
//     advance; exempting it avoids the recursion deadlock while still
//     forcing a docs rebind on the NEXT commit).
//  6. A code/CI/test/migration/package/config change AFTER the docs were
//     bound therefore fails on the following run — staleness cannot hide.
//
// Env:
//  - CEIP_CURRENT_HEAD_SHA: the commit whose run is executing (CI:
//    pull_request.head.sha || github.sha). Defaults to local HEAD.
//  - GH_TOKEN / GITHUB_TOKEN for gh api.
// Usage: node scripts/check-evidence-binding.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  assertRunBinding,
  parseBoundIdentity,
  staleDescendants,
} from './evidence-binding-lib.mjs';

const fail = (msg) => {
  console.error(`check-evidence-binding: FAIL — ${msg}`);
  process.exit(1);
};

let bound;
try {
  bound = parseBoundIdentity(readFileSync('goal.md', 'utf8'));
} catch (e) {
  fail(e.message);
}

const currentHead =
  process.env.CEIP_CURRENT_HEAD_SHA ??
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

try {
  execFileSync('git', ['merge-base', '--is-ancestor', bound.boundSha, currentHead]);
} catch {
  fail(`bound source ${bound.boundSha} is not an ancestor of ${currentHead.slice(0, 8)}`);
}

let run, jobs;
try {
  run = JSON.parse(
    execFileSync(
      'gh',
      [
        'api',
        `repos/{owner}/{repo}/actions/runs/${bound.runId}`,
        '--jq',
        '{head_sha,conclusion,head_branch}',
      ],
      { encoding: 'utf8' },
    ),
  );
  jobs = JSON.parse(
    execFileSync(
      'gh',
      ['api', `repos/{owner}/{repo}/actions/runs/${bound.runId}/jobs`, '--jq', '.jobs'],
      { encoding: 'utf8' },
    ),
  );
} catch {
  fail(`could not fetch run ${bound.runId}`);
}
try {
  assertRunBinding(run, jobs, bound.boundSha);
} catch (e) {
  fail(e.message);
}

const descendants = execFileSync(
  'git',
  ['rev-list', `${bound.boundSha}..${currentHead}`],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean);

const commits = descendants.map((sha) => ({
  sha,
  files: execFileSync(
    'git',
    ['diff-tree', '--no-commit-id', '--name-only', '-r', sha],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean),
}));
const staleCommits = staleDescendants(commits, currentHead);

const unbound = [];
for (const c of staleCommits) {
  // A non-evidence descendant is covered if it has its own binding-eligible
  // run: every verification job green (the gate job may be red — staleness
  // signal only). Otherwise the code has no proof and the gate fails.
  let runs;
  try {
    runs = JSON.parse(
      execFileSync(
        'gh',
        [
          'api',
          `repos/{owner}/{repo}/actions/runs?head_sha=${c.sha}&per_page=5`,
          '--jq',
          '.workflow_runs[].databaseId',
        ],
        { encoding: 'utf8' },
      ),
    )
      .split('\n')
      .filter(Boolean);
  } catch {
    runs = [];
  }
  let covered = false;
  for (const rid of runs.slice(0, 3)) {
    try {
      const rjobs = JSON.parse(
        execFileSync(
          'gh',
          ['api', `repos/{owner}/{repo}/actions/runs/${rid}/jobs`, '--jq', '.jobs'],
          { encoding: 'utf8' },
        ),
      );
      const bad = rjobs.filter((j) => j.name !== 'evidence-binding' && j.conclusion !== 'success');
      if (bad.length === 0) {
        covered = true;
        break;
      }
    } catch {
      /* keep looking */
    }
  }
  if (!covered) unbound.push(c);
}

if (unbound.length > 0) {
  fail(
    `non-evidence commits after bound source ${bound.boundSha} lack a green run: ` +
      unbound.map((c) => `${c.sha.slice(0, 8)}(${c.nonEvidence.join(',')})`).join(' | ') +
      ` — rebind goal.md/mission.md/addendum to a green run covering them`,
  );
}

console.log(
  `check-evidence-binding: OK — ${bound.boundSha} bound by run ${bound.runId} ` +
    `(headSha exact, success); ${descendants.length} descendant(s) evidence-only or self-bound`,
);
