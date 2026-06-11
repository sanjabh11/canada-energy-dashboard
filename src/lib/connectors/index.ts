/**
 * B05 – Official Data Connector Framework
 *
 * Connector interface and shared utilities for all national public-data adapters.
 * Each connector must implement the `OfficialDataConnector` interface below.
 *
 * Initial adapters (stubs — real HTTP in their own files):
 *   - StatCanConnector    (WDS / SDMX)
 *   - CerConnector        (Energy Futures / Open Gov downloads)
 *   - EcccNpriConnector   (NPRI facility emissions)
 *   - NrcanConnector      (NRCan energy data)
 *   - AesoConnector       (AESO API)
 *   - IesoConnector       (IESO market data directory)
 *
 * Architecture rules:
 *   - Connectors NEVER replace stale rows with unlabeled sample data on failure.
 *   - Failed runs mark existing rows `freshness_status = 'stale'`; they do NOT delete.
 *   - Every ingested row carries a `lineage_id` pointing to a `connector_lineage` record.
 *   - License notes and source attribution are mandatory in every `ConnectorMeta`.
 */

// ── Shared types ───────────────────────────────────────────────────────────────

export type FreshnessStatus = 'live' | 'stale' | 'demo' | 'unknown';
export type ConnectorStatus = 'idle' | 'running' | 'success' | 'failed' | 'degraded';

/** Metadata every connector must declare. */
export interface ConnectorMeta {
  /** Stable machine-readable identifier */
  id: string;
  /** Human display name */
  name: string;
  /** Authoritative source URL (landing page or API root) */
  sourceUrl: string;
  /** Publisher/organization name */
  publisher: string;
  /** Data license (e.g. "Open Government Licence – Canada") */
  license: string;
  /** Recommended refresh cadence in hours (e.g. 24, 168, 8760) */
  refreshCadenceHours: number;
  /** ISO-3166-2 jurisdictions covered (e.g. ["CA-AB", "CA-ON"] or ["CA"]) */
  jurisdictions: string[];
  /** Metric families this connector supplies */
  metricFamilies: string[];
  /** Whether this connector requires authentication/credentials */
  requiresAuth: boolean;
  /** Free-text notes on known limitations or data caveats */
  caveatNotes?: string;
}

/** Result of a connector discover() probe. */
export interface DiscoverResult {
  available: boolean;
  /** ISO date string of last known source update, if detectable */
  sourceLastUpdated: string | null;
  /** Approximate row count or series count available, if detectable */
  estimatedRecords?: number;
  message?: string;
}

/** Normalized row before upsert – enforces required provenance fields. */
export interface NormalizedRecord {
  /** Metric identifier (e.g. "electricity_generation_gwh") */
  metric: string;
  /** Province/territory or grid zone code (e.g. "AB", "ON", "IESO") */
  geography: string;
  /** ISO datetime of the observation (e.g. "2024-01-01T00:00:00Z") */
  observed_at: string;
  /** Numeric value */
  value: number;
  /** Unit string (e.g. "GWh", "tCO2e", "MW", "CAD") */
  unit: string;
  /** Sector (e.g. "electricity", "industrial", "residential") — or null */
  sector: string | null;
  /** Fuel type (e.g. "natural_gas", "wind", "coal") — or null */
  fuel: string | null;
  /** Technology type — or null */
  technology: string | null;
  /** Foreign key to `connector_lineage.id` */
  lineage_id: string;
  /** Source document URL or API query URL used to fetch this record */
  source_doc_url: string;
  /** ISO datetime when this record was fetched */
  retrieved_at: string;
  /** True when this record is a projection/forecast, not historical fact */
  is_projection: boolean;
}

/** One lineage record per connector run (written to `connector_lineage` table). */
export interface LineageRecord {
  connector_id: string;
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: ConnectorStatus;
  records_fetched: number;
  records_upserted: number;
  records_skipped: number;
  records_failed: number;
  source_url: string;
  source_updated_at: string | null;
  error_message: string | null;
  /** SHA-256 hash of the raw fetched payload for audit reproducibility */
  payload_hash: string | null;
}

/** Result returned from a connector fetch() + normalize() cycle. */
export interface FetchResult {
  records: NormalizedRecord[];
  lineage: Omit<LineageRecord, 'completed_at' | 'records_upserted' | 'records_skipped'>;
  warnings: string[];
}

/** Result of a freshnessCheck() call. */
export interface FreshnessCheckResult {
  connector_id: string;
  status: FreshnessStatus;
  lastSuccessfulRun: string | null;
  sourceLastUpdated: string | null;
  ageHours: number | null;
  isWithinSLA: boolean;
  message: string;
}

// ── Core connector interface ────────────────────────────────────────────────────

/**
 * All official data connectors must implement this interface.
 * The connector framework calls methods in this order:
 *   1. discover()     → probe source availability
 *   2. fetch()        → download + normalize data
 *   3. validate()     → check normalized records for integrity
 *   4. upsert()       → write to Postgres (via Supabase client)
 *   5. lineageRecord()→ write lineage + provenance metadata
 *   6. freshnessCheck()→ poll last successful run vs. SLA
 */
