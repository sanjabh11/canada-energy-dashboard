import { buildDataProvenance, type DataProvenanceMeta } from './foundation';
import { getTIERPricing } from './tierPricing';

export interface UptimeMonitorDefinition {
  id: string;
  name: string;
  url: string;
  expectedStatus: number[];
  intervalMinutes: number;
  owner: string;
}

const PRODUCTION_BASE_URL = 'https://canada-energy.netlify.app';

export const UPTIME_MONITORS: UptimeMonitorDefinition[] = [
  { id: 'homepage', name: 'Homepage', url: `${PRODUCTION_BASE_URL}/`, expectedStatus: [200], intervalMinutes: 5, owner: 'ops@ceip.io' },
  { id: 'pilot-readiness', name: 'Pilot Readiness', url: `${PRODUCTION_BASE_URL}/pilot-readiness`, expectedStatus: [200], intervalMinutes: 5, owner: 'ops@ceip.io' },
  { id: 'utility-forecast', name: 'Utility Forecast Pack', url: `${PRODUCTION_BASE_URL}/utility-demand-forecast`, expectedStatus: [200], intervalMinutes: 5, owner: 'ops@ceip.io' },
  { id: 'ga-ici-5cp', name: 'Ontario GA/ICI 5CP Pack', url: `${PRODUCTION_BASE_URL}/ga-ici-5cp`, expectedStatus: [200], intervalMinutes: 5, owner: 'ops@ceip.io' },
  { id: 'byo-csv-proof', name: 'BYO-CSV Proof Pack', url: `${PRODUCTION_BASE_URL}/byo-csv-proof`, expectedStatus: [200], intervalMinutes: 5, owner: 'ops@ceip.io' },
];

export interface SourceRegistryEntry {
  id: string;
  label: string;
  meta: DataProvenanceMeta;
}

const tierPricing = getTIERPricing();

export const HIGH_RISK_SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    id: 'aeso_pool_prices',
    label: 'Alberta Pool Prices (AESO)',
    meta: buildDataProvenance({
      source: 'AESO ETS API',
      lastUpdated: '2026-02-01',
      staleAfterHours: 24,
      note: 'Browser calls may fall back to cached price estimates when the public endpoint is unavailable.',
      sourceUrl: 'https://api.aeso.ca/',
    }),
  },
  {
    id: 'tier_pricing',
    label: 'TIER Pricing Data',
    meta: buildDataProvenance({
      source: tierPricing.source,
      lastUpdated: tierPricing.lastVerifiedAt,
      staleAfterHours: 24 * 90,
      note: `Fund price effective ${tierPricing.effectiveDate}. Period label: ${tierPricing.periodLabel}.`,
      sourceUrl: tierPricing.sourceUrl,
    }),
  },
  {
    id: 'ieso_demand',
    label: 'Ontario Demand Data (IESO)',
    meta: buildDataProvenance({
      source: 'IESO Public Reports',
      lastUpdated: '2026-02-01',
      staleAfterHours: 24,
      isFallback: true,
      note: 'Current UI still relies on local training/sample data outside of live ingestion.',
      sourceUrl: 'https://www.ieso.ca/',
    }),
  },
];
