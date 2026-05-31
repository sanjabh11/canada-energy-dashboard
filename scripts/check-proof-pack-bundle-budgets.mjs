#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'dist', 'assets');

const kib = (bytes) => bytes / 1024;
const fmt = (value) => `${value.toFixed(2)} KiB`;

const routeBudgets = [
  { label: 'CommercialLandingPage', pattern: /^CommercialLandingPage-.*\.js$/, rawKiB: 90, gzipKiB: 15 },
  { label: 'UtilityDemandForecastPage', pattern: /^UtilityDemandForecastPage-.*\.js$/, rawKiB: 380, gzipKiB: 50 },
  { label: 'ForecastBenchmarkingPage', pattern: /^ForecastBenchmarkingPage-.*\.js$/, rawKiB: 110, gzipKiB: 15 },
  { label: 'RegulatoryFilingExport', pattern: /^RegulatoryFilingExport-.*\.js$/, rawKiB: 90, gzipKiB: 15 },
  { label: 'GaIciPeakPredictorPage', pattern: /^GaIciPeakPredictorPage-.*\.js$/, rawKiB: 60, gzipKiB: 12 },
  { label: 'ByoCsvProofPage', pattern: /^ByoCsvProofPage-.*\.js$/, rawKiB: 80, gzipKiB: 18 },
  { label: 'TIERROICalculator', pattern: /^TIERROICalculator-.*\.js$/, rawKiB: 110, gzipKiB: 20 },
  { label: 'CreditBankingDashboard', pattern: /^CreditBankingDashboard-.*\.js$/, rawKiB: 70, gzipKiB: 15 },
  { label: 'AssetHealthDashboard', pattern: /^AssetHealthDashboard-.*\.js$/, rawKiB: 140, gzipKiB: 22 },
  { label: 'ShadowBillingModule', pattern: /^ShadowBillingModule-.*\.js$/, rawKiB: 80, gzipKiB: 15 },
  { label: 'UtilitySecurityStatement', pattern: /^UtilitySecurityStatement-.*\.js$/, rawKiB: 50, gzipKiB: 10 },
  { label: 'OpenAPIDocsPage', pattern: /^OpenAPIDocsPage-.*\.js$/, rawKiB: 70, gzipKiB: 12 },
  { label: 'AIDataCentreDashboard', pattern: /^AIDataCentreDashboard-.*\.js$/, rawKiB: 280, gzipKiB: 35 },
];

const vendorWatchlist = [
  { label: 'vendor-redoc', pattern: /^vendor-redoc-.*\.js$/, rawKiB: 1_250, gzipKiB: 380 },
  { label: 'vendor-recharts', pattern: /^vendor-recharts-.*\.js$/, rawKiB: 540, gzipKiB: 145 },
  { label: 'vendor-export', pattern: /^vendor-export-.*\.js$/, rawKiB: 440, gzipKiB: 145 },
  { label: 'vendor-supabase', pattern: /^vendor-supabase-.*\.js$/, rawKiB: 260, gzipKiB: 75 },
];

if (!existsSync(assetsDir)) {
  console.error(`Missing ${assetsDir}. Run npm run build before npm run check:proof-pack-bundles.`);
  process.exit(1);
}

const files = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));

function measure(file) {
  const buffer = readFileSync(join(assetsDir, file));
  return {
    file,
    rawKiB: kib(buffer.length),
    gzipKiB: kib(gzipSync(buffer).length),
  };
}

function findMeasuredChunk(budget) {
  const file = files.find((candidate) => budget.pattern.test(candidate));
  return file ? measure(file) : null;
}

const failures = [];
const warnings = [];

console.log('Proof-pack route bundle budgets');
for (const budget of routeBudgets) {
  const measured = findMeasuredChunk(budget);
  if (!measured) {
    failures.push(`${budget.label}: missing chunk matching ${budget.pattern}`);
    console.log(`FAIL ${budget.label}: missing`);
    continue;
  }

  const rawOver = measured.rawKiB > budget.rawKiB;
  const gzipOver = measured.gzipKiB > budget.gzipKiB;
  const status = rawOver || gzipOver ? 'FAIL' : 'PASS';
  console.log(
    `${status} ${budget.label}: raw ${fmt(measured.rawKiB)} / ${fmt(budget.rawKiB)}, gzip ${fmt(
      measured.gzipKiB,
    )} / ${fmt(budget.gzipKiB)} (${measured.file})`,
  );

  if (rawOver) {
    failures.push(`${budget.label}: raw ${fmt(measured.rawKiB)} exceeds ${fmt(budget.rawKiB)}`);
  }
  if (gzipOver) {
    failures.push(`${budget.label}: gzip ${fmt(measured.gzipKiB)} exceeds ${fmt(budget.gzipKiB)}`);
  }
}

console.log('\nShared vendor watchlist');
for (const budget of vendorWatchlist) {
  const measured = findMeasuredChunk(budget);
  if (!measured) {
    warnings.push(`${budget.label}: missing chunk matching ${budget.pattern}`);
    console.log(`WARN ${budget.label}: missing`);
    continue;
  }

  const rawOver = measured.rawKiB > budget.rawKiB;
  const gzipOver = measured.gzipKiB > budget.gzipKiB;
  const status = rawOver || gzipOver ? 'WARN' : 'PASS';
  console.log(
    `${status} ${budget.label}: raw ${fmt(measured.rawKiB)} / ${fmt(budget.rawKiB)}, gzip ${fmt(
      measured.gzipKiB,
    )} / ${fmt(budget.gzipKiB)} (${measured.file})`,
  );

  if (rawOver) {
    warnings.push(`${budget.label}: raw ${fmt(measured.rawKiB)} exceeds ${fmt(budget.rawKiB)}`);
  }
  if (gzipOver) {
    warnings.push(`${budget.label}: gzip ${fmt(measured.gzipKiB)} exceeds ${fmt(budget.gzipKiB)}`);
  }
}

if (warnings.length > 0) {
  console.warn('\nWarnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (failures.length > 0) {
  console.error('\nFailures:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nAll proof-pack route bundle budgets passed.');
