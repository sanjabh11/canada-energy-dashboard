/**
 * Unit tests for B13 – Export Pipeline
 */
import { describe, it, expect } from 'vitest';
import {
  exportMetricsCSV,
  exportAssumptionsCSV,
  exportTimeSeriesCSV,
  exportJSON,
  exportMarkdown,
  exportBundle,
  defaultExportMeta,
} from '../../src/lib/exportPipeline.ts';
import type { ScenarioExportPayload } from '../../src/lib/exportPipeline.ts';

function makePayload(overrides: Partial<ScenarioExportPayload> = {}): ScenarioExportPayload {
  return {
    scenarioId: 'scenario-2026-ref',
    scenarioName: 'Reference 2026',
    meta: defaultExportMeta('Canada Energy Futures – Reference Scenario'),
    assumptions: [
      { parameter: 'carbon_price_cad_t', label: 'Carbon Price', value: 65, unit: 'CAD/tCO2e', category: 'policy' },
      { parameter: 'gas_price_cad_gj', label: 'Natural Gas Price', value: 4.5, unit: 'CAD/GJ', category: 'price' },
    ],
    metrics: [
      { metric: 'ghg_mt', label: 'GHG Emissions', unit: 'Mt CO2e', value: 450, period: 2030 },
      { metric: 'capacity_gw', label: 'Total Capacity', unit: 'GW', value: 180, p5: 160, p50: 180, p95: 210, period: 2030 },
    ],
    timeSeries: [
      { period: 2025, ghg_mt: 480, capacity_gw: 150 },
      { period: 2030, ghg_mt: 450, capacity_gw: 180 },
      { period: 2035, ghg_mt: 380, capacity_gw: 220 },
    ],
    ...overrides,
  };
}

// ── defaultExportMeta ───────────────────────────────────────────────────────

describe('defaultExportMeta', () => {
  it('sets title correctly', () => {
    const meta = defaultExportMeta('My Report');
    expect(meta.title).toBe('My Report');
  });

  it('includes OGL-Canada licence', () => {
    const meta = defaultExportMeta('x');
    expect(meta.licence).toContain('OGL');
  });

  it('generatedAt is a valid ISO string', () => {
    const meta = defaultExportMeta('x');
    expect(() => new Date(meta.generatedAt).toISOString()).not.toThrow();
  });
});

// ── exportMetricsCSV ────────────────────────────────────────────────────────

describe('exportMetricsCSV', () => {
  it('includes header row', () => {
    const csv = exportMetricsCSV(makePayload());
    expect(csv).toContain('metric,label,unit,period,value');
  });

  it('contains metric data', () => {
    const csv = exportMetricsCSV(makePayload());
    expect(csv).toContain('ghg_mt');
    expect(csv).toContain('450');
  });

  it('includes P5/P50/P95 when provided', () => {
    const csv = exportMetricsCSV(makePayload());
    expect(csv).toContain('160'); // p5 for capacity_gw
    expect(csv).toContain('210'); // p95
  });

  it('includes scenario name in footer', () => {
    const csv = exportMetricsCSV(makePayload());
    expect(csv).toContain('Reference 2026');
  });

  it('uses CRLF line endings (RFC 4180)', () => {
    const csv = exportMetricsCSV(makePayload());
    expect(csv).toContain('\r\n');
  });

  it('escapes commas in field values', () => {
    const payload = makePayload();
    payload.metrics[0].label = 'GHG, Total';
    const csv = exportMetricsCSV(payload);
    expect(csv).toContain('"GHG, Total"');
  });
});

// ── exportAssumptionsCSV ────────────────────────────────────────────────────

describe('exportAssumptionsCSV', () => {
  it('includes header and assumption rows', () => {
    const csv = exportAssumptionsCSV(makePayload());
    expect(csv).toContain('parameter,label,value');
    expect(csv).toContain('carbon_price_cad_t');
    expect(csv).toContain('65');
  });
});

// ── exportTimeSeriesCSV ─────────────────────────────────────────────────────

describe('exportTimeSeriesCSV', () => {
  it('includes period column', () => {
    const csv = exportTimeSeriesCSV(makePayload());
    expect(csv).toContain('period');
    expect(csv).toContain('2025');
  });

  it('returns empty-data message when no timeSeries', () => {
    const csv = exportTimeSeriesCSV(makePayload({ timeSeries: [] }));
    expect(csv).toContain('No time-series data');
  });
});

// ── exportJSON ──────────────────────────────────────────────────────────────

describe('exportJSON', () => {
  it('returns valid JSON', () => {
    const json = exportJSON(makePayload());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes schema field', () => {
    const parsed = JSON.parse(exportJSON(makePayload()));
    expect(parsed._schema).toContain('canada-energy-dashboard');
  });

  it('contains scenario id and metrics', () => {
    const parsed = JSON.parse(exportJSON(makePayload()));
    expect(parsed.scenario.id).toBe('scenario-2026-ref');
    expect(parsed.scenario.metrics).toHaveLength(2);
  });

  it('timeSeries is empty array when not provided', () => {
    const parsed = JSON.parse(exportJSON(makePayload({ timeSeries: undefined })));
    expect(parsed.scenario.timeSeries).toEqual([]);
  });
});

// ── exportMarkdown ──────────────────────────────────────────────────────────

describe('exportMarkdown', () => {
  it('starts with H1 title', () => {
    const md = exportMarkdown(makePayload());
    expect(md.startsWith('# Canada Energy Futures')).toBe(true);
  });

  it('contains assumptions table', () => {
    const md = exportMarkdown(makePayload());
    expect(md).toContain('## Assumption Pack');
    expect(md).toContain('Carbon Price');
    expect(md).toContain('65');
  });

  it('contains metrics table with P5/P50/P95 when available', () => {
    const md = exportMarkdown(makePayload());
    expect(md).toContain('P5');
    expect(md).toContain('160'); // p5 for capacity_gw
  });

  it('contains time series section (first 5 rows)', () => {
    const md = exportMarkdown(makePayload());
    expect(md).toContain('## Time Series');
    expect(md).toContain('2025');
  });

  it('includes licence in footer', () => {
    const md = exportMarkdown(makePayload());
    expect(md).toContain('Open Government Licence');
  });
});

// ── exportBundle ────────────────────────────────────────────────────────────

describe('exportBundle', () => {
  it('produces at least 4 files', () => {
    const bundle = exportBundle(makePayload());
    expect(Object.keys(bundle.files).length).toBeGreaterThanOrEqual(4);
  });

  it('includes CSV, JSON, and MD files', () => {
    const bundle = exportBundle(makePayload());
    const exts = Object.keys(bundle.files).map((f) => f.split('.').pop());
    expect(exts).toContain('csv');
    expect(exts).toContain('json');
    expect(exts).toContain('md');
  });

  it('includes timeSeries CSV when timeSeries present', () => {
    const bundle = exportBundle(makePayload());
    expect(Object.keys(bundle.files).some((f) => f.includes('timeseries'))).toBe(true);
  });

  it('totalBytes is sum of all file sizes', () => {
    const bundle = exportBundle(makePayload());
    const computed = Object.values(bundle.files).reduce((s, f) => s + f.length, 0);
    expect(bundle.totalBytes).toBe(computed);
  });

  it('filenames contain scenario slug and date', () => {
    const bundle = exportBundle(makePayload());
    const names = Object.keys(bundle.files);
    const today = new Date().toISOString().slice(0, 10);
    expect(names.every((n) => n.includes(today))).toBe(true);
    expect(names.every((n) => n.includes('scenario_2026_ref'))).toBe(true);
  });
});
