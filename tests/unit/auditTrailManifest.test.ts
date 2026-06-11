import { describe, it, expect } from 'vitest';
import {
  buildAuditManifest,
  buildAuditManifestAsync,
  validateDIPManifest,
  safeParseDIPManifest,
  manifestToJson,
  addManifestToFileMap,
  djb2Hash,
  MANIFEST_SCHEMA_VERSION,
  type BuildManifestInput,
  type ConnectorLineageRef,
} from '../../src/lib/auditTrailManifest';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CHAIN: ConnectorLineageRef[] = [
  { connectorId: 'statcan', trustTier: 'official_historical', fetchedAt: '2026-06-10T12:00:00Z', contentHash: 'deadbeef' },
  { connectorId: 'cer', trustTier: 'official_projection', fetchedAt: '2026-06-10T12:05:00Z' },
];

const BASE_INPUT: BuildManifestInput = {
  files: {
    'scenario_metrics_2026-06-11.csv': 'metric,value\nco2,500\n',
    'scenario_report_2026-06-11.md': '# Report\nHello',
    'scenario_2026-06-11.json': '{"id":"test"}',
  },
  scenarioId: 'scen-abc123',
  scenarioHash: 'a'.repeat(64),
  scenarioRunId: 'run-xyz',
  provenanceChain: CHAIN,
  connectorLineageRefs: CHAIN,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('djb2Hash', () => {
  it('returns a string prefixed with djb2:', () => {
    expect(djb2Hash('hello')).toMatch(/^djb2:[0-9a-f]{8}$/);
  });

  it('is deterministic (same input → same output)', () => {
    expect(djb2Hash('canada energy')).toBe(djb2Hash('canada energy'));
  });

  it('produces different hashes for different inputs', () => {
    expect(djb2Hash('aaa')).not.toBe(djb2Hash('bbb'));
  });
});

describe('buildAuditManifest (sync)', () => {
  it('returns a manifest with correct schema_version', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(m.schema_version).toBe(MANIFEST_SCHEMA_VERSION);
  });

  it('counts total_files correctly', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(m.total_files).toBe(3);
  });

  it('total_bytes > 0', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(m.total_bytes).toBeGreaterThan(0);
  });

  it('file_hashes contain all filenames', () => {
    const m = buildAuditManifest(BASE_INPUT);
    const names = m.file_hashes.map(f => f.filename);
    expect(names).toContain('scenario_metrics_2026-06-11.csv');
    expect(names).toContain('scenario_report_2026-06-11.md');
    expect(names).toContain('scenario_2026-06-11.json');
  });

  it('all file_hashes use djb2 algorithm (sync path)', () => {
    const m = buildAuditManifest(BASE_INPUT);
    m.file_hashes.forEach(f => {
      expect(f.algorithm).toBe('djb2');
      expect(f.hash).toMatch(/^djb2:/);
    });
  });

  it('hash is stable across two builds (deterministic)', () => {
    const m1 = buildAuditManifest(BASE_INPUT);
    const m2 = buildAuditManifest(BASE_INPUT);
    m1.file_hashes.forEach((fh, i) => {
      expect(fh.hash).toBe(m2.file_hashes[i].hash);
    });
  });

  it('includes provenance_chain entries', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(m.provenance_chain).toHaveLength(2);
    expect(m.provenance_chain[0].connectorId).toBe('statcan');
  });

  it('includes OGL-C licence', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(m.licence).toContain('Open Government Licence');
  });

  it('handles empty files map without throwing', () => {
    const m = buildAuditManifest({ ...BASE_INPUT, files: {} });
    expect(m.total_files).toBe(0);
    expect(m.total_bytes).toBe(0);
  });
});

describe('buildAuditManifestAsync', () => {
  it('returns a valid manifest with sha-256 or djb2 algorithm', async () => {
    const m = await buildAuditManifestAsync(BASE_INPUT);
    expect(['sha-256', 'djb2']).toContain(m.file_hashes[0].algorithm);
  });

  it('total_files matches sync version', async () => {
    const m = await buildAuditManifestAsync(BASE_INPUT);
    expect(m.total_files).toBe(3);
  });
});

describe('validateDIPManifest', () => {
  it('passes for a valid sync-built manifest', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(() => validateDIPManifest(m)).not.toThrow();
  });

  it('throws ZodError for an object missing required fields', () => {
    expect(() => validateDIPManifest({ schema_version: '1.0' })).toThrow();
  });

  it('throws for wrong schema_version', () => {
    const m = buildAuditManifest(BASE_INPUT);
    expect(() => validateDIPManifest({ ...m, schema_version: '2.0' })).toThrow();
  });
});

describe('safeParseDIPManifest', () => {
  it('returns success: true for valid manifest', () => {
    const m = buildAuditManifest(BASE_INPUT);
    const result = safeParseDIPManifest(m);
    expect(result.success).toBe(true);
  });

  it('returns success: false for invalid manifest', () => {
    const result = safeParseDIPManifest({ broken: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });
});

describe('addManifestToFileMap', () => {
  it('adds MANIFEST.json to the file map', () => {
    const m = buildAuditManifest(BASE_INPUT);
    const map = addManifestToFileMap({ 'report.md': '# hi' }, m);
    expect(map['MANIFEST.json']).toBeTruthy();
    const parsed = JSON.parse(map['MANIFEST.json']);
    expect(parsed.schema_version).toBe('1.0');
  });

  it('places MANIFEST.json first in the object', () => {
    const m = buildAuditManifest(BASE_INPUT);
    const map = addManifestToFileMap({ 'report.md': '# hi' }, m);
    expect(Object.keys(map)[0]).toBe('MANIFEST.json');
  });

  it('preserves original files', () => {
    const m = buildAuditManifest(BASE_INPUT);
    const map = addManifestToFileMap({ 'report.md': '# hi' }, m);
    expect(map['report.md']).toBe('# hi');
  });
});

describe('manifestToJson', () => {
  it('produces valid JSON', () => {
    const m = buildAuditManifest(BASE_INPUT);
    const json = manifestToJson(m);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
