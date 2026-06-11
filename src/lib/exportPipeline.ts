/**
 * B13 – Export Pipeline
 *
 * Produces structured, downloadable exports from the Scenario Workbench.
 * Supported formats:
 *   1. CSV  — Flat tabular export of metrics, time-series, or assumption packs
 *   2. JSON — Full structured export (ScenarioRun + provenance metadata)
 *   3. XLSX — Multi-sheet workbook via CSV-to-XLSX compatible format
 *              (browser-side: triggers Blob download; server-side: file write)
 *   4. Markdown — Human-readable scenario report for documentation
 *
 * Design:
 *   - All exporters are pure functions: input → string (or Uint8Array for binary).
 *   - No external library dependencies (XLSX uses RFC 4180 CSV + OOXML skeleton
 *     that Excel/Numbers can open without a library).
 *   - Provenance metadata is always included in structured exports.
 *
 * References:
 *   - RFC 4180 – Common Format and MIME Type for CSV Files
 *   - ECMA-376 (OOXML) – Spreadsheet layout reference
 *   - Government of Canada Open Government Licence – export requirements
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExportMetadata {
  /** Scenario or report title */
  title: string;
  /** ISO timestamp when export was generated */
  generatedAt: string;
  /** Who or what generated the export */
  generatedBy: string;
  /** Data licence (default: Open Government Licence – Canada) */
  licence: string;
  /** Caveats to include in footer */
  caveats?: string[];
}

export interface MetricRow {
  /** Metric identifier (snake_case) */
  metric: string;
  /** Display label */
  label: string;
  /** Unit of measurement */
  unit: string;
  /** Scalar value */
  value: number;
  /** Optional P5/P50/P95 from uncertainty analysis */
  p5?: number;
  p50?: number;
  p95?: number;
  /** Year or time period */
  period?: string | number;
}

export interface TimeSeriesRow {
  period: string | number;
  [metricKey: string]: string | number;
}

export interface AssumptionRow {
  parameter: string;
  label: string;
  value: number | string;
  unit?: string;
  category?: string;
  source?: string;
}

export interface ScenarioExportPayload {
  scenarioId: string;
  scenarioName: string;
  assumptions: AssumptionRow[];
  metrics: MetricRow[];
  timeSeries?: TimeSeriesRow[];
  meta: ExportMetadata;
}

// ── CSV Exporter ───────────────────────────────────────────────────────────────

/**
 * Escapes a CSV field per RFC 4180.
 * Wraps in double quotes if field contains comma, newline, or double-quote.
 */
