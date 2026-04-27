import { z } from 'zod';
import { getCurrentPoolPrice } from './aesoService';
import {
  buildLiveSurfaceContract,
  type LiveSurfaceContract,
  type LiveSurfaceSourceKind,
  UTILITY_ASSUMPTION_PACK_VERSION,
} from './liveSurfaceContract';
import type { WeatherObservation } from './types/renewableForecast';
import { fetchWeatherForProvince } from './weatherService';
import {
  generateUtilityLoadSampleRows,
  parseUtilityHistoricalLoadCsv,
  type UtilityGeographyLevel,
  type UtilityHistoricalLoadRow,
  type UtilityJurisdiction,
  type UtilityQualityFlag,
} from './utilityForecasting';

export type UtilityBatchSourceSystem =
  | 'ami_mdm'
  | 'scada_peak'
  | 'cis_customer'
  | 'oms_outage'
  | 'gis_topology'
  | 'settlement_mdm'
  | 'green_button_cmd'
  | 'telemetry_gateway';

export type UtilityConnectorKind =
  | 'ontario_green_button_cmd'
  | 'utility_batch_csv'
  | 'alberta_settlement_batch'
  | 'telemetry_gateway_http';

export type UtilityConnectorStatus = 'draft' | 'pending_auth' | 'active' | 'stale' | 'revoked' | 'failed';
export type UtilityConnectorRevocationMode = 'api' | 'portal_redirect';

export interface UtilityBatchIntervalRecord {
  timestamp: string;
  geography_id: string;
  geography_level?: UtilityGeographyLevel;
  customer_class: string;
  demand_mw: number;
  net_load_mw?: number | null;
  gross_load_mw?: number | null;
  temperature_c?: number | null;
  customer_count?: number | null;
  feeder_id?: string;
  substation_id?: string;
}

export interface UtilityBatchSnapshot {
  source_system: UtilityBatchSourceSystem;
  jurisdiction: UtilityJurisdiction;
  observed_at: string;
  records: UtilityBatchIntervalRecord[];
}

export interface UtilityPublicContext {
  jurisdiction: UtilityJurisdiction;
  weather_observation: WeatherObservation | null;
  live_surfaces: LiveSurfaceContract[];
  alberta_pool_price_cad_per_mwh?: number | null;
}

