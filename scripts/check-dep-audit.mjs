#!/usr/bin/env node
/**
 * Dependency audit gate with documented exceptions.
 *
 * `pnpm audit` has no allowlist support, so this wrapper runs the audit and
 * fails on every advisory at moderate+ severity EXCEPT entries documented in
 * docs/security/DEPENDENCY_EXCEPTIONS.md and listed in KNOWN_EXCEPTIONS with
 * an unexpired expiry date.
 *
 * Exit 0 = clean OR only documented unexpired exceptions.
 * Exit 1 = any undocumented/expired advisory at moderate+ severity.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Must mirror docs/security/DEPENDENCY_EXCEPTIONS.md exactly.
const KNOWN_EXCEPTIONS = [
  {
    module: 'braces',
    advisoryId: 'GHSA-vfj7-8cjw-p6xm',
    exceptionId: 'EXC-2026-001',
    expires: '2027-01-05',
  },
];

const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'];

function severityAtOrAbove(level) {
  return SEVERITY_ORDER.indexOf(level) >= SEVERITY_ORDER.indexOf('moderate');
}

function auditAdvisoryId(advisory) {
  const url = advisory.url || '';
  const match = url.match(/GHSA-[a-z0-9-]+/i);
  return match ? match[0] : advisory.cve || '';
}

function main() {
  let raw;
  try {
    raw = execFileSync('pnpm', ['audit', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    // pnpm audit exits non-zero when advisories exist — that's the data we want.
    raw = error.stdout?.toString() ?? '';
    if (!raw.trim()) {
      console.error(`check-dep-audit: pnpm audit failed without output: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const report = JSON.parse(raw);
  const advisories = Object.values(report.advisories ?? {});
  const today = new Date().toISOString().slice(0, 10);

  const failing = [];
  const excepted = [];

  for (const advisory of advisories) {
    if (!severityAtOrAbove(advisory.severity)) continue;
    const advisoryId = auditAdvisoryId(advisory);
    const exception = KNOWN_EXCEPTIONS.find(
      (entry) =>
        entry.module === advisory.module_name &&
        entry.advisoryId.toLowerCase() === advisoryId.toLowerCase(),
    );

    if (exception) {
      if (exception.expires >= today) {
        excepted.push({ ...exception, severity: advisory.severity, findings: advisory.findings?.length });
        continue;
      }
      failing.push({
        module: advisory.module_name,
        advisoryId,
        severity: advisory.severity,
        reason: `exception ${exception.exceptionId} expired ${exception.expires}`,
      });
      continue;
    }

    failing.push({
      module: advisory.module_name,
      advisoryId,
      severity: advisory.severity,
      reason: 'undocumented advisory',
    });
  }

  for (const entry of excepted) {
    console.log(
      `check-dep-audit: EXCEPTED ${entry.module} ${entry.severity} (${entry.exceptionId}, expires ${entry.expires})`,
    );
  }

  if (failing.length > 0) {
    console.error('check-dep-audit: FAILED advisories:');
    for (const item of failing) {
      console.error(`  ${item.severity.toUpperCase()} ${item.module} ${item.advisoryId} — ${item.reason}`);
    }
    process.exitCode = 1;
    return;
  }

  const totals = report.metadata?.vulnerabilities ?? {};
  console.log(
    `check-dep-audit: passed (${totals.critical ?? 0} critical, ${totals.high ?? 0} high, ` +
      `${totals.moderate ?? 0} moderate — ${excepted.length} documented exception(s))`,
  );
}

main();
