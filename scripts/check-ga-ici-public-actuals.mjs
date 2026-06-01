#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const actualsRelativePath = 'public/data/ga_ici_5cp_public_historical_actuals.csv';
const actualsPath = path.join(repoRoot, actualsRelativePath);
const failures = [];

const requiredColumns = [
  'base_period_start',
  'base_period_end',
  'rank',
  'timestamp',
  'date',
  'hour_ending_est',
  'ontario_demand_mw',
  'status',
  'source_url',
  'retrieved_via',
  'retrieved_at',
  'metric',
  'claim_boundary',
];

const directIdentifierColumns = new Set([
  'customer_name',
  'customer_email',
  'email',
  'phone',
  'phone_number',
  'account_number',
  'meter_identifier',
  'meter_id',
  'service_address',
  'address',
  'postal_code',
  'secret',
  'token',
  'password',
]);

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function normalizeColumn(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoTimestamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

if (!existsSync(actualsPath)) {
  failures.push(`${actualsRelativePath} is missing.`);
} else {
  const rows = parseCsvRows(readFileSync(actualsPath, 'utf8'));
  const headers = rows[0]?.map(normalizeColumn) ?? [];
  const dataRows = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
  const headerSet = new Set(headers);

  for (const column of requiredColumns) {
    if (!headerSet.has(column)) failures.push(`Missing required column: ${column}`);
  }

  for (const column of headers) {
    if (directIdentifierColumns.has(column)) {
      failures.push(`Direct identifier column must not be present: ${column}`);
    }
  }

  if (dataRows.length < 15) {
    failures.push(`Expected at least 15 public historical actual rows; found ${dataRows.length}.`);
  }

  const rowsByBasePeriod = new Map();
  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const baseKey = `${row.base_period_start}:${row.base_period_end}`;
    const rank = Number(row.rank);
    const demand = Number(row.ontario_demand_mw);
    const hourEnding = Number(row.hour_ending_est);
    const sourceUrl = row.source_url ?? '';
    const claimBoundary = row.claim_boundary ?? '';

    if (!isIsoDate(row.base_period_start ?? '')) failures.push(`Row ${rowNumber} has invalid base_period_start.`);
    if (!isIsoDate(row.base_period_end ?? '')) failures.push(`Row ${rowNumber} has invalid base_period_end.`);
    if (!Number.isInteger(rank) || rank < 1 || rank > 5) failures.push(`Row ${rowNumber} rank must be an integer from 1 to 5.`);
    if (!isIsoTimestamp(row.timestamp ?? '')) failures.push(`Row ${rowNumber} has invalid timestamp.`);
    if (!isIsoDate(row.date ?? '')) failures.push(`Row ${rowNumber} has invalid date.`);
    if (!Number.isInteger(hourEnding) || hourEnding < 1 || hourEnding > 24) {
      failures.push(`Row ${rowNumber} hour_ending_est must be an integer from 1 to 24.`);
    }
    if (!Number.isFinite(demand) || demand <= 0) failures.push(`Row ${rowNumber} has invalid ontario_demand_mw.`);
    if ((row.status ?? '').toLowerCase() !== 'final') failures.push(`Row ${rowNumber} status must be final.`);
    if (!sourceUrl.startsWith('https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_')) {
      failures.push(`Row ${rowNumber} source_url must point to the official IESO ICIPeakTracker report directory.`);
    }
    if (!/ICI Ontario Demand MW/i.test(row.metric ?? '')) failures.push(`Row ${rowNumber} metric must identify ICI Ontario Demand MW.`);
    if (!/not buyer-specific accuracy/i.test(claimBoundary) || !/settlement/i.test(claimBoundary) || !/savings/i.test(claimBoundary)) {
      failures.push(`Row ${rowNumber} claim_boundary must keep buyer accuracy, settlement, and savings claims out of scope.`);
    }

    if (!rowsByBasePeriod.has(baseKey)) rowsByBasePeriod.set(baseKey, []);
    rowsByBasePeriod.get(baseKey).push(row);
  });

  if (rowsByBasePeriod.size < 3) {
    failures.push(`Expected at least 3 distinct public base periods; found ${rowsByBasePeriod.size}.`);
  }

  for (const [baseKey, rowsForPeriod] of rowsByBasePeriod.entries()) {
    if (rowsForPeriod.length !== 5) {
      failures.push(`Base period ${baseKey} must contain exactly 5 final top-five rows; found ${rowsForPeriod.length}.`);
    }
    const rankSet = new Set(rowsForPeriod.map((row) => Number(row.rank)));
    for (const rank of [1, 2, 3, 4, 5]) {
      if (!rankSet.has(rank)) failures.push(`Base period ${baseKey} is missing rank ${rank}.`);
    }
  }
}

if (failures.length > 0) {
  console.error('GA/ICI public historical actuals check failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`GA/ICI public historical actuals check passed for ${actualsRelativePath}.`);
