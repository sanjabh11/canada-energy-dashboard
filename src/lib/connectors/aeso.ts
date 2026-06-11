/**
 * B05 – AESO (Alberta Electric System Operator) Connector
 *
 * Fetches real-time and historical electricity market data from AESO's public API.
 *
 * Endpoints used:
 *   - /v1/market/clearing-price     → hourly pool price ($/MWh)
 *   - /v1/supply/merit-order        → current supply stack
 *   - /v1/current/summary           → real-time generation summary by fuel type
 *
 * Source: https://api.aeso.ca/web/api
 * License: Open access (see https://www.aeso.ca/market/market-and-system-reporting/data-requests/)
 */

import { BaseConnector, ConnectorMeta, DiscoverResult, FetchResult, NormalizedRecord } from './index.ts';

const AESO_API_BASE = 'https://api.aeso.ca/web/api';

export class AesoConnector extends BaseConnector {
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }

  readonly meta: ConnectorMeta = {
    id: 'aeso',
    name: 'AESO Alberta Electricity Market Data',
    sourceUrl: 'https://api.aeso.ca/web/api',
    publisher: 'Alberta Electric System Operator',
    license: 'AESO Market Data Terms – open for non-commercial use',
    refreshCadenceHours: 24, // hourly data, daily refresh cycle in our pipeline
    jurisdictions: ['CA-AB'],
    metricFamilies: [
      'electricity_pool_price_cad_mwh',
      'electricity_generation_mw',
      'electricity_demand_mw',
    ],
    requiresAuth: true,
    caveatNotes:
      'Requires AESO Open Data API key (env: AESO_API_KEY). ' +
      'Pool price data available ~2h after real time.',
  };

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['X-API-Key'] = this.apiKey;
    return h;
  }

  async discover(): Promise<DiscoverResult> {
    try {
      const url = `${AESO_API_BASE}/v1/current/summary`;
      const resp = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(10_000),
      });
      return {
        available: resp.ok,
        sourceLastUpdated: new Date().toISOString(),
        message: resp.ok ? 'AESO API reachable' : `HTTP ${resp.status}`,
      };
    } catch (err) {
      return { available: false, message: String(err) };
    }
  }

  async fetch(params?: Record<string, string>): Promise<FetchResult> {
    const runId = this.makeRunId();
    const retrievedAt = new Date().toISOString();
    const warnings: string[] = [];
    const records: NormalizedRecord[] = [];

    // Fetch current generation summary
    const summaryUrl = `${AESO_API_BASE}/v1/current/summary`;
    try {
      const resp = await fetch(summaryUrl, {
        headers: this.headers,
        signal: AbortSignal.timeout(15_000),
      });

      if (!resp.ok) {
        warnings.push(`AESO current/summary HTTP ${resp.status}`);
      } else {
        const json = await resp.json() as {
          return?: {
            alberta_internal_load?: number;
            net_to_grid_generation?: number;
            renewable_generation?: number;
            generation_data_list?: Array<{
              fuel_type?: string;
              aggregated_mw?: number;
            }>;
            last_updated_datetime_utc?: string;
          };
        };

        const r = json.return;
        const ts = r?.last_updated_datetime_utc
          ? new Date(r.last_updated_datetime_utc).toISOString()
          : retrievedAt;

        if (r?.alberta_internal_load != null) {
          records.push({
            metric: 'electricity_demand_mw',
            geography: 'AB',
            observed_at: ts,
            value: r.alberta_internal_load,
            unit: 'MW',
            sector: 'electricity',
            fuel: null,
            technology: null,
            lineage_id: runId,
            source_doc_url: summaryUrl,
            retrieved_at: retrievedAt,
            is_projection: false,
          });
        }

        if (r?.net_to_grid_generation != null) {
          records.push({
            metric: 'electricity_generation_mw',
            geography: 'AB',
            observed_at: ts,
            value: r.net_to_grid_generation,
            unit: 'MW',
            sector: 'electricity',
            fuel: null,
            technology: null,
            lineage_id: runId,
            source_doc_url: summaryUrl,
            retrieved_at: retrievedAt,
            is_projection: false,
          });
        }

        // Fuel-level breakdown
        for (const item of r?.generation_data_list ?? []) {
          if (item.fuel_type && item.aggregated_mw != null) {
            records.push({
              metric: 'electricity_generation_mw',
              geography: 'AB',
              observed_at: ts,
              value: item.aggregated_mw,
              unit: 'MW',
              sector: 'electricity',
              fuel: item.fuel_type.toLowerCase().replace(/\s+/g, '_'),
              technology: null,
              lineage_id: runId,
              source_doc_url: summaryUrl,
              retrieved_at: retrievedAt,
              is_projection: false,
            });
          }
        }
      }
    } catch (err) {
      warnings.push(`AESO fetch error: ${String(err)}`);
    }

    // Optionally fetch pool price (last 24h)
    if (params?.includePoolPrice !== 'false') {
      const endDate = params?.endDate ?? new Date().toISOString().slice(0, 10);
      const startDate = params?.startDate ?? new Date(Date.now() - 86_400_000 * 7)
        .toISOString()
        .slice(0, 10);
      const priceUrl = `${AESO_API_BASE}/v1/market/clearing-price/pool-price?startDate=${startDate}&endDate=${endDate}`;
      try {
        const resp = await fetch(priceUrl, {
          headers: this.headers,
          signal: AbortSignal.timeout(15_000),
        });
        if (resp.ok) {
          const json = await resp.json() as {
            return?: Array<{ begin_datetime_utc?: string; pool_price?: number }>;
          };
          for (const item of json.return ?? []) {
            if (item.begin_datetime_utc && item.pool_price != null) {
              records.push({
                metric: 'electricity_pool_price_cad_mwh',
                geography: 'AB',
                observed_at: new Date(item.begin_datetime_utc).toISOString(),
                value: item.pool_price,
                unit: 'CAD/MWh',
                sector: 'electricity',
                fuel: null,
                technology: null,
                lineage_id: runId,
                source_doc_url: priceUrl,
                retrieved_at: retrievedAt,
                is_projection: false,
              });
            }
          }
        } else {
          warnings.push(`AESO pool price HTTP ${resp.status}`);
        }
      } catch (err) {
        warnings.push(`AESO pool price fetch error: ${String(err)}`);
      }
    }

    const payloadHash = await this.sha256hex(JSON.stringify(records));
    return {
      records,
      lineage: {
        connector_id: this.meta.id,
        run_id: runId,
        started_at: retrievedAt,
        status: records.length > 0 ? 'success' : 'failed',
        records_fetched: records.length,
        records_failed: 0,
        source_url: summaryUrl,
        source_updated_at: retrievedAt,
        error_message: warnings.length > 0 ? warnings.slice(0, 2).join(' | ') : null,
        payload_hash: payloadHash,
      },
      warnings,
    };
  }
}
