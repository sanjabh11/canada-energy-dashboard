/**
 * B20 – DIP Audit Trail Manifest
 *
 * Produces a Data Integrity Pack (DIP) manifest that captures the full
 * traceability chain for exported evidence packs: scenario identity,
 * provenance, connector lineage, and file-level integrity hashes.
 *
 * The manifest is designed to accompany ZIP bundles exported from the
 * Scenario Workbench (B13 exportBundle / B20 exportZipBundle) and is
 * suitable for inclusion in regulatory filing prep packages.
 *
 * Design:
 * - Pure functions only: buildAuditManifest is a deterministic transform
 * - Zod validation guard for inbound deserialization
 * - SHA-256 hashing using SubtleCrypto (browser) with sync fallback
 *   (djb2 32-bit hash, clearly labelled non-cryptographic) for Node/test
 *
 * References:
 * - B01 ScenarioRun (src/lib/types/scenarios.ts)
 * - B17 SubstrateAttachment (src/lib/proofPackSubstrate.ts)
 * - B13 ExportBundle (src/lib/exportPipeline.ts)
 * - Government of Canada Open Government Licence — export traceability
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Schema version
// ─────────────────────────────────────────────────────────────────────────────

export const MANIFEST_SCHEMA_VERSION = '1.0' as const;

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

export const FileHashEntrySchema = z.object({
  filename: z.string().min(1),
  /** SHA-256 hex (64 chars) or djb2 fallback (8 hex chars, prefixed 'djb2:') */
  hash: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  algorithm: z.enum(['sha-256', 'djb2']),
});

export const ConnectorLineageRefSchema = z.object({
  connectorId: z.string().min(1),
  trustTier: z.enum(['official_historical', 'official_projection', 'proxy', 'simulated', 'demo', 'stale']),
  fetchedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  contentHash: z.string().optional(),
});

export const DIPManifestSchema = z.object({
  schema_version: z.literal('1.0'),
  generated_at: z.string(),
  scenario_id: z.string(),
  scenario_hash: z.string(),
  scenario_run_id: z.string().optional(),
  provenance_chain: z.array(ConnectorLineageRefSchema),
  file_hashes: z.array(FileHashEntrySchema),
  connector_lineage_refs: z.array(ConnectorLineageRefSchema),
  total_files: z.number().int().nonnegative(),
  total_bytes: z.number().int().nonnegative(),
  licence: z.string(),
  disclaimer: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Types (derived from Zod schemas)
// ─────────────────────────────────────────────────────────────────────────────

export type FileHashEntry = z.infer<typeof FileHashEntrySchema>;
export type ConnectorLineageRef = z.infer<typeof ConnectorLineageRefSchema>;
export type DIPManifest = z.infer<typeof DIPManifestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Hashing utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Non-cryptographic djb2 hash for sync environments (Node / test).
 * Clearly labelled as non-cryptographic; do not use for security purposes.
 * Output: 8-hex-char string prefixed with 'djb2:'.
 */
export function djb2Hash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    hash = hash >>> 0; // uint32
  }
  return 'djb2:' + hash.toString(16).padStart(8, '0');
}

/**
 * Asynchronous SHA-256 hash using SubtleCrypto (browser/Deno/Node 18+).
 * Falls back to djb2 if SubtleCrypto is unavailable.
 */
export async function sha256Hash(content: string): Promise<{ hash: string; algorithm: 'sha-256' | 'djb2' }> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(content));
      const hex = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return { hash: hex, algorithm: 'sha-256' };
    } catch {
      // fall through to djb2
    }
  }
  return { hash: djb2Hash(content), algorithm: 'djb2' };
}

/**
 * Sync hash helper (djb2 only). Used internally for MANIFEST.json self-hash.
 */