export interface UtilityConnectorAccount {
  id: string;
  connector_kind: UtilityConnectorKind;
  source_kind: Extract<
    LiveSurfaceSourceKind,
    'utility_system_batch' | 'utility_settlement_batch' | 'green_button_cmd' | 'telemetry_gateway'
  >;
  status: UtilityConnectorStatus;
  jurisdiction: UtilityJurisdiction;
  utility_name: string;
  display_name: string;
  last_synced_at?: string | null;
  last_error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UtilityConnectionHealthCard {
  id: 'starter_data' | 'customer_upload' | UtilityConnectorKind;
  title: string;
  description: string;
  utility_name?: string;
  display_name?: string;
  source_kind: LiveSurfaceSourceKind;
  status: UtilityConnectorStatus;
  freshness_status: LiveSurfaceContract['freshness_status'];
  is_fallback: boolean;
  last_synced_at: string | null;
  error_message?: string | null;
  notes?: string;
  revocation_mode?: UtilityConnectorRevocationMode | null;
  revocation_url?: string | null;
  manage_connections_url?: string | null;
  oauth_espi_scope?: string | null;
  requested_data_categories?: string[];
  registration_form_categories?: string[];
  awaiting_revocation_confirmation?: boolean;
  token_material_purged?: boolean;
  can_disconnect?: boolean;
}

export interface UtilitySettlementParseResult {
  rows: UtilityHistoricalLoadRow[];
  errors: string[];
  vee_summary: {
    estimated_count: number;
    edited_count: number;
    gap_filled_count: number;
  };
}

export interface GreenButtonParseResult {
  rows: UtilityHistoricalLoadRow[];
  warnings: string[];
  subscription_id: string | null;
  usage_point_id: string | null;
}

export interface UtilityTelemetrySnapshot {
  observed_at: string;
  jurisdiction: UtilityJurisdiction;
  geography_level: UtilityGeographyLevel;
  geography_id: string;
  feeder_id?: string | null;
  substation_id?: string | null;
  load_mw?: number | null;
  voltage_kv?: number | null;
  transformer_utilization_pct?: number | null;
  outage_state?: 'normal' | 'watch' | 'outage' | 'restoration' | null;
  quality_flags: string[];
  source: string;
}

const telemetryPayloadSchema = z.object({
  observed_at: z.string().datetime(),
  jurisdiction: z.enum(['Ontario', 'Alberta']),
  geography_level: z.enum(['system', 'substation', 'feeder']),
  geography_id: z.string().min(1),
  feeder_id: z.string().min(1).optional().nullable(),
  substation_id: z.string().min(1).optional().nullable(),
  load_mw: z.number().finite().optional().nullable(),
  voltage_kv: z.number().finite().optional().nullable(),
  transformer_utilization_pct: z.number().finite().optional().nullable(),
  outage_state: z.enum(['normal', 'watch', 'outage', 'restoration']).optional().nullable(),
  quality_flags: z.array(z.string()).optional(),
  source: z.string().min(1).optional(),
});

const JURISDICTION_TO_PROVINCE: Record<UtilityJurisdiction, string> = {
  Ontario: 'ON',
  Alberta: 'AB',
};

const CSV_ALIASES = {
  timestamp: ['timestamp', 'datetime', 'date_time', 'interval_start', 'date'],
  geography_level: ['geography_level', 'level', 'asset_level'],
  geography_id: ['geography_id', 'zone', 'zone_id', 'feeder', 'substation', 'system_id'],
  customer_class: ['customer_class', 'class', 'rate_class', 'customer_segment'],
  demand_mw: ['demand_mw', 'mw', 'peak_mw', 'load_mw', 'demand'],
  weather_zone: ['weather_zone', 'weather', 'temperature_zone'],
  temperature_c: ['temperature_c', 'temp_c', 'temperature'],
  net_load_mw: ['net_load_mw', 'net_mw'],
  gross_load_mw: ['gross_load_mw', 'gross_mw'],
  customer_count: ['customer_count', 'customers', 'account_count'],
  source_system: ['source_system', 'system_source', 'connector'],
  feeder_id: ['feeder_id', 'feeder_name'],
  substation_id: ['substation_id', 'substation_name'],
  vee_status: ['vee_status', 'validation_status', 'estimated_flag'],
  settlement_status: ['settlement_status', 'settlement_flag', 'quality_code'],
} as const;

export function buildStarterUtilityBatchSnapshot(jurisdiction: UtilityJurisdiction): UtilityBatchSnapshot {
  const records = generateUtilityLoadSampleRows(jurisdiction, 'hourly')
    .slice(0, 24 * 14)
    .map((row) => ({
      timestamp: row.timestamp,
      geography_id: row.geography_id,
      geography_level: row.geography_level,
      customer_class: row.customer_class,
      demand_mw: row.demand_mw,
      net_load_mw: row.net_load_mw ?? row.demand_mw,
      gross_load_mw: row.gross_load_mw ?? row.demand_mw,
      temperature_c: row.temperature_c ?? null,
      customer_count: row.customer_count ?? null,
      feeder_id: row.geography_level === 'feeder' ? row.geography_id : undefined,
      substation_id: row.geography_level === 'substation' ? row.geography_id : undefined,
    }));

  return {
    source_system: 'ami_mdm',
    jurisdiction,
    observed_at: records.at(-1)?.timestamp ?? new Date().toISOString(),
    records,
  };
}

export function normalizeUtilityBatchSnapshot(snapshot: UtilityBatchSnapshot): UtilityHistoricalLoadRow[] {
  return snapshot.records.map((record) => ({
    timestamp: new Date(record.timestamp).toISOString(),
    geography_level: record.geography_level ?? inferGeographyLevel(record),
    geography_id: record.geography_id,
    customer_class: record.customer_class,
    demand_mw: record.demand_mw,
    temperature_c: record.temperature_c ?? null,
    weather_zone: snapshot.jurisdiction === 'Ontario' ? 'south' : 'central',
    net_load_mw: record.net_load_mw ?? null,
    gross_load_mw: record.gross_load_mw ?? null,
    customer_count: record.customer_count ?? null,
    source_system: snapshot.source_system,
    feeder_id: record.feeder_id ?? (record.geography_level === 'feeder' ? record.geography_id : undefined),
    substation_id: record.substation_id ?? (record.geography_level === 'substation' ? record.geography_id : undefined),
    quality_flags: [],
  }));
}

export function parseUtilitySystemBatchCsv(
  text: string,
  jurisdiction: UtilityJurisdiction,
  sourceSystem: UtilityBatchSourceSystem = 'ami_mdm',
): { rows: UtilityHistoricalLoadRow[]; errors: string[] } {
  const parsed = parseUtilityHistoricalLoadCsv(text);
  return {
    rows: parsed.rows.map((row) => ({
      ...row,
      weather_zone: row.weather_zone ?? (jurisdiction === 'Ontario' ? 'south' : 'central'),
      source_system: row.source_system ?? sourceSystem,
    })),
    errors: parsed.errors,
  };
}

export function parseUtilitySettlementCsv(text: string, jurisdiction: UtilityJurisdiction): UtilitySettlementParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ['Settlement CSV must include a header row and at least one data row.'],
      vee_summary: {
        estimated_count: 0,
        edited_count: 0,
        gap_filled_count: 0,
      },
    };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const columnIndexes = Object.fromEntries(
    Object.entries(CSV_ALIASES as Record<string, readonly string[]>).map(([key, aliases]) => [
      key,
      headers.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof typeof CSV_ALIASES, number>;

  const rows: UtilityHistoricalLoadRow[] = [];
  const errors: string[] = [];
  let estimatedCount = 0;
  let editedCount = 0;
  let gapFilledCount = 0;

  for (let index = 1; index < lines.length; index += 1) {
    const columns = splitCsvLine(lines[index]);
    const timestamp = readColumn(columns, columnIndexes.timestamp);
    const demandMw = parseNumeric(readColumn(columns, columnIndexes.demand_mw));

    if (!timestamp || !Number.isFinite(new Date(timestamp).getTime()) || !Number.isFinite(demandMw)) {
      errors.push(`Settlement row ${index + 1} skipped: invalid timestamp or demand value.`);
      continue;
    }

    const veeStatus = `${readColumn(columns, columnIndexes.vee_status)} ${readColumn(columns, columnIndexes.settlement_status)}`.toLowerCase();
    const qualityFlags = buildSettlementQualityFlags(veeStatus);

    estimatedCount += Number(qualityFlags.includes('vee_estimated'));
    editedCount += Number(qualityFlags.includes('vee_edited'));
    gapFilledCount += Number(qualityFlags.includes('meter_gap_filled'));

    rows.push({
      timestamp: new Date(timestamp).toISOString(),
      geography_level: normalizeGeographyLevel(readColumn(columns, columnIndexes.geography_level), readColumn(columns, columnIndexes.geography_id) || 'system'),
      geography_id: readColumn(columns, columnIndexes.geography_id) || 'system',
      customer_class: readColumn(columns, columnIndexes.customer_class) || 'mixed',
      demand_mw: demandMw,
      weather_zone: readColumn(columns, columnIndexes.weather_zone) || (jurisdiction === 'Ontario' ? 'south' : 'central'),
      temperature_c: parseOptionalNumeric(readColumn(columns, columnIndexes.temperature_c)),
      net_load_mw: parseOptionalNumeric(readColumn(columns, columnIndexes.net_load_mw)),
      gross_load_mw: parseOptionalNumeric(readColumn(columns, columnIndexes.gross_load_mw)),
      customer_count: parseOptionalNumeric(readColumn(columns, columnIndexes.customer_count)),
      source_system: readColumn(columns, columnIndexes.source_system) || 'settlement_mdm',
      feeder_id: readColumn(columns, columnIndexes.feeder_id) || undefined,
      substation_id: readColumn(columns, columnIndexes.substation_id) || undefined,
      quality_flags: qualityFlags,
    });
  }

  return {
    rows: rows.sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
    errors,
    vee_summary: {
      estimated_count: estimatedCount,
      edited_count: editedCount,
      gap_filled_count: gapFilledCount,
    },
  };
}

export function parseGreenButtonXml(
  xml: string,
  options: {
    jurisdiction?: UtilityJurisdiction;
    geographyId?: string;
    customerClass?: string;
  } = {},
): GreenButtonParseResult {
  const warnings: string[] = [];
  const jurisdiction = options.jurisdiction ?? 'Ontario';
  const subscriptionId = readXmlTag(xml, 'subscriptionId');
  const entries = extractGreenButtonEntries(xml);
  const defaultReadingType = extractReadingTypeMetadata(xml);
  const usagePointEntries = entries
    .filter((entry) => entry.resourceType === 'UsagePoint')
    .map((entry) => ({
      href: entry.selfHref,
      usagePointId: readXmlTag(entry.contentXml, 'mRID'),
    }));
  const meterReadingEntries = new Map<string, {
    usagePointHref: string | null;
    readingTypeHref: string | null;
    localTimeParametersHref: string | null;
  }>();
  const readingTypeEntries = new Map<string, { uom: string; powerMultiplier: number }>();
  const localTimeParameterEntries = new Map<string, { tzOffset: number | null }>();

  for (const entry of entries) {
    if (entry.resourceType === 'MeterReading' && entry.selfHref) {
      meterReadingEntries.set(entry.selfHref, {
        usagePointHref: entry.links.find((link) => link.href.includes('/UsagePoint/'))?.href ?? null,
        readingTypeHref: entry.links.find((link) => link.href.includes('/ReadingType/'))?.href ?? null,
        localTimeParametersHref: entry.links.find((link) => link.href.includes('/LocalTimeParameters/'))?.href ?? null,
      });
    }
    if (entry.resourceType === 'ReadingType' && entry.selfHref) {
      readingTypeEntries.set(entry.selfHref, extractReadingTypeMetadata(entry.contentXml));
    }
    if (entry.resourceType === 'LocalTimeParameters' && entry.selfHref) {
      localTimeParameterEntries.set(entry.selfHref, {
        tzOffset: parseOptionalNumeric(readXmlTag(entry.contentXml, 'tzOffset')),
      });
    }
  }

  const usagePointId = options.geographyId
    ?? usagePointEntries.find((entry) => entry.usagePointId)?.usagePointId
    ?? readXmlTag(xml, 'mRID')
    ?? readXmlTag(xml, 'UsagePoint');
  const geographyId = usagePointId ?? (jurisdiction === 'Ontario' ? 'ON-GREEN-BUTTON-1' : 'AB-GREEN-BUTTON-1');
  const customerClass = options.customerClass ?? 'mixed';
  const rows: UtilityHistoricalLoadRow[] = [];
  let skippedIntervalCount = 0;
  let unresolvedRelationshipCount = 0;
  let localTimeParametersDetected = false;

  const intervalContainers = entries.filter((entry) => entry.resourceType === 'IntervalBlock' || entry.resourceType === 'IntervalReading');
  for (const entry of intervalContainers) {
    const meterReadingHref = entry.links.find((link) => link.href.includes('/MeterReading/'))?.href ?? null;
    const meterReading = meterReadingHref ? meterReadingEntries.get(meterReadingHref) ?? null : null;
    const usagePointHref = meterReading?.usagePointHref ?? null;
    const resolvedUsagePointId = options.geographyId
      ?? usagePointEntries.find((usagePoint) => usagePoint.href === usagePointHref)?.usagePointId
      ?? usagePointEntries[0]?.usagePointId
      ?? geographyId;
    const readingType = meterReading?.readingTypeHref
      ? readingTypeEntries.get(meterReading.readingTypeHref) ?? defaultReadingType
      : defaultReadingType;
      const localTimeParameters = meterReading?.localTimeParametersHref
      ? localTimeParameterEntries.get(meterReading.localTimeParametersHref) ?? null
      : null;
    const intervalReadings = entry.resourceType === 'IntervalReading'
      ? [entry.contentXml]
      : readAllXmlBlocks(entry.contentXml, 'IntervalReading');

    if (!meterReading && usagePointEntries.length > 1 && !options.geographyId) {
      unresolvedRelationshipCount += intervalReadings.length;
    }

    for (const fragment of intervalReadings) {
      const startSeconds = Number(readXmlTag(fragment, 'start'));
      const durationSeconds = Number(readXmlTag(fragment, 'duration') ?? 3600);
      const rawValue = Number(readXmlTag(fragment, 'value'));

      if (!Number.isFinite(startSeconds) || !Number.isFinite(durationSeconds) || !Number.isFinite(rawValue)) {
        skippedIntervalCount += 1;
        continue;
      }

      const qualityFlags = new Set<UtilityQualityFlag>(['missing_temperature', 'customer_count_missing']);
      for (const quality of readAllXmlTags(fragment, 'ReadingQuality')) {
        const normalized = quality.toLowerCase();
        if (normalized.includes('estimate')) qualityFlags.add('vee_estimated');
        if (normalized.includes('edit')) qualityFlags.add('vee_edited');
        if (normalized.includes('gap') || normalized.includes('fill')) qualityFlags.add('meter_gap_filled');
      }

      rows.push({
        timestamp: new Date(startSeconds * 1000).toISOString(),
        geography_level: 'system' as const,
        geography_id: resolvedUsagePointId ?? geographyId,
        customer_class: customerClass,
        demand_mw: convertGreenButtonUsageToMw(rawValue, durationSeconds, readingType.powerMultiplier, readingType.uom),
        weather_zone: jurisdiction === 'Ontario' ? 'south' : 'central',
        source_system: 'green_button_cmd',
        quality_flags: Array.from(qualityFlags),
      });

      if (localTimeParameters?.tzOffset !== null && localTimeParameters?.tzOffset !== undefined) {
        localTimeParametersDetected = true;
      }
    }
  }

  rows.sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  if (rows.length === 0) {
    warnings.push('No interval readings were found in the Green Button XML payload.');
  }
  if (jurisdiction !== 'Ontario') {
    warnings.push('Green Button parsing is implemented for Ontario-first CMD workflows.');
  }
  if (localTimeParametersDetected) {
    warnings.push('LocalTimeParameters were detected; canonical interval timestamps remain epoch-derived while timezone metadata is preserved for review.');
  }
  if (skippedIntervalCount > 0) {
    warnings.push(`${skippedIntervalCount} interval reading(s) were skipped because required Green Button values were missing.`);
  }
  if (unresolvedRelationshipCount > 0) {
    warnings.push(`${unresolvedRelationshipCount} interval reading(s) fell back to the first available UsagePoint because meter relationships were incomplete.`);
  }

  return {
    rows,
    warnings,
    subscription_id: subscriptionId,
    usage_point_id: usagePointId,
  };
}

export function parseUtilityTelemetryPayload(input: unknown): { snapshot: UtilityTelemetrySnapshot | null; errors: string[] } {
  const parsed = telemetryPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      snapshot: null,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return {
    snapshot: {
      observed_at: parsed.data.observed_at,
      jurisdiction: parsed.data.jurisdiction,
      geography_level: parsed.data.geography_level,
      geography_id: parsed.data.geography_id,
      feeder_id: parsed.data.feeder_id ?? null,
      substation_id: parsed.data.substation_id ?? null,
      load_mw: parsed.data.load_mw ?? null,
      voltage_kv: parsed.data.voltage_kv ?? null,
      transformer_utilization_pct: parsed.data.transformer_utilization_pct ?? null,
      outage_state: parsed.data.outage_state ?? null,
      quality_flags: parsed.data.quality_flags ?? [],
      source: parsed.data.source ?? 'Telemetry gateway',
    },
    errors: [],
  };
}

export function buildTelemetrySurface(snapshot: UtilityTelemetrySnapshot): LiveSurfaceContract {
  return buildLiveSurfaceContract({
    source: snapshot.source,
    observedAt: snapshot.observed_at,
    isFallback: false,
    qualityFlags: snapshot.quality_flags,
    sourceKind: 'telemetry_gateway',
    staleAfterHours: 24,
    assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
    notes: `Northbound telemetry snapshot for ${snapshot.geography_id}.`,
  });
}

export function buildConnectionHealthCards(params: {
  jurisdiction: UtilityJurisdiction;
  activeSourceKind: LiveSurfaceSourceKind;
  activeSourceLabel: string;
  activeObservedAt?: string | null;
  activePersisted?: boolean;
  connectorAccounts?: UtilityConnectorAccount[];
}): UtilityConnectionHealthCard[] {
  const { jurisdiction, activeSourceKind, activeSourceLabel, activeObservedAt = null, activePersisted = false, connectorAccounts = [] } = params;

  const findAccount = (kind: UtilityConnectorKind) => connectorAccounts.find((account) => account.connector_kind === kind);
  const activeCard = (kind: LiveSurfaceSourceKind) => activeSourceKind === kind;

  const starterCard: UtilityConnectionHealthCard = {
    id: 'starter_data',
    title: 'Starter data',
    description: 'Local utility starter dataset for workflow validation.',
    source_kind: 'fallback_starter',
    status: activeCard('fallback_starter') ? 'active' : 'draft',
    freshness_status: buildLiveSurfaceContract({
      source: activeSourceLabel,
      observedAt: activeCard('fallback_starter') ? activeObservedAt : null,
      isFallback: true,
      sourceKind: 'fallback_starter',
    }).freshness_status,
    is_fallback: true,
    last_synced_at: activeCard('fallback_starter') ? activeObservedAt : null,
    notes: activeCard('fallback_starter') ? activeSourceLabel : 'Not currently active.',
  };

  const uploadCard: UtilityConnectionHealthCard = {
    id: 'customer_upload',
    title: 'Customer upload',
    description: 'Local-first upload path for planning teams and pilot datasets.',
    source_kind: 'uploaded_historical',
    status: activeCard('uploaded_historical') ? 'active' : 'draft',
    freshness_status: buildLiveSurfaceContract({
      source: activeSourceLabel,
      observedAt: activeCard('uploaded_historical') ? activeObservedAt : null,
      isFallback: false,
      sourceKind: 'uploaded_historical',
    }).freshness_status,
    is_fallback: false,
    last_synced_at: activeCard('uploaded_historical') ? activeObservedAt : null,
    notes: activeCard('uploaded_historical') ? activeSourceLabel : 'No uploaded historical dataset in the current session.',
  };

  return [
    starterCard,
    uploadCard,
    buildConnectorHealthCard({
      title: 'Utility batch sync',
      description: 'Authenticated operational batch or AMI/MDM import for utility-owned history.',
      account: findAccount('utility_batch_csv'),
      fallbackActive: activeCard('utility_system_batch'),
      fallbackSourceKind: 'utility_system_batch',
      activeSourceLabel,
      activeObservedAt,
      activePersisted,
    }),
    buildConnectorHealthCard({
      title: 'Alberta settlement batch',
      description: 'Settlement/MDM-compatible Alberta ingestion with VEE-aware quality mapping.',
      account: findAccount('alberta_settlement_batch'),
      fallbackActive: activeCard('utility_settlement_batch'),
      fallbackSourceKind: 'utility_settlement_batch',
      activeSourceLabel,
      activeObservedAt,
      activePersisted,
    }),
    buildConnectorHealthCard({
      title: 'Ontario Green Button',
      description: jurisdiction === 'Ontario'
        ? 'Account-holder authorized Ontario Green Button CMD interval history.'
        : 'Ontario-only connector. Shown here to preserve the canonical utility connector pattern.',
      account: findAccount('ontario_green_button_cmd'),
      fallbackActive: activeCard('green_button_cmd'),
      fallbackSourceKind: 'green_button_cmd',
      activeSourceLabel,
      activeObservedAt,
      activePersisted,
      defaultStatus: jurisdiction === 'Ontario' ? 'pending_auth' : 'draft',
      notes: jurisdiction === 'Ontario' ? 'Requires utility-specific third-party registration and account-holder consent.' : 'Not the primary Alberta live-data path.',
    }),
    buildConnectorHealthCard({
      title: 'Telemetry gateway',
      description: 'Signed HTTPS northbound telemetry intake from external gateways or integrators.',
      account: findAccount('telemetry_gateway_http'),
      fallbackActive: activeCard('telemetry_gateway'),
      fallbackSourceKind: 'telemetry_gateway',
      activeSourceLabel,
      activeObservedAt,
      activePersisted,
      notes: 'Raw DNP3 polling is explicitly out of scope for this repo.',
    }),
  ];
}

export function isConnectorCardLiveConnected(card: UtilityConnectionHealthCard): boolean {
  return (
    (card.source_kind === 'utility_system_batch'
      || card.source_kind === 'utility_settlement_batch'
      || card.source_kind === 'green_button_cmd'
      || card.source_kind === 'telemetry_gateway')
    && card.status === 'active'
    && !card.is_fallback
    && card.freshness_status === 'live'
  );
}

export async function fetchUtilityPublicContext(jurisdiction: UtilityJurisdiction): Promise<UtilityPublicContext> {
  const liveSurfaces: LiveSurfaceContract[] = [];
  let weatherObservation: WeatherObservation | null = null;

  try {
    weatherObservation = await fetchWeatherForProvince(JURISDICTION_TO_PROVINCE[jurisdiction], {
      preferredSource: 'environment_canada',
      fallbackEnabled: true,
    });
  } catch {
    weatherObservation = null;
  }

  liveSurfaces.push(
    weatherObservation
      ? buildLiveSurfaceContract({
          source: weatherObservation.source,
          observedAt: weatherObservation.observed_at,
          isFallback: Boolean(weatherObservation.raw_data?.mock),
          qualityFlags: weatherObservation.raw_data?.mock ? ['weather_mock_fallback'] : [],
          sourceKind: 'public_enrichment',
          staleAfterHours: 12,
          assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
          notes: `${jurisdiction} weather enrichment for forecast context.`,
        })
      : buildLiveSurfaceContract({
          source: 'ECCC weather adapter',
          observedAt: null,
          isFallback: true,
          qualityFlags: ['weather_fetch_unavailable'],
          sourceKind: 'public_enrichment',
          staleAfterHours: 12,
          assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
          notes: `${jurisdiction} weather enrichment is not available in the current environment.`,
        }),
  );

  let albertaPoolPrice: number | null | undefined = undefined;
  if (jurisdiction === 'Alberta') {
    const poolPrice = await getCurrentPoolPrice();
    albertaPoolPrice = poolPrice?.poolPrice ?? null;
    liveSurfaces.push(
      buildLiveSurfaceContract({
        source: poolPrice?.priceType === 'actual' ? 'AESO pool price API' : 'AESO cached pool price',
        observedAt: poolPrice?.timestamp ?? null,
        isFallback: poolPrice?.priceType !== 'actual',
        qualityFlags: poolPrice?.priceType === 'actual' ? [] : ['aeso_pool_price_fallback'],
        sourceKind: 'public_enrichment',
        staleAfterHours: 6,
        assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
        notes: 'Alberta market context for BYOP, large-load, and affordability planning.',
      }),
    );
  } else {
    liveSurfaces.push(
      buildLiveSurfaceContract({
        source: 'IESO public context adapter',
        observedAt: null,
        isFallback: true,
        qualityFlags: ['ieso_browser_context_pending'],
        sourceKind: 'public_enrichment',
        staleAfterHours: 6,
        assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
        notes: 'Ontario market context adapter will be promoted after a browser-safe IESO source path is wired.',
      }),
    );
  }

  return {
    jurisdiction,
    weather_observation: weatherObservation,
    live_surfaces: liveSurfaces,
    alberta_pool_price_cad_per_mwh: albertaPoolPrice,
  };
}

export function buildInputSourceSurface(params: {
  source: string;
  observedAt?: string | null;
  sourceKind: LiveSurfaceSourceKind;
  isFallback: boolean;
  qualityFlags?: string[];
  notes?: string;
}): LiveSurfaceContract {
  return buildLiveSurfaceContract({
    source: params.source,
    observedAt: params.observedAt ?? null,
    sourceKind: params.sourceKind,
    isFallback: params.isFallback,
    qualityFlags: params.qualityFlags,
    notes: params.notes,
    staleAfterHours: params.sourceKind === 'fallback_starter'
      ? 24 * 365
      : params.sourceKind === 'green_button_cmd'
        ? 24 * 2
        : params.sourceKind === 'telemetry_gateway'
          ? 24
          : 24 * 30,
  });
}

function inferGeographyLevel(record: UtilityBatchIntervalRecord): UtilityGeographyLevel {
  if (record.feeder_id) return 'feeder';
  if (record.substation_id) return 'substation';
  const normalized = record.geography_id.toLowerCase();
  if (normalized.includes('feed')) return 'feeder';
  if (normalized.includes('sub')) return 'substation';
  return 'system';
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function readColumn(columns: string[], index: number): string {
  if (index < 0) return '';
  return String(columns[index] ?? '').trim();
}

function parseNumeric(value: string): number {
  return Number(String(value).replace(/,/g, ''));
}

function parseOptionalNumeric(value: string): number | null {
  if (!value) return null;
  const parsed = parseNumeric(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGeographyLevel(value: string, geographyId: string): UtilityGeographyLevel {
  const normalized = value.toLowerCase();
  if (normalized === 'feeder' || normalized === 'substation' || normalized === 'system') {
    return normalized;
  }

  const loweredId = geographyId.toLowerCase();
  if (loweredId.includes('feed')) return 'feeder';
  if (loweredId.includes('sub')) return 'substation';
  return 'system';
}

function buildSettlementQualityFlags(veeStatus: string): UtilityQualityFlag[] {
  const flags = new Set<UtilityQualityFlag>();
  if (veeStatus.includes('estimate')) flags.add('vee_estimated');
  if (veeStatus.includes('edit')) flags.add('vee_edited');
  if (veeStatus.includes('gap') || veeStatus.includes('fill')) flags.add('meter_gap_filled');
  return Array.from(flags);
}

function readXmlTag(xml: string, localName: string): string | null {
  const match = new RegExp(`<[^>]*:?${localName}>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, 'i').exec(xml);
  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function readAllXmlTags(xml: string, localName: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<[^>]*:?${localName}>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, 'gi')))
    .map((match) => decodeXmlEntities((match[1] ?? '').trim()))
    .filter((value) => value.length > 0);
}

function readAllXmlBlocks(xml: string, localName: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<[^>]*:?${localName}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, 'gi')))
    .map((match) => (match[1] ?? '').trim())
    .filter((value) => value.length > 0);
}

function extractReadingTypeMetadata(xml: string): { uom: string; powerMultiplier: number } {
  return {
    uom: readXmlTag(xml, 'uom') ?? '72',
    powerMultiplier: Number(readXmlTag(xml, 'powerOfTenMultiplier') ?? 0),
  };
}

function extractGreenButtonEntries(xml: string): Array<{
  resourceType: string | null;
  contentXml: string;
  selfHref: string | null;
  links: Array<{ rel: string | null; href: string }>;
}> {
  return Array.from(xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)).map((match) => {
    const entryXml = match[1] ?? '';
    const contentXml = readXmlTag(entryXml, 'content') ?? '';
    const resourceTypeMatch = /<(?:(?:\w+):)?([A-Za-z]+)\b/.exec(contentXml);
    const links = Array.from(entryXml.matchAll(/<link\b([^>]*)\/?>/gi)).map((linkMatch) => {
      const attributes = linkMatch[1] ?? '';
      const rel = /rel=["']([^"']+)["']/i.exec(attributes)?.[1] ?? null;
      const href = /href=["']([^"']+)["']/i.exec(attributes)?.[1] ?? null;
      return href ? { rel, href } : null;
    }).filter((link): link is { rel: string | null; href: string } => Boolean(link));

    return {
      resourceType: resourceTypeMatch?.[1] ?? null,
      contentXml,
      selfHref: links.find((link) => link.rel === 'self')?.href ?? null,
      links,
    };
  });
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function convertGreenButtonUsageToMw(value: number, durationSeconds: number, powerMultiplier: number, uom: string): number {
  const scaledValue = value * (10 ** powerMultiplier);
  const normalizedUom = String(uom).toLowerCase();
  const mwh = normalizedUom === 'mwh'
    ? scaledValue
    : normalizedUom === 'kwh'
      ? scaledValue / 1000
      : scaledValue / 1_000_000;
  const hours = Math.max(durationSeconds / 3600, 1 / 60);
  return Number((mwh / hours).toFixed(6));
}

function buildConnectorHealthCard(params: {
  title: string;
  description: string;
  account?: UtilityConnectorAccount;
  fallbackActive: boolean;
  fallbackSourceKind: Extract<LiveSurfaceSourceKind, 'utility_system_batch' | 'utility_settlement_batch' | 'green_button_cmd' | 'telemetry_gateway'>;
  activeSourceLabel: string;
  activeObservedAt: string | null;
  activePersisted: boolean;
  defaultStatus?: UtilityConnectorStatus;
  notes?: string;
}): UtilityConnectionHealthCard {
  const account = params.account;
  const observedAt = account?.last_synced_at ?? (params.fallbackActive ? params.activeObservedAt : null);
  const source = account?.display_name ?? (params.fallbackActive ? params.activeSourceLabel : params.title);
  const surface = buildLiveSurfaceContract({
    source,
    observedAt,
    isFallback: params.fallbackActive ? !params.activePersisted : false,
    qualityFlags: [],
    sourceKind: params.fallbackSourceKind,
    staleAfterHours: params.fallbackSourceKind === 'telemetry_gateway' ? 24 : 24 * 7,
  });
  const derivedStatus = deriveConnectorStatus({
    account,
    fallbackActive: params.fallbackActive,
    activePersisted: params.activePersisted,
    freshnessStatus: surface.freshness_status,
    defaultStatus: params.defaultStatus ?? 'draft',
  });
  const derivedNotes = deriveConnectorNotes({
    account,
    fallbackActive: params.fallbackActive,
    baseNotes: params.notes,
  });

  return {
    id: account?.connector_kind ?? connectorKindForSource(params.fallbackSourceKind),
    title: params.title,
    description: params.description,
    utility_name: account?.utility_name,
    display_name: account?.display_name,
    source_kind: params.fallbackSourceKind,
    status: derivedStatus,
    freshness_status: surface.freshness_status,
    is_fallback: surface.is_fallback,
    last_synced_at: observedAt,
    error_message: account?.last_error ?? null,
    notes: derivedNotes,
    revocation_mode: readMetadataRevocationMode(account?.metadata),
    revocation_url: readMetadataString(account?.metadata, 'revocation_url'),
    manage_connections_url: readMetadataString(account?.metadata, 'manage_connections_url'),
    oauth_espi_scope: readMetadataString(account?.metadata, 'oauth_espi_scope'),
    requested_data_categories: readMetadataStringArray(account?.metadata, 'requested_data_categories'),
    registration_form_categories: readMetadataStringArray(account?.metadata, 'registration_form_categories'),
    awaiting_revocation_confirmation: readMetadataBoolean(account?.metadata, 'awaiting_revocation_confirmation'),
    token_material_purged: readMetadataBoolean(account?.metadata, 'token_material_purged') ?? false,
    can_disconnect: params.fallbackSourceKind === 'green_button_cmd' && (derivedStatus === 'active' || derivedStatus === 'stale' || derivedStatus === 'failed'),
  };
}

function connectorKindForSource(sourceKind: Extract<LiveSurfaceSourceKind, 'utility_system_batch' | 'utility_settlement_batch' | 'green_button_cmd' | 'telemetry_gateway'>): UtilityConnectorKind {
  switch (sourceKind) {
    case 'utility_system_batch':
      return 'utility_batch_csv';
    case 'utility_settlement_batch':
      return 'alberta_settlement_batch';
    case 'green_button_cmd':
      return 'ontario_green_button_cmd';
    case 'telemetry_gateway':
      return 'telemetry_gateway_http';
  }
}

function deriveConnectorStatus(params: {
  account?: UtilityConnectorAccount;
  fallbackActive: boolean;
  activePersisted: boolean;
  freshnessStatus: LiveSurfaceContract['freshness_status'];
  defaultStatus: UtilityConnectorStatus;
}): UtilityConnectorStatus {
  if (!params.account) {
    if (!params.fallbackActive) return params.defaultStatus;
    return params.activePersisted ? 'active' : 'stale';
  }

  const revokedAt = readMetadataTimestamp(params.account.metadata, 'revoked_at');
  if (revokedAt) return 'revoked';

  const revocationRequestedAt = readMetadataTimestamp(params.account.metadata, 'revocation_requested_at');
  if (revocationRequestedAt) return 'failed';

  const tokenExpiresAt = readMetadataTimestamp(params.account.metadata, 'token_expires_at');
  if (tokenExpiresAt && new Date(tokenExpiresAt).getTime() <= Date.now()) {
    return 'stale';
  }

  if (params.account.status === 'active' && params.freshnessStatus !== 'live') {
    return 'stale';
  }

  return params.account.status;
}

function deriveConnectorNotes(params: {
  account?: UtilityConnectorAccount;
  fallbackActive: boolean;
  baseNotes?: string;
}): string | undefined {
  const notes = params.baseNotes ? [params.baseNotes] : [];

  if (!params.account) {
    return params.fallbackActive ? notes.join(' ') || undefined : notes.join(' ') || undefined;
  }

  const revokedAt = readMetadataTimestamp(params.account.metadata, 'revoked_at');
  if (revokedAt) {
    notes.push(`Revocation detected at ${revokedAt}. Re-authorize before claiming live connector status.`);
  }

  const revocationRequestedAt = readMetadataTimestamp(params.account.metadata, 'revocation_requested_at');
  const manageConnectionsUrl = readMetadataString(params.account.metadata, 'manage_connections_url');
  if (revocationRequestedAt && !revokedAt) {
    notes.push(`Disconnect requested at ${revocationRequestedAt}. Complete utility-side revocation before reconnecting.`);
    if (manageConnectionsUrl) {
      notes.push(`Manage connections: ${manageConnectionsUrl}`);
    }
  }

  const tokenExpiresAt = readMetadataTimestamp(params.account.metadata, 'token_expires_at');
  if (tokenExpiresAt && new Date(tokenExpiresAt).getTime() <= Date.now()) {
    notes.push(`Connector token expired at ${tokenExpiresAt}. Refresh authorization before the next sync.`);
  }

  const tokenMaterialPurged = readMetadataBoolean(params.account.metadata, 'token_material_purged');
  if (tokenMaterialPurged && revokedAt) {
    notes.push('Stored token material has been purged.');
  }

  return notes.join(' ') || undefined;
}

function readMetadataTimestamp(metadata: Record<string, unknown> | undefined, key: string): string | null {
  const value = metadata?.[key];
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function readMetadataString(metadata: Record<string, unknown> | undefined, key: string): string | null {
  const value = String(metadata?.[key] ?? '').trim();
  return value.length > 0 ? value : null;
}

function readMetadataStringArray(metadata: Record<string, unknown> | undefined, key: string): string[] {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter((entry) => entry.length > 0) : [];
}

function readMetadataBoolean(metadata: Record<string, unknown> | undefined, key: string): boolean | null {
  const value = metadata?.[key];
  return typeof value === 'boolean' ? value : null;
}

function readMetadataRevocationMode(metadata: Record<string, unknown> | undefined): UtilityConnectorRevocationMode | null {
  const value = readMetadataString(metadata, 'revocation_mode');
  return value === 'api' || value === 'portal_redirect' ? value : null;
}
