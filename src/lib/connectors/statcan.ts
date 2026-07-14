/**
 * B05 – StatCan WDS / SDMX Connector
 *
 * Fetches Canadian energy statistics from Statistics Canada's
 * Web Data Service (WDS) using the SDMX-compliant REST API.
 *
 * Primary tables targeted:
 *   - 25-10-0015-01 (Electric power, utilities, annual — provincial)
 *   - 25-10-0001-01 (Supply and disposition of natural gas)
 *   - 25-10-0063-01 (Electric fuel consumption by type and class of producer)
 *
 * Source: https://www.statcan.gc.ca/en/developers/wds
 * License: Statistics Canada Open Licence
 */

import {
  BaseConnector,
  ConnectorMeta,
  DiscoverResult,
  FetchResult,
  NormalizedRecord,
} from './index.ts';

const WDS_BASE = 'https://www150.statcan.gc.ca/t1/tbl1/en';
const WDS_API = 'https://www150.statcan.gc.ca/t1/tbl1/en/downloadIVData/';

/** Map StatCan member codes → our province codes */
const STATCAN_GEO_MAP: Record<string, string> = {
  '1': 'CA',
  '10': 'NL',
  '11': 'PE',
  '12': 'NS',
  '13': 'NB',
  '24': 'QC',
  '35': 'ON',
  '46': 'MB',
  '47': 'SK',
  '48': 'AB',
  '59': 'BC',
  '60': 'YT',
  '61': 'NT',
  '62': 'NU',
};

export class StatCanConnector extends BaseConnector {
  readonly meta: ConnectorMeta = {
    id: 'statcan-wds',
    name: 'Statistics Canada WDS Energy Tables',
    sourceUrl: 'https://www.statcan.gc.ca/en/developers/wds',
    publisher: 'Statistics Canada',
    license: 'Statistics Canada Open Licence (https://www.statcan.gc.ca/en/reference/licence)',
    refreshCadenceHours: 8760, // annual publication
    jurisdictions: ['CA'],
    metricFamilies: ['electricity_generation', 'electricity_sales', 'natural_gas_supply'],
    requiresAuth: false,
    caveatNotes: 'Annual data; typically published 6–18 months after reference year.',
  };

  async discover(): Promise<DiscoverResult> {
    try {
      // Probe the metadata endpoint for table 25-10-0015-01
      const url = `${WDS_BASE}/dtbl/25-10-0015-01/tblId.json`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!resp.ok) {
        return { available: false, sourceLastUpdated: null, message: `HTTP ${resp.status}` };
      }
      const meta = (await resp.json()) as { releaseTime?: string };
      return {
        available: true,
        sourceLastUpdated: meta.releaseTime ?? null,
        message: 'StatCan WDS reachable',
      };
    } catch (err) {
      return { available: false, sourceLastUpdated: null, message: String(err) };
    }
  }

  async fetch(params?: Record<string, string>): Promise<FetchResult> {
    const runId = this.makeRunId();
    const retrievedAt = new Date().toISOString();
    const warnings: string[] = [];
    const records: NormalizedRecord[] = [];

    // Table 25-10-0015-01: Electric power, utilities (annual, by province)
    const tableId = params?.tableId ?? '25-10-0015-01';
    const url = `${WDS_API}${tableId.replace(/-/g, '')}`;

    let rawText = '';
    let payloadHash: string | null = null;

    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        warnings.push(`StatCan WDS HTTP ${resp.status} for table ${tableId}`);
        return {
          records: [],
          lineage: {
            connector_id: this.meta.id,
            run_id: runId,
            started_at: retrievedAt,
            status: 'failed',
            records_fetched: 0,
            records_failed: 0,
            source_url: url,
            source_updated_at: null,
            error_message: `HTTP ${resp.status}`,
            payload_hash: null,
          },
          warnings,
        };
      }
      rawText = await resp.text();
      payloadHash = await this.sha256hex(rawText);

      // Parse CSV (StatCan CSV format: first row header, semicolon separator in some tables)
      const lines = rawText.split('\n').filter(Boolean);
      const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

      const geoIdx = header.findIndex((h) => /geo/i.test(h));
      const yearIdx = header.findIndex((h) => /ref_date|year/i.test(h));
      const valueIdx = header.findIndex((h) => /^value$/i.test(h));
      const uomIdx = header.findIndex((h) => /uom/i.test(h));

      if ([geoIdx, yearIdx, valueIdx].some((i) => i < 0)) {
        warnings.push(`StatCan WDS: could not identify required columns in table ${tableId}`);
        return {
          records: [],
          lineage: {
            connector_id: this.meta.id,
            run_id: runId,
            started_at: retrievedAt,
            status: 'failed',
            records_fetched: 0,
            records_failed: 0,
            source_url: url,
            source_updated_at: null,
            error_message: 'Column detection failed',
            payload_hash: payloadHash,
          },
          warnings,
        };
      }

      for (const line of lines.slice(1)) {
        const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''));
        const geoCode = cols[geoIdx];
        const yearStr = cols[yearIdx];
        const valueStr = cols[valueIdx];
        const unit = uomIdx >= 0 ? (cols[uomIdx] ?? 'unknown') : 'GWh';
        const geo = STATCAN_GEO_MAP[geoCode] ?? geoCode;
        const value = parseFloat(valueStr);
        if (!Number.isFinite(value)) continue;

        records.push({
          metric: 'electricity_generation_gwh',
          geography: geo,
          observed_at: `${yearStr}-01-01T00:00:00Z`,
          value,
          unit,
          sector: 'electricity',
          fuel: null,
          technology: null,
          lineage_id: runId,
          source_doc_url: url,
          retrieved_at: retrievedAt,
          is_projection: false,
        });
      }
    } catch (err) {
      warnings.push(`StatCan WDS fetch error: ${String(err)}`);
    }

    return {
      records,
      lineage: {
        connector_id: this.meta.id,
        run_id: runId,
        started_at: retrievedAt,
        status: records.length > 0 ? 'success' : 'failed',
        records_fetched: records.length,
        records_failed: 0,
        source_url: url,
        source_updated_at: null,
        error_message: warnings.length > 0 ? warnings[0] : null,
        payload_hash: payloadHash,
      },
      warnings,
    };
  }
}