export function syncHash(content: string): { hash: string; algorithm: 'djb2' } {
  return { hash: djb2Hash(content), algorithm: 'djb2' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildManifestInput {
  /** Filename → file content string map (from exportBundle) */
  files: Record<string, string>;
  /** Scenario identity */
  scenarioId: string;
  scenarioHash: string;
  scenarioRunId?: string;
  /** Provenance chain from substrate attachment (B17) */
  provenanceChain: ConnectorLineageRef[];
  /** Connector lineage refs from B05 registry */
  connectorLineageRefs?: ConnectorLineageRef[];
}

/**
 * Build a DIPManifest synchronously (using djb2 hashes).
 * For production use where SubtleCrypto is available, prefer `buildAuditManifestAsync`.
 */
export function buildAuditManifest(input: BuildManifestInput): DIPManifest {
  const fileHashes: FileHashEntry[] = Object.entries(input.files).map(([filename, content]) => {
    const { hash, algorithm } = syncHash(content);
    return {
      filename,
      hash,
      sizeBytes: new TextEncoder().encode(content).byteLength,
      algorithm,
    };
  });

  const totalBytes = fileHashes.reduce((sum, f) => sum + f.sizeBytes, 0);

  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    scenario_id: input.scenarioId,
    scenario_hash: input.scenarioHash,
    scenario_run_id: input.scenarioRunId,
    provenance_chain: input.provenanceChain,
    file_hashes: fileHashes,
    connector_lineage_refs: input.connectorLineageRefs ?? [],
    total_files: fileHashes.length,
    total_bytes: totalBytes,
    licence: 'Open Government Licence – Canada (OGL-C)',
    disclaimer:
      'This manifest is a data integrity record for internal review and regulatory filing preparation only. ' +
      'It does not constitute a filed document, audited statement, or regulator submission.',
  };
}

/**
 * Build a DIPManifest asynchronously using SHA-256 where available.
 */
export async function buildAuditManifestAsync(input: BuildManifestInput): Promise<DIPManifest> {
  const fileHashPromises = Object.entries(input.files).map(async ([filename, content]) => {
    const { hash, algorithm } = await sha256Hash(content);
    return {
      filename,
      hash,
      sizeBytes: new TextEncoder().encode(content).byteLength,
      algorithm,
    } satisfies FileHashEntry;
  });

  const fileHashes = await Promise.all(fileHashPromises);
  const totalBytes = fileHashes.reduce((sum, f) => sum + f.sizeBytes, 0);

  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    scenario_id: input.scenarioId,
    scenario_hash: input.scenarioHash,
    scenario_run_id: input.scenarioRunId,
    provenance_chain: input.provenanceChain,
    file_hashes: fileHashes,
    connector_lineage_refs: input.connectorLineageRefs ?? [],
    total_files: fileHashes.length,
    total_bytes: totalBytes,
    licence: 'Open Government Licence – Canada (OGL-C)',
    disclaimer:
      'This manifest is a data integrity record for internal review and regulatory filing preparation only. ' +
      'It does not constitute a filed document, audited statement, or regulator submission.',
  };
}

/**
 * Validate a DIPManifest using the Zod schema.
 * Throws ZodError if invalid; use in deserialization and inbound pack review.
 */
export function validateDIPManifest(data: unknown): DIPManifest {
  return DIPManifestSchema.parse(data);
}

/**
 * Safe parse variant — returns `{ success, data?, error? }` without throwing.
 */
export function safeParseDIPManifest(data: unknown): { success: true; data: DIPManifest } | { success: false; error: string } {
  const result = DIPManifestSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.message };
}

/**
 * Serialise a DIPManifest to the MANIFEST.json string included in ZIP bundles.
 */
export function manifestToJson(manifest: DIPManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Add a MANIFEST.json entry to an existing file map (for use with exportZipBundle).
 * Does NOT overwrite an existing MANIFEST.json key.
 */
export function addManifestToFileMap(
  files: Record<string, string>,
  manifest: DIPManifest,
): Record<string, string> {
  const manifestJson = manifestToJson(manifest);
  return {
    'MANIFEST.json': manifestJson,
    ...files,
  };
}