export interface OfficialDataConnector {
  readonly meta: ConnectorMeta;

  /** Probe the source for availability and latest update timestamp. */
  discover(): Promise<DiscoverResult>;

  /**
   * Download data from the source and return normalized records.
   * MUST NOT throw on partial failures — return warnings instead.
   * If the source is unreachable, return an empty records array + warning.
   */
  fetch(params?: Record<string, string>): Promise<FetchResult>;

  /**
   * Validate a batch of normalized records.
   * Returns { valid, invalid } partitions plus validation messages.
   */
  validate(records: NormalizedRecord[]): Promise<{
    valid: NormalizedRecord[];
    invalid: Array<{ record: NormalizedRecord; reason: string }>;
  }>;

  /**
   * Upsert valid records into the `energy_time_series` Postgres table.
   * Must mark existing rows stale — never delete them — on partial failure.
   */
  upsert(
    records: NormalizedRecord[],
    supabaseClient: unknown,
  ): Promise<{ upserted: number; skipped: number; failed: number }>;

  /**
   * Write a lineage record to `connector_lineage`.
   * Called after upsert regardless of success/failure.
   */
  lineageRecord(
    lineage: LineageRecord,
    supabaseClient: unknown,
  ): Promise<void>;

  /** Report whether the connector's data is within its configured SLA. */
  freshnessCheck(lastRunAt: string | null): FreshnessCheckResult;
}

// ── Base class with shared helpers ─────────────────────────────────────────────

export abstract class BaseConnector implements OfficialDataConnector {
  abstract readonly meta: ConnectorMeta;

  abstract discover(): Promise<DiscoverResult>;
  abstract fetch(params?: Record<string, string>): Promise<FetchResult>;

  /** Default validate: check required fields, unit not empty, value is finite. */
  async validate(records: NormalizedRecord[]): Promise<{
    valid: NormalizedRecord[];
    invalid: Array<{ record: NormalizedRecord; reason: string }>;
  }> {
    const valid: NormalizedRecord[] = [];
    const invalid: Array<{ record: NormalizedRecord; reason: string }> = [];

    for (const r of records) {
      const reasons: string[] = [];
      if (!r.metric) reasons.push('metric is required');
      if (!r.geography) reasons.push('geography is required');
      if (!r.observed_at) reasons.push('observed_at is required');
      if (!Number.isFinite(r.value)) reasons.push('value must be a finite number');
      if (!r.unit) reasons.push('unit is required');
      if (!r.lineage_id) reasons.push('lineage_id is required');
      if (!r.retrieved_at) reasons.push('retrieved_at is required');
      // Reject future timestamps unless explicitly marked projection
      if (!r.is_projection) {
        const obs = new Date(r.observed_at).getTime();
        if (obs > Date.now() + 86_400_000) {
          reasons.push('future timestamp on non-projection record — set is_projection=true');
        }
      }
      if (reasons.length > 0) {
        invalid.push({ record: r, reason: reasons.join('; ') });
      } else {
        valid.push(r);
      }
    }
    return { valid, invalid };
  }

  async upsert(
    records: NormalizedRecord[],
    supabaseClient: unknown,
  ): Promise<{ upserted: number; skipped: number; failed: number }> {
    if (records.length === 0) return { upserted: 0, skipped: 0, failed: 0 };

    const client = supabaseClient as {
      from: (table: string) => {
        upsert: (rows: unknown[], opts: unknown) => Promise<{ error: unknown }>;
      };
    };

    // Batch in chunks of 500 to stay within Supabase payload limits
    const CHUNK = 500;
    let upserted = 0;
    let failed = 0;

    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { error } = await client.from('energy_time_series').upsert(chunk, {
        onConflict: 'metric,geography,observed_at,lineage_id',
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`[${this.meta.id}] upsert chunk ${i}–${i + CHUNK} failed:`, error);
        failed += chunk.length;
      } else {
        upserted += chunk.length;
      }
    }

