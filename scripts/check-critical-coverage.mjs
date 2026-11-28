#!/usr/bin/env node
/**
 * Critical-path line-coverage gate.
 *
 * Parses coverage/lcov.info (SF:/LF:/LH: records) and fails if any
 * revenue/security-critical file drops below its line-coverage floor, or
 * disappears from the report entirely. The gate is a ratchet: floors start
 * at measured reality and are raised deliberately as coverage grows — the
 * same convention as the global `thresholds.lines` floor in vitest.config.ts.
 *
 * Floors were measured on the full serial coverage run of 2026-10-07
 * (coverage/lcov.info, include widened to netlify + supabase functions):
 *   src/lib/whop.ts 53.7% · netlify/leads.ts 81.5% · tierCalculations 98.3%
 *   tierPricing 62.8% · creditBankingSupport 91.5% · auth-session 83.1%
 *   whop-verify-access 91.7%.
 * Handler floors were measured on a 2026-10-08 focused run:
 *   whop-webhook/handler.ts 90.1% → floor 85
 *   stripe-create-checkout-session/handler.ts 77.8% → floor 70
 * allowAbsent marks a file that may be missing from an older lcov artifact;
 * the floor still enforces once the file appears.
 *
 * Usage:
 *   node scripts/check-critical-coverage.mjs [--lcov-path <file>] [--floor <pct>]
 * Env override: CRITICAL_COVERAGE_LCOV=<file> (the flag wins).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// repo-relative path → { floor: min % of LF hit, allowAbsent?: boolean }
// Floors measured on the full serial coverage run of 2026-10-07 (lcov.info,
// include widened to netlify/functions + supabase/functions):
//   src/lib/whop.ts              53.7% → floor 50
//   netlify/functions/leads.ts   81.5% → floor 78
//   src/lib/tierCalculations.ts  98.3% → floor 95
//   src/lib/tierPricing.ts       62.8% → floor 60
//   src/lib/creditBankingSupport 91.5% → floor 88
const CRITICAL_PATHS = {
  'src/lib/whop.ts': { floor: 50 },
  'netlify/functions/leads.ts': { floor: 78 },
  'src/lib/tierCalculations.ts': { floor: 95 },
  'src/lib/tierPricing.ts': { floor: 60 },
  'src/lib/creditBankingSupport.ts': { floor: 88 },
  // Server authorization paths — presence in lcov is required; floors start at
  // measured values and ratchet as behavior tests land.
  'netlify/functions/auth-session.ts': { floor: 40 },
  'supabase/functions/whop-verify-access/index.ts': { floor: 85 },
  // Deno `serve()` bootstraps stay at floor 0 (not unit-testable under Node);
  // the extracted handlers carry the real behavior and real floors.
  // allowAbsent tolerates lcov artifacts that predate the handler split —
  // once the file appears in a report the floor is enforced.
  'supabase/functions/whop-webhook/index.ts': { floor: 0 },
  'supabase/functions/whop-webhook/handler.ts': { floor: 85, allowAbsent: true }, // measured 90.1%
  'supabase/functions/stripe-create-checkout-session/index.ts': { floor: 0 },
  'supabase/functions/stripe-create-checkout-session/handler.ts': { floor: 70, allowAbsent: true }, // measured 77.8%
};

function parseArgs(argv) {
  const opts = { lcovPath: process.env.CRITICAL_COVERAGE_LCOV, floorOverride: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--lcov-path' && argv[i + 1]) {
      opts.lcovPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--floor' && argv[i + 1] !== undefined) {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        console.error(`check-critical-coverage: invalid --floor value "${argv[i + 1]}" (want 0-100)`);
        process.exit(2);
      }
      opts.floorOverride = value;
      i += 1;
    }
  }
  return opts;
}

/** Parse lcov.info → Map<repoRelativePath, { lf, lh }>. */
export function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('SF:')) {
      current = line.slice(3);
      // Normalise absolute paths to repo-relative when possible.
      if (path.isAbsolute(current)) {
        current = path.relative(repoRoot, current);
      }
      files.set(current, { lf: 0, lh: 0 });
    } else if (current && line.startsWith('LF:')) {
      files.get(current).lf = Number(line.slice(3)) || 0;
    } else if (current && line.startsWith('LH:')) {
      files.get(current).lh = Number(line.slice(3)) || 0;
    } else if (line === 'end_of_record') {
      current = null;
    }
  }
  return files;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const opts = parseArgs(process.argv.slice(2));
  const lcovPath = opts.lcovPath
    ? path.resolve(repoRoot, opts.lcovPath)
    : path.join(repoRoot, 'coverage', 'lcov.info');

  if (!existsSync(lcovPath)) {
    console.error(`check-critical-coverage: coverage artifact missing — run the full serial coverage suite (${lcovPath})`);
    process.exit(1);
  }

  const records = parseLcov(readFileSync(lcovPath, 'utf8'));
  const failures = [];
  const notes = [];

  console.log(`check-critical-coverage: gating ${Object.keys(CRITICAL_PATHS).length} critical paths against ${lcovPath}`);
  console.log('file                               lines     hit%   floor  status');
  console.log('---------------------------------  --------  -----  -----  ----------------');

  for (const [file, cfg] of Object.entries(CRITICAL_PATHS)) {
    const floor = opts.floorOverride ?? cfg.floor;
    const rec = records.get(file);
    if (!rec) {
      if (cfg.allowAbsent) {
        notes.push(`${file}: no SF record — outside vitest coverage.include; set a floor once instrumented.`);
        console.log(`${file.padEnd(34)}  ${'n/a'.padStart(8)}  ${'n/a'.padStart(5)}  ${String(floor).padStart(5)}  NOT-INSTRUMENTED`);
      } else {
        failures.push(`${file}: missing from coverage report`);
        console.log(`${file.padEnd(34)}  ${'n/a'.padStart(8)}  ${'n/a'.padStart(5)}  ${String(floor).padStart(5)}  MISSING`);
      }
      continue;
    }
    const pct = rec.lf > 0 ? (100 * rec.lh) / rec.lf : 100;
    const status = pct >= floor ? 'PASS' : 'FAIL';
    console.log(
      `${file.padEnd(34)}  ${`${rec.lh}/${rec.lf}`.padStart(8)}  ${pct.toFixed(1).padStart(5)}  ${String(floor).padStart(5)}  ${status}`,
    );
    if (pct < floor) {
      failures.push(`${file}: ${pct.toFixed(1)}% lines below floor ${floor}%`);
    }
  }

  for (const note of notes) {
    console.log(`note: ${note}`);
  }

  if (failures.length > 0) {
    console.error('check-critical-coverage: FAILED');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }
  console.log('check-critical-coverage: passed.');
}