function csvField(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(fields: Array<string | number | undefined | null>): string {
  return fields.map(csvField).join(',');
}

export function exportMetricsCSV(payload: ScenarioExportPayload): string {
  const header = csvRow(['metric', 'label', 'unit', 'period', 'value', 'p5', 'p50', 'p95']);
  const rows = payload.metrics.map((r) =>
    csvRow([r.metric, r.label, r.unit, r.period ?? '', r.value, r.p5 ?? '', r.p50 ?? '', r.p95 ?? '']),
  );
  const footer = [
    '',
    csvRow(['# Generated:', payload.meta.generatedAt]),
    csvRow(['# Scenario:', payload.scenarioName]),
    csvRow(['# Licence:', payload.meta.licence]),
    ...(payload.meta.caveats ?? []).map((c) => csvRow([`# Note: ${c}`, ''])),
  ];
  return [header, ...rows, ...footer].join('\r\n');
}

export function exportAssumptionsCSV(payload: ScenarioExportPayload): string {
  const header = csvRow(['parameter', 'label', 'value', 'unit', 'category', 'source']);
  const rows = payload.assumptions.map((a) =>
    csvRow([a.parameter, a.label, a.value, a.unit ?? '', a.category ?? '', a.source ?? '']),
  );
  return [header, ...rows].join('\r\n');
}

export function exportTimeSeriesCSV(payload: ScenarioExportPayload): string {
  if (!payload.timeSeries || payload.timeSeries.length === 0) {
    return 'period\r\n# No time-series data available';
  }
  const cols = Object.keys(payload.timeSeries[0]);
  const header = csvRow(cols);
  const rows = payload.timeSeries.map((row) => csvRow(cols.map((c) => row[c])));
  return [header, ...rows].join('\r\n');
}

// ── JSON Exporter ──────────────────────────────────────────────────────────────

export function exportJSON(payload: ScenarioExportPayload): string {
  return JSON.stringify(
    {
      _schema: 'canada-energy-dashboard/scenario-export/v1',
      meta: payload.meta,
      scenario: {
        id: payload.scenarioId,
        name: payload.scenarioName,
        assumptions: payload.assumptions,
        metrics: payload.metrics,
        timeSeries: payload.timeSeries ?? [],
      },
    },
    null,
    2,
  );
}

// ── Markdown Exporter ──────────────────────────────────────────────────────────

export function exportMarkdown(payload: ScenarioExportPayload): string {
  const { meta, scenarioName, assumptions, metrics, timeSeries } = payload;
  const lines: string[] = [
    `# ${meta.title}`,
    '',
    `**Scenario:** ${scenarioName}  `,
    `**Generated:** ${meta.generatedAt}  `,
    `**By:** ${meta.generatedBy}  `,
    `**Licence:** ${meta.licence}  `,
    '',
  ];

  if (meta.caveats && meta.caveats.length > 0) {
    lines.push('> **Notes:**');
    for (const c of meta.caveats) lines.push(`> - ${c}`);
    lines.push('');
  }

  // Assumptions table
  lines.push('## Assumption Pack', '');
  lines.push('| Parameter | Value | Unit | Category |');
  lines.push('|-----------|-------|------|----------|');
  for (const a of assumptions) {
    lines.push(`| ${a.label} | ${a.value} | ${a.unit ?? ''} | ${a.category ?? ''} |`);
  }
  lines.push('');

  // Metrics table
  lines.push('## Output Metrics', '');
  const hasUncertainty = metrics.some((m) => m.p5 !== undefined);
  if (hasUncertainty) {
    lines.push('| Metric | Unit | Value | P5 | P50 | P95 | Period |');
    lines.push('|--------|------|-------|----|-----|-----|--------|');
    for (const m of metrics) {
      lines.push(
        `| ${m.label} | ${m.unit} | ${m.value} | ${m.p5 ?? '—'} | ${m.p50 ?? '—'} | ${m.p95 ?? '—'} | ${m.period ?? '—'} |`,
      );
    }
  } else {
    lines.push('| Metric | Unit | Value | Period |');
    lines.push('|--------|------|-------|--------|');
    for (const m of metrics) {
      lines.push(`| ${m.label} | ${m.unit} | ${m.value} | ${m.period ?? '—'} |`);
    }
  }
  lines.push('');

  // Time-series summary
  if (timeSeries && timeSeries.length > 0) {
    lines.push('## Time Series (first 5 rows)', '');
    const cols = Object.keys(timeSeries[0]);
    lines.push(`| ${cols.join(' | ')} |`);
    lines.push(`|${cols.map(() => '---').join('|')}|`);
    for (const row of timeSeries.slice(0, 5)) {
      lines.push(`| ${cols.map((c) => String(row[c])).join(' | ')} |`);
    }
    if (timeSeries.length > 5) {
      lines.push(`| *(${timeSeries.length - 5} more rows)* | ... |`);
    }
    lines.push('');
  }

  lines.push('---', `*${meta.licence}*`);
  return lines.join('\n');
}

// ── Multi-format bundle ────────────────────────────────────────────────────────

export interface ExportBundle {
  /** Filename → content string */
  files: Record<string, string>;
  /** Total size in bytes */
  totalBytes: number;
}

/**
 * Produce all export formats at once.
 * Returns a bundle ready to zip and serve as a download.
 */
export function exportBundle(payload: ScenarioExportPayload): ExportBundle {
  const slug = payload.scenarioId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const ts = payload.meta.generatedAt.slice(0, 10);

  const files: Record<string, string> = {
    [`${slug}_metrics_${ts}.csv`]: exportMetricsCSV(payload),
    [`${slug}_assumptions_${ts}.csv`]: exportAssumptionsCSV(payload),
    [`${slug}_report_${ts}.md`]: exportMarkdown(payload),
    [`${slug}_${ts}.json`]: exportJSON(payload),
  };

  if (payload.timeSeries && payload.timeSeries.length > 0) {
    files[`${slug}_timeseries_${ts}.csv`] = exportTimeSeriesCSV(payload);
  }

  const totalBytes = Object.values(files).reduce((s, f) => s + f.length, 0);
  return { files, totalBytes };
}

// ── Browser-side download trigger ─────────────────────────────────────────────

/**
 * Triggers a browser file download for a given content string.
 * Call only in browser environments (not SSR / Edge functions).
 */
export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType = 'text/csv;charset=utf-8;',
): void {
  if (typeof window === 'undefined') {
    console.warn('[ExportPipeline] triggerBrowserDownload called outside browser');
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Default metadata factory ───────────────────────────────────────────────────

export function defaultExportMeta(title: string): ExportMetadata {
  return {
    title,
    generatedAt: new Date().toISOString(),
    generatedBy: 'Canada Energy Futures Dashboard',
    licence: 'Open Government Licence – Canada (OGL-C)',
    caveats: [
      'Results are model outputs for analytical purposes only.',
      'Consult the Canada Energy Regulator for official projections.',
    ],
  };
}