    return { upserted, skipped: 0, failed };
  }

  async lineageRecord(lineage: LineageRecord, supabaseClient: unknown): Promise<void> {
    const client = supabaseClient as {
      from: (table: string) => {
        upsert: (row: unknown, opts: unknown) => Promise<{ error: unknown }>;
      };
    };
    const { error } = await client.from('connector_lineage').upsert(lineage, {
      onConflict: 'run_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`[${this.meta.id}] lineageRecord failed:`, error);
    }
  }

  freshnessCheck(lastRunAt: string | null): FreshnessCheckResult {
    const slaHours = this.meta.refreshCadenceHours * 1.5; // 50% grace period
    if (!lastRunAt) {
      return {
        connector_id: this.meta.id,
        status: 'unknown',
        lastSuccessfulRun: null,
        sourceLastUpdated: null,
        ageHours: null,
        isWithinSLA: false,
        message: `[${this.meta.id}] No successful run recorded yet.`,
      };
    }
    const ageHours = (Date.now() - new Date(lastRunAt).getTime()) / (1000 * 60 * 60);
    const isWithinSLA = ageHours <= slaHours;
    return {
      connector_id: this.meta.id,
      status: isWithinSLA ? 'live' : 'stale',
      lastSuccessfulRun: lastRunAt,
      sourceLastUpdated: null,
      ageHours,
      isWithinSLA,
      message: isWithinSLA
        ? `[${this.meta.id}] Data is fresh (${ageHours.toFixed(1)}h old, SLA ${slaHours}h).`
        : `[${this.meta.id}] Data is STALE (${ageHours.toFixed(1)}h old, SLA ${slaHours}h). Do not use for live claims.`,
    };
  }

  /** Helper: generate a deterministic run ID from connector id + timestamp */
  protected makeRunId(): string {
    return `${this.meta.id}__${new Date().toISOString().replace(/[:.]/g, '-')}`;
  }

  /** Helper: SHA-256 hex of a string (browser-compatible Web Crypto) */
  protected async sha256hex(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Node.js fallback
    const { createHash } = await import('crypto');
    return createHash('sha256').update(input).digest('hex');
  }
}

// ── Connector registry ─────────────────────────────────────────────────────────

/** Global registry: maps connector id → connector instance. */
const registry = new Map<string, OfficialDataConnector>();

export function registerConnector(connector: OfficialDataConnector): void {
  if (registry.has(connector.meta.id)) {
    console.warn(`[ConnectorRegistry] Overwriting connector: ${connector.meta.id}`);
  }
  registry.set(connector.meta.id, connector);
}

export function getConnector(id: string): OfficialDataConnector | undefined {
  return registry.get(id);
}

export function listConnectors(): ConnectorMeta[] {
  return Array.from(registry.values()).map((c) => c.meta);
}

/**
 * Run a full connector cycle:
 *   discover → fetch → validate → upsert → lineageRecord
 *
 * On any failure, writes a failed lineage record so the data-spine
 * dashboard can surface the stale status.
 */
export async function runConnector(
  connectorId: string,
  supabaseClient: unknown,
  params?: Record<string, string>,
): Promise<LineageRecord> {
  const connector = registry.get(connectorId);
  if (!connector) {
    throw new Error(`[ConnectorRegistry] Unknown connector: ${connectorId}`);
  }

  const runId = `${connectorId}__${Date.now()}`;
  const startedAt = new Date().toISOString();

  const partialLineage: Omit<LineageRecord, 'completed_at' | 'records_upserted' | 'records_skipped'> = {
    connector_id: connectorId,
    run_id: runId,
    started_at: startedAt,
    status: 'running',
    records_fetched: 0,
    records_failed: 0,
    source_url: connector.meta.sourceUrl,
    source_updated_at: null,
    error_message: null,
    payload_hash: null,
  };

  try {
    // 1. Discover
    const discovered = await connector.discover();
    if (!discovered.available) {
      const failedLineage: LineageRecord = {
        ...partialLineage,
        status: 'failed',
        completed_at: new Date().toISOString(),
        records_upserted: 0,
        records_skipped: 0,
        error_message: `Source unavailable: ${discovered.message ?? 'no message'}`,
      };
      await connector.lineageRecord(failedLineage, supabaseClient);
      return failedLineage;
    }

    // 2. Fetch + normalize
    const fetchResult = await connector.fetch(params);
    partialLineage.records_fetched = fetchResult.records.length;
    partialLineage.source_updated_at = fetchResult.lineage.source_updated_at;
    partialLineage.payload_hash = fetchResult.lineage.payload_hash;

    // 3. Validate
    const { valid, invalid } = await connector.validate(fetchResult.records);
    const warnings = [
      ...fetchResult.warnings,
      ...invalid.map((iv) => `Invalid record: ${iv.reason}`),
    ];
    if (warnings.length > 0) {
      console.warn(`[${connectorId}] ${warnings.length} warnings during run ${runId}`);
    }

    // 4. Upsert
    const upsertResult = await connector.upsert(valid, supabaseClient);

    // 5. Lineage
    const completedLineage: LineageRecord = {
      ...partialLineage,
      status: upsertResult.failed > 0 ? 'degraded' : 'success',
      completed_at: new Date().toISOString(),
      records_upserted: upsertResult.upserted,
      records_skipped: upsertResult.skipped,
      records_failed: upsertResult.failed + invalid.length,
      error_message: warnings.length > 0 ? warnings.slice(0, 5).join(' | ') : null,
    };
    await connector.lineageRecord(completedLineage, supabaseClient);
    return completedLineage;
  } catch (err) {
    const failedLineage: LineageRecord = {
      ...partialLineage,
      status: 'failed',
      completed_at: new Date().toISOString(),
      records_upserted: 0,
      records_skipped: 0,
      error_message: err instanceof Error ? err.message : String(err),
    };
    await connector.lineageRecord(failedLineage, supabaseClient);
    return failedLineage;
  }
}
