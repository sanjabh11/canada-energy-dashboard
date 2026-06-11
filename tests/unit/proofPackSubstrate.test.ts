import { describe, it, expect, vi } from 'vitest';
import {
  attachSubstrateToProofPack,
  validateSubstrateAttachment,
  hasValidSubstrate,
  buildConnectorProvenanceChain,
  substrateToMarkdown,
  type ScenarioRef,
  type ProvenanceChainEntry,
} from '../../src/lib/proofPackSubstrate';
import type { ProofPackBundle } from '../../src/lib/proofPack';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_PACK: ProofPackBundle = {
  title: 'Test Pack',
  summary: 'A test proof pack',
  artifacts: [
    {
      id: 'art-1',
      label: 'Test Artifact',
      format: 'csv',
      filename: 'test.csv',
      audience: 'analyst',
      generatedAt: '2026-06-11T00:00:00Z',
      jurisdiction: 'Alberta',
      sourceSummary: 'sample data',
      assumptions: ['assumption A'],
      claimLabel: 'advisory',
      isFallback: false,
      freshnessState: 'live',
      sourceManifestId: 'auc-rule005-v1',
      verificationStatus: 'needs_buyer_data',
      doNotClaim: ['regulator submission'],
      boundedClaimsDisclaimer: 'Filing prep only.',
    },
  ],
};

const SCENARIO_REF: ScenarioRef = {
  id: 'scen-abc123',
  hash: 'a'.repeat(64),
  runAt: '2026-06-11T06:00:00Z',
};

const CHAIN: ProvenanceChainEntry[] = [
  { source: 'statcan', trustTier: 'official_historical', fetchedAt: '2026-06-10T12:00:00Z', contentHash: 'deadbeef' },
  { source: 'cer', trustTier: 'official_projection', fetchedAt: '2026-06-10T12:05:00Z' },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('attachSubstrateToProofPack', () => {
  it('returns a new object (original pack not mutated)', () => {
    const result = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    expect(result).not.toBe(MOCK_PACK);
    expect(result.artifacts[0]).not.toBe(MOCK_PACK.artifacts[0]);
  });

  it('attaches _substrate with scenarioRef + provenanceChain', () => {
    const result = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    expect(result._substrate.scenarioRef.id).toBe('scen-abc123');
    expect(result._substrate.scenarioRef.hash).toBe('a'.repeat(64));
    expect(result._substrate.provenanceChain).toHaveLength(2);
    expect(result._substrate.substratVersion).toBe('1.0');
  });

  it('stamps artifact sourceManifestId with scenario prefix', () => {
    const result = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    expect(result.artifacts[0].sourceManifestId).toMatch(/^scenario:scen-abc123:/);
    expect(result.artifacts[0].sourceManifestId).toContain('auc-rule005-v1');
  });

  it('handles null scenarioRef gracefully (fallback mode)', () => {
    const result = attachSubstrateToProofPack(MOCK_PACK, null, CHAIN);
    expect(result._substrate.scenarioRef.id).toBe('unattached');
    expect(result.artifacts[0].verificationStatus).toBe('sandbox_only');
    expect(result._substrate.provenanceChain.some(e => e.source === 'substrate-warning')).toBe(true);
  });

  it('preserves non-attachment fields from original pack', () => {
    const result = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    expect(result.title).toBe('Test Pack');
    expect(result.summary).toBe('A test proof pack');
  });

  it('stamps attachedAt as a valid ISO timestamp', () => {
    const before = Date.now();
    const result = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    const after = Date.now();
    const ts = new Date(result._substrate.attachedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('validateSubstrateAttachment', () => {
  it('passes validation on a properly attached pack', () => {
    const attached = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    expect(() => validateSubstrateAttachment(attached)).not.toThrow();
  });

  it('throws if pack has no _substrate', () => {
    expect(() => validateSubstrateAttachment(MOCK_PACK)).toThrow('[ProofPackSubstrate] Pack has no _substrate attachment');
  });

  it('throws if pack has production artifacts but unattached scenarioRef', () => {
    const nullAttached = attachSubstrateToProofPack(MOCK_PACK, null, CHAIN);
    // Force verificationStatus back to a non-sandbox value to simulate regression
    const manipulated = {
      ...nullAttached,
      artifacts: nullAttached.artifacts.map(a => ({ ...a, verificationStatus: 'needs_buyer_data' as const, isFallback: false })),
    };
    expect(() => validateSubstrateAttachment(manipulated)).toThrow('unattached');
  });

  it('throws if provenanceChain is empty', () => {
    const attached = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    const broken = { ...attached, _substrate: { ...attached._substrate, provenanceChain: [] } };
    expect(() => validateSubstrateAttachment(broken)).toThrow('Provenance chain is empty');
  });
});

describe('hasValidSubstrate', () => {
  it('returns true for a properly attached pack', () => {
    const attached = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    expect(hasValidSubstrate(attached)).toBe(true);
  });

  it('returns false for a plain pack with no _substrate', () => {
    expect(hasValidSubstrate(MOCK_PACK)).toBe(false);
  });
});

describe('buildConnectorProvenanceChain', () => {
  it('converts connector entries to ProvenanceChainEntry array', () => {
    const chain = buildConnectorProvenanceChain([
      { connectorId: 'statcan', trustTier: 'official_historical', lastFetchedAt: '2026-06-10T00:00:00Z', responseHash: 'abc' },
      { connectorId: 'cer', trustTier: 'official_projection', lastFetchedAt: '2026-06-10T01:00:00Z' },
    ]);
    expect(chain).toHaveLength(2);
    expect(chain[0].source).toBe('statcan');
    expect(chain[0].trustTier).toBe('official_historical');
    expect(chain[0].contentHash).toBe('abc');
    expect(chain[1].contentHash).toBeUndefined();
  });
});

describe('substrateToMarkdown', () => {
  it('produces a non-empty markdown string with scenario hash', () => {
    const attached = attachSubstrateToProofPack(MOCK_PACK, SCENARIO_REF, CHAIN);
    const md = substrateToMarkdown(attached._substrate);
    expect(md).toContain('## Scenario Substrate Traceability');
    expect(md).toContain('scen-abc123');
    expect(md).toContain('aaaaaaaaaaaaaaaa');
    expect(md).toContain('statcan');
    expect(md).toContain('official_historical');
  });
});
