/**
 * B05 – IESO (Ontario Independent Electricity System Operator) Connector
 *
 * Fetches Ontario electricity generation and demand data from IESO's
 * public market data directory.
 *
 * Source: http://www.ieso.ca/power-data
 * CSV Reports: https://reports.ieso.ca/public/
 * License: IESO Open Data Licence (ieso.ca/en/The-IESO/Open-Data-Licence)
 */

import {
  BaseConnector,
  ConnectorMeta,
  DiscoverResult,
  FetchResult,
  NormalizedRecord,
} from './index.ts';

const IESO_REPORTS_BASE = 'https://reports.ieso.ca/public';
const IESO_LANDING = 'https://www.ieso.ca/power-data';

export class IesoConnector extends BaseConnector {
  readonly meta: ConnectorMeta = {
    id: 'ieso',
    name: 'IESO Ontario Electricity Market Data',
    sourceUrl: IESO_LANDING,
    publisher: 'Independent Electricity System Operator (Ontario)',
    license: 'IESO Open Data Licence (https://www.ieso.ca/en/The-IESO/Open-Data-Licence)',
    refreshCadenceHours: 24,
    jurisdictions: ['CA-ON'],
    metricFamilies: [
      'electricity_generation_mw',
      'electricity_demand_mw',
      'electricity_price_ontario_hoep_cad_mwh',
    ],
    requiresAuth: false,
    caveatNotes:
      'Hourly reports published next day. Real-time summary updated every 5 min. ' +
      'Dispatch data available 30 days prior only.',
  };

  async discover(): Promise<DiscoverResult> {
    try {
      // Probe generatorbydueltype directory
      const url = `${IESO_REPORTS_BASE}/RealtimeConstTotals/`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      return {
        available: resp.ok,
        sourceLastUpdated: resp.headers.get('last-modified'),
        message: resp.ok ? 'IESO reports reachable' : `HTTP ${resp.status}`,
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

    // Use the "RealtimeConstTotals" report: generation by fuel type, updated hourly
    // Format: PUB_RealtimeConstTotals_YYYYMMDD.csv
    const targetDate = params?.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const csvUrl = `${IESO_REPORTS_BASE}/RealtimeConstTotals/PUB_RealtimeConstTotals_${targetDate}.csv`;

    try {
      const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        // Try yesterday's report
        const yesterday = new Date(Date.now() - 86_400_000)
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '');
        const fallbackUrl = `${IESO_REPORTS_BASE}/RealtimeConstTotals/PUB_RealtimeConstTotals_${yesterday}.csv`;
        const fallback = await fetch(fallbackUrl, { signal: AbortSignal.timeout(30_000) });
        if (!fallback.ok) {
          warnings.push(`IESO: both ${csvUrl} and ${fallbackUrl} unavailable`);
          return {
            records: [],
            lineage: {
              connector_id: this.meta.id,
              run_id: runId,
              started_at: retrievedAt,
              status: 'failed',
              records_fetched: 0,
              records_failed: 0,
              source_url: csvUrl,
              source_updated_at: null,
              error_message: `HTTP ${resp.status}`,
              payload_hash: null,
            },
            warnings,
          };
        }
        const rawText = await fallback.text();
        const parsed = this.parseIesoCsv(rawText, yesterday, runId, fallbackUrl, retrievedAt);
        records.push(...parsed.records);
        warnings.push(...parsed.warnings);
      } else {
        const rawText = await resp.text();
        const parsed = this.parseIesoCsv(rawText, targetDate, runId, csvUrl, retrievedAt);
        records.push(...parsed.records);
        warnings.push(...parsed.warnings);
      }
    } catch (err) {
      warnings.push(`IESO fetch error: ${String(err)}`);
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
        source_url: csvUrl,
        source_updated_at: null,
        error_message: warnings.length > 0 ? warnings[0] : null,
        payload_hash: payloadHash,
      },
      warnings,
    };
  }

  private parseIesoCsv(
    rawText: string,
    dateStr: string,
    runId: string,
    sourceUrl: string,
    retrievedAt: string,
  ): { records: NormalizedRecord[]; warnings: string[] } {
    const records: NormalizedRecord[] = [];
    const warnings: string[] = [];

    // IESO CSV has metadata header rows before actual data
    const lines = rawText.split('\n').filter(Boolean);
    // Find the actual header row (contains 'Hour' or 'Interval')
    const headerIdx = lines.findIndex((l) => /hour|interval/i.test(l));
    if (headerIdx < 0) {
      warnings.push('IESO: could not find data header row');
      return { records, warnings };
    }

    const header = lines[headerIdx].split(',').map((h) => h.trim().replace(/"/g, ''));
    const hourIdx = header.findIndex((h) => /^hour$/i.test(h));

    // Remaining columns are fuel types
    const fuelCols = header
      .map((h, i) => ({ name: h, idx: i }))
      .filter((_, i) => i !== hourIdx && i > 0);

    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);

    for (const line of lines.slice(headerIdx + 1)) {
      const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''));
      const hour = parseInt(cols[hourIdx] ?? '0', 10);
      if (!Number.isInteger(hour) || hour < 1) continue;

      const ts = new Date(`${year}-${month}-${day}T${String(hour - 1).padStart(2, '0')}:00:00Z`);

      for (const fc of fuelCols) {
        const val = parseFloat(cols[fc.idx]);
        if (!Number.isFinite(val)) continue;
        records.push({
          metric: 'electricity_generation_mw',
          geography: 'ON',
          observed_at: ts.toISOString(),
          value: val,
          unit: 'MW',
          sector: 'electricity',
          fuel: fc.name.toLowerCase().replace(/\s+/g, '_'),
          technology: null,
          lineage_id: runId,
          source_doc_url: sourceUrl,
          retrieved_at: retrievedAt,
          is_projection: false,
        });
      }
    }

    return { records, warnings };
  }
}
