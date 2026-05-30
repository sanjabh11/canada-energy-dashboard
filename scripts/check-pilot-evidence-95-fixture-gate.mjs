#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const validatorPath = path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs');
const fixturePath = 'tests/fixtures/pilot-evidence/valid-95-evidence-register.csv';

function runValidator(args, env = process.env) {
  return spawnSync(process.execPath, [validatorPath, fixturePath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env,
  });
}

function combinedOutput(result) {
  return `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
}

function assertFailedWith(result, expectedText, label) {
  const output = combinedOutput(result);
  if (result.status === 0 || !output.includes(expectedText)) {
    console.error(`Pilot evidence fixture gate check failed: ${label}`);
    console.error(output);
    process.exit(1);
  }
}

function assertPassed(result, label) {
  if (result.status !== 0) {
    console.error(`Pilot evidence fixture gate check failed: ${label}`);
    console.error(combinedOutput(result));
    process.exit(1);
  }
}

assertFailedWith(
  runValidator(['--require-95']),
  '95% confidence gate cannot be satisfied by fixture, template, or sample registers',
  'fixtures must not satisfy --require-95 by default',
);

assertFailedWith(
  runValidator(['--require-95', '--allow-fixture-95'], {
    ...process.env,
    CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '',
  }),
  '--allow-fixture-95 is test-only and requires CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1',
  'fixture override must require the explicit test-only environment gate',
);

assertPassed(
  runValidator(['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'], {
    ...process.env,
    CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '1',
  }),
  'explicit fixture override should remain available for tests',
);

console.log('Pilot evidence fixture 95% gate check passed.');
