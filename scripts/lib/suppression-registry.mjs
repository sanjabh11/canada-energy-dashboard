import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  SUPPRESSION_REGISTRY_CANONICAL_PATH,
  SUPPRESSION_REGISTRY_COLUMNS,
  SUPPRESSION_REGISTRY_ENV_VAR,
  SUPPRESSION_REGISTRY_LIVE_COLUMNS,
  SUPPRESSION_REASONS,
  parseCsv,
} from './outreach-response-log-schema.mjs';

export const SUPPRESSION_REGISTRY_SCHEMAS = Object.freeze({
  legacy: 'legacy-target-label',
  live: 'live-identity',
});

const SUPPRESSION_HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isValidIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeSuppressionDate(value) {
  const text = String(value ?? '').trim();
  if (isValidIsoDate(text)) return text;
  // Accept ISO datetimes (suppressed_at may carry a time component).
  if (text.length > 10 && isValidIsoDate(text.slice(0, 10))) return text.slice(0, 10);
  return null;
}

export function displayPath(repoRoot, filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

/**
 * Resolve the suppression registry path. Resolution order:
 *   1. explicit --suppression-file argument
 *   2. CEIP_SUPPRESSION_REGISTRY environment variable
 *   3. the canonical shared registry docs/growth/SUPPRESSION_REGISTRY_LIVE.csv
 * There is deliberately no campaign-local fallback: an opt-out recorded for one
 * campaign must apply to every campaign in the workspace.
 */
export function resolveSuppressionRegistryPath(repoRoot, explicitPath) {
  const envPath = String(process.env[SUPPRESSION_REGISTRY_ENV_VAR] ?? '').trim();
  const candidate = explicitPath || envPath || SUPPRESSION_REGISTRY_CANONICAL_PATH;
  return path.resolve(repoRoot, candidate);
}

export function suppressionRegistryRequiredMessage(repoRoot, filePath) {
  return `suppression registry required: ${displayPath(repoRoot, filePath)} is absent or unreadable. `
    + `Provide --suppression-file or set ${SUPPRESSION_REGISTRY_ENV_VAR} to the canonical shared registry `
    + `(default ${SUPPRESSION_REGISTRY_CANONICAL_PATH}); there is no campaign-local fallback.`;
}

function detectSchema(headers) {
  const headerSet = new Set(headers);
  const matches = (columns) => columns.length === headerSet.size && columns.every((column) => headerSet.has(column));
  if (matches(SUPPRESSION_REGISTRY_LIVE_COLUMNS)) return SUPPRESSION_REGISTRY_SCHEMAS.live;
  if (matches(SUPPRESSION_REGISTRY_COLUMNS)) return SUPPRESSION_REGISTRY_SCHEMAS.legacy;
  return null;
}

/**
 * Load and validate a suppression registry. Fail closed: a missing, unreadable,
 * or unknown-schema registry returns failures instead of an empty suppression
 * set, so callers must surface the errors and refuse outbound activity.
 *
 * Returns {
 *   ok, schema, path, headers,
 *   failures: string[],
 *   suppressionDatesByTarget: Map<string, string>, // normalized identity -> earliest YYYY-MM-DD
 *   isSuppressed(targetLabel), suppressionDateFor(targetLabel),
 * }
 */
export function loadSuppressionRegistry(repoRoot, filePath) {
  const failures = [];
  const suppressionDatesByTarget = new Map();
  const result = {
    ok: false,
    schema: null,
    path: filePath,
    headers: [],
    failures,
    suppressionDatesByTarget,
    isSuppressed: (targetLabel) => suppressionDatesByTarget.has(normalizeKey(targetLabel)),
    suppressionDateFor: (targetLabel) => suppressionDatesByTarget.get(normalizeKey(targetLabel)) ?? null,
  };

  if (!filePath || !existsSync(filePath)) {
    failures.push(suppressionRegistryRequiredMessage(repoRoot, filePath ?? ''));
    return result;
  }

  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    failures.push(suppressionRegistryRequiredMessage(repoRoot, filePath));
    return result;
  }

  const rows = parseCsv(text).filter((cells) => !String(cells[0] ?? '').trim().startsWith('#'));
  const headers = (rows[0] ?? []).map(normalizeHeader).filter(Boolean);
  result.headers = headers;

  const schema = detectSchema(headers);
  if (!schema) {
    failures.push(
      `suppression registry ${displayPath(repoRoot, filePath)} has an unrecognized header. Expected exactly `
      + `[${SUPPRESSION_REGISTRY_LIVE_COLUMNS.join(',')}] (canonical live schema) or `
      + `[${SUPPRESSION_REGISTRY_COLUMNS.join(',')}] (legacy target_label schema); unknown headers are rejected.`,
    );
    return result;
  }
  result.schema = schema;

  rows.slice(1).forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const record = Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()]));

    let identity = '';
    let rawDate = '';
    if (schema === SUPPRESSION_REGISTRY_SCHEMAS.live) {
      identity = record.email ?? '';
      rawDate = record.suppressed_at ?? '';
      if (!identity && !(record.domain ?? '')) {
        failures.push(`Suppression registry row ${rowNumber}: email or domain is required in the live schema.`);
      }
      if (identity && identity.includes('@') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identity)) {
        failures.push(`Suppression registry row ${rowNumber}: email must be an address or an anonymized target_label handle.`);
      }
      if (!identity && record.domain) {
        // Domain-wide suppression is enforced by the sending surface outside
        // repo tooling; repo logs cannot match a domain to an anonymized
        // handle, so the row is recorded but not keyed.
      }
      if (rawDate && !normalizeSuppressionDate(rawDate)) {
        failures.push(`Suppression registry row ${rowNumber}: suppressed_at must be a valid YYYY-MM-DD date or ISO datetime.`);
      }
      if (!(record.reason ?? '').trim()) {
        failures.push(`Suppression registry row ${rowNumber}: reason is required.`);
      }
    } else {
      identity = record.target_label ?? '';
      rawDate = record.suppression_date ?? '';
      if (!SUPPRESSION_HANDLE_PATTERN.test(identity)) {
        failures.push(`Suppression registry row ${rowNumber}: target_label must be an anonymized handle.`);
      }
      if (!isValidIsoDate(rawDate)) {
        failures.push(`Suppression registry row ${rowNumber}: suppression_date must be a valid YYYY-MM-DD date.`);
      }
      if (!SUPPRESSION_REASONS.has(normalizeKey(record.reason))) {
        failures.push(`Suppression registry row ${rowNumber}: reason must be one of ${Array.from(SUPPRESSION_REASONS).join(', ')}.`);
      }
    }

    // A suppressed identity with no parseable date is treated as suppressed
    // from the earliest possible date — never silently un-suppress.
    const suppressionDate = normalizeSuppressionDate(rawDate) ?? '0000-01-01';
    const key = normalizeKey(identity);
    if (key) {
      const previous = suppressionDatesByTarget.get(key);
      if (!previous || suppressionDate < previous) suppressionDatesByTarget.set(key, suppressionDate);
    }
  });

  result.ok = failures.length === 0;
  return result;
}

/**
 * Build a CSV cell list matching the registry's own schema so an opt-out can be
 * appended in whichever schema the loaded registry uses. The anonymized
 * target_label handle is stored in the live schema's `email` identity column —
 * repo tooling never learns real addresses.
 */
export function buildSuppressionRegistryRow(schema, { targetLabel, suppressionDate, sourceRow, reason }) {
  const values = {
    target_label: targetLabel,
    email: targetLabel,
    domain: '',
    suppression_date: suppressionDate,
    suppressed_at: suppressionDate,
    source_row: String(sourceRow),
    source: `outreach-response-log row ${sourceRow}`,
    reason,
    suppressed_by: 'ceip-outreach-appender',
  };
  const columns = schema === SUPPRESSION_REGISTRY_SCHEMAS.live
    ? SUPPRESSION_REGISTRY_LIVE_COLUMNS
    : SUPPRESSION_REGISTRY_COLUMNS;
  return columns.map((column) => values[column] ?? '');
}
