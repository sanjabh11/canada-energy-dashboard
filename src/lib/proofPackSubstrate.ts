/**
 * B17 – Proof-Pack Substrate Connector
 *
 * Attaches scenario/provenance contracts (B01–B02) to any ProofPackBundle,
 * enabling deterministic traceability from proof artifacts back to the
 * scenario hash and connector lineage that produced them.
 *
 * Design principles:
 * - Additive only: never mutates the original bundle; returns a new object
 * - Fail-safe: if substrate is missing, `attachSubstrateToProofPack` still
 *   returns a valid bundle (isFallback: true + warning in provenanceChain)
 * - Immutable-on-failure: `validateSubstrateAttachment` throws on missing
 *   scenarioRef for production claim packs (non-fallback, non-sandbox)
 *
 * References:
 * - B01 ScenarioRun / hashScenario contracts (src/lib/validators/scenarios.ts)
 * - B02 DataProvenanceMeta (src/lib/foundation.ts)
 * - OEB Appendix 2-AB / AUC Rule 005 evidence chain requirements
 */

import type { ProofPackBundle, ProofArtifactDefinition } from './proofPack';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioRef {
  /** Deterministic scenario hash from hashScenario() in B01 validators */
  id: string;
  /** SHA-256 hex of the scenario assumptions (stable across runs) */
  hash: string;
  /** ISO timestamp of the scenario run that produced this artifact */
  runAt?: string;
}

export interface ProvenanceChainEntry {
  /** Connector ID (e.g. 'statcan', 'cer', 'aeso') or substrate step label */
  source: string;
  /** Trust tier from B02 DataProvenanceMeta */
  trustTier: 'official_historical' | 'official_projection' | 'proxy' | 'simulated' | 'demo' | 'stale';
  /** ISO timestamp when this source was fetched or validated */
  fetchedAt: string;
  /** Optional SHA-256 of source response for tamper detection */
  contentHash?: string;
}

export interface SubstrateAttachment {
  scenarioRef: ScenarioRef;
  provenanceChain: ProvenanceChainEntry[];
  attachedAt: string;
  substratVersion: '1.0';
}

/** ProofPackBundle extended with substrate traceability */
export interface SubstrateBoundProofPack extends ProofPackBundle {
  _substrate: SubstrateAttachment;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attaches a scenario reference and provenance chain to a ProofPackBundle.
 * Returns a new `SubstrateBoundProofPack`; the original bundle is not mutated.
 *
 * If `scenarioRef` is omitted, the pack is still returned but artifacts are
 * stamped with `verificationStatus: 'sandbox_only'` and a warning is appended
 * to the provenance chain.
 */
export function attachSubstrateToProofPack(
  pack: ProofPackBundle,
  scenarioRef: ScenarioRef | null,
  provenanceChain: ProvenanceChainEntry[],
): SubstrateBoundProofPack {
  const attachedAt = new Date().toISOString();

  const resolvedChain: ProvenanceChainEntry[] = scenarioRef
    ? provenanceChain
    : [
        ...provenanceChain,
        {
          source: 'substrate-warning',
          trustTier: 'demo',
          fetchedAt: attachedAt,
          contentHash: undefined,
        },
      ];

  const resolvedRef: ScenarioRef = scenarioRef ?? {
    id: 'unattached',
    hash: '0000000000000000000000000000000000000000000000000000000000000000',
    runAt: attachedAt,
  };

  // Stamp each artifact with the substrate scenario ID in sourceManifestId
  const stampedArtifacts: ProofArtifactDefinition[] = pack.artifacts.map((artifact) => ({
    ...artifact,
    sourceManifestId: scenarioRef
      ? `scenario:${resolvedRef.id}:${resolvedRef.hash.slice(0, 16)}@${artifact.sourceManifestId}`
      : `unattached:${artifact.sourceManifestId}`,
    verificationStatus: scenarioRef
      ? artifact.verificationStatus
      : ('sandbox_only' as const),
  }));

  return {
    ...pack,
    artifacts: stampedArtifacts,
    _substrate: {
      scenarioRef: resolvedRef,
      provenanceChain: resolvedChain,
      attachedAt,
      substratVersion: '1.0',
    },
  };
}

/**
 * Validates that a ProofPackBundle has a substrate attachment with a real
 * scenario reference.
 *
 * Throws for non-sandbox production claim packs missing a scenarioRef.
 * Safe to call before outbound export or filing-prep delivery.
 */
export function validateSubstrateAttachment(pack: ProofPackBundle): asserts pack is SubstrateBoundProofPack {
  const substrate = (pack as Partial<SubstrateBoundProofPack>)._substrate;

  if (!substrate) {
    throw new Error(
      '[ProofPackSubstrate] Pack has no _substrate attachment. ' +
      'Call attachSubstrateToProofPack() before delivering production claim packs.',
    );
  }

  if (substrate.scenarioRef.id === 'unattached') {
    // Check if any artifact is a non-sandbox claim
    const hasProductionClaim = pack.artifacts.some(
      (a) => a.verificationStatus !== 'sandbox_only' && !a.isFallback,
    );
    if (hasProductionClaim) {
      throw new Error(
        '[ProofPackSubstrate] Pack contains non-fallback artifacts but scenarioRef is unattached. ' +
        'Attach a real ScenarioRef before outbound delivery.',
      );
    }
  }

  if (!substrate.provenanceChain || substrate.provenanceChain.length === 0) {
    throw new Error(
      '[ProofPackSubstrate] Provenance chain is empty. ' +
      'At least one ProvenanceChainEntry is required for evidence traceability.',
    );
  }
}

/**
 * Returns true if the pack has a valid substrate with a non-dummy scenarioRef.
 * Use as a conditional guard instead of the throwing `validateSubstrateAttachment`.
 */
export function hasValidSubstrate(pack: ProofPackBundle): pack is SubstrateBoundProofPack {
  try {
    validateSubstrateAttachment(pack);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds a minimal provenance chain from a connector freshness report entry.
 * Convenience factory for attaching substrate from B05 connector results.
 */
export function buildConnectorProvenanceChain(connectorEntries: Array<{
  connectorId: string;
  trustTier: ProvenanceChainEntry['trustTier'];
  lastFetchedAt: string;
  responseHash?: string;
}>): ProvenanceChainEntry[] {
  return connectorEntries.map((entry) => ({
    source: entry.connectorId,
    trustTier: entry.trustTier,
    fetchedAt: entry.lastFetchedAt,
    contentHash: entry.responseHash,
  }));
}

/**
 * Serialise the substrate attachment to a human-readable markdown block
 * for inclusion in evidence pack manifests and regulatory review notes.
 */
export function substrateToMarkdown(substrate: SubstrateAttachment): string {
  const lines = [
    '## Scenario Substrate Traceability',
    '',
    `- **Substrate version:** ${substrate.substratVersion}`,
    `- **Attached at:** ${substrate.attachedAt}`,
    `- **Scenario ID:** ${substrate.scenarioRef.id}`,
    `- **Scenario hash:** \`${substrate.scenarioRef.hash}\``,
    substrate.scenarioRef.runAt ? `- **Run at:** ${substrate.scenarioRef.runAt}` : null,
    '',
    '### Provenance chain',
    ...substrate.provenanceChain.map(
      (entry, i) =>
        `${i + 1}. **${entry.source}** — trust tier: ${entry.trustTier}, fetched: ${entry.fetchedAt}` +
        (entry.contentHash ? `, hash: \`${entry.contentHash.slice(0, 16)}…\`` : ''),
    ),
  ].filter((line) => line !== null);

  return lines.join('\n');
}
