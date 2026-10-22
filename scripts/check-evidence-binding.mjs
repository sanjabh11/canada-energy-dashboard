#!/usr/bin/env node
// check-evidence-binding.mjs — machine check that the documented bound
// identity agrees with Git + GitHub Actions reality. Fails when:
//  - the SHA named in goal.md's milestone block is not an ancestor of HEAD
//  - the named CI run's headSha does not equal that SHA
//  - the named run's conclusion is not "success"
// Usage: node scripts/check-evidence-binding.mjs
// Requires: gh CLI authenticated (read-only API calls).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const fail = (msg) => {
  console.error(`check-evidence-binding: FAIL — ${msg}`);
  process.exit(1);
};

const goal = readFileSync('goal.md', 'utf8');
const milestone = goal.match(/bound HEAD `([0-9a-f]{7,40})` — CI run\s*\n?>`?\s*`?(\d+)`?/s);
if (!milestone) fail('goal.md milestone block does not name a bound HEAD + CI run pair');
const [, boundSha, runId] = milestone;

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

try {
  execFileSync('git', ['merge-base', '--is-ancestor', boundSha, head]);
} catch {
  fail(`documented bound SHA ${boundSha} is not an ancestor of HEAD ${head.slice(0, 8)}`);
}

const runJson = execFileSync(
  'gh',
  ['api', `repos/{owner}/{repo}/actions/runs/${runId}`, '--jq', '{head_sha,conclusion,head_branch}'],
  { encoding: 'utf8' },
);
const run = JSON.parse(runJson);
if (run.head_sha.slice(0, boundSha.length) !== boundSha)
  fail(`run ${runId} headSha ${run.head_sha.slice(0, 8)} ≠ documented bound ${boundSha}`);
if (run.conclusion !== 'success')
  fail(`run ${runId} conclusion is ${run.conclusion}, not success`);

console.log(
  `check-evidence-binding: OK — doc ${boundSha} = run ${runId} headSha = ancestor of HEAD ${head.slice(0, 8)}; conclusion success`,
);
