/**
 * B05 – CER (Canada Energy Regulator) Connector
 *
 * Fetches Canada's Energy Future projections and Open Government datasets.
 *
 * Sources:
 *   - CER Energy Futures 2026 CSV data
 *     https://www.cer-rec.gc.ca/en/data-analysis/canada-energy-future/2026/access-and-explore-energy-future-data.html
 *   - CER Open Government portal (search.open.canada.ca, owner=cer-rec)
 *
 * License: Open Government Licence – Canada
 */

import {
  BaseConnector,
  ConnectorMeta,
  DiscoverResult,
  FetchResult,
  NormalizedRecord,
} from './index.ts';

const CER_FUTURES_CSV =
  'https://www.cer-rec.gc.ca/open/energy/energyfutures2026/canada-energy-futures-2026-data.csv';
const CER_LANDING =
  'https://www.cer-rec.gc.ca/en/data-analysis/canada-energy-future/2026/access-and-explore-energy-future-data.html';

const CER_PROVINCE_MAP: Record<string, string> = {
  'British Columbia': 'BC',
  Alberta: 'AB',
  Saskatchewan: 'SK',
  Manitoba: 'MB',
  Ontario: 'ON',
  Quebec: 'QC',
  'New Brunswick': 'NB',
  'Nova Scotia': 'NS',
  'Prince Edward Island': 'PE',
  'Newfoundland and Labrador': 'NL',
  'Northwest Territories': 'NT',
  Yukon: 'YT',
  Nunavut: 'NU',
  Canada: 'CA',
};

export class CerConnector extends BaseConnector {
  readonly meta: ConnectorMeta = {
    id: 'cer-energy-futures',
    name: 'CER Energy Futures 2026',
    sourceUrl: CER_LANDING,
    publisher: 'Canada Energy Regulator',
    license:
      'Open Government Licence – Canada (https://open.canada.ca/en/open-government-licence-canada)',
    refreshCadenceHours: 8760, // annual release cycle
    jurisdictions: ['CA'],
    metricFamilies: [
      'electricity_generation',
      'primary_energy_demand',
      'ghg_emissions',
      'renewable_capacity',
      'natural_gas_demand',
      'oil_demand',
    ],
    requiresAuth: false,
    caveatNotes:
      'CER Energy Futures are long-range projections (not historical actuals). ' +
      'All records are is_projection=true. Reference scenario only in this connector.',
  };

  async discover(): Promise<DiscoverResult> {
    try {
      // HEAD request to check CSV availability
      const resp = await fetch(CER_FUTURES_CSV, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      });
      return {
        available: resp.ok,
        sourceLastUpdated: resp.headers.get('last-modified'),
        message: resp.ok ? 'CER CSV reachable' : `HTTP ${resp.status}`,
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
    let payloadHash: string | null = null;

    try {
      const resp = await fetch(CER_FUTURES_CSV, { signal: AbortSignal.timeout(60_000) });
      if (!resp.ok) {
        return {
          records: [],
          lineage: {
            connector_id: this.meta.id,
            run_id: runId,
            started_at: retrievedAt,
            status: 'failed',
            records_fetched: 0,
            records_failed: 0,
            source_url: CER_FUTURES_CSV,
            source_updated_at: resp.headers.get('last-modified'),
            error_message: `HTTP ${resp.status}`,
            payload_hash: null,
          },
          warnings,
        };
      }

      const rawText = await resp.text();
      payloadHash = await this.sha256hex(rawText);
      const lines = rawText.split('\n').filter(Boolean);
      const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

      // CER CSV columns (typical): Year,Province,Scenario,Sector,Fuel,Technology,Unit,Value
      const yearIdx = header.findIndex((h) => /^year$/i.test(h));
      const provIdx = header.findIndex((h) => /province|geography|region/i.test(h));
      const valueIdx = header.findIndex((h) => /^value$/i.test(h));
      const unitIdx = header.findIndex((h) => /^unit/i.test(h));
      const sectorIdx = header.findIndex((h) => /^sector/i.test(h));
      const fuelIdx = header.findIndex((h) => /^fuel/i.test(h));
      const metricIdx = header.findIndex((h) => /metric|variable|indicator/i.test(h));
      const scenIdx = header.findIndex((h) => /scenario/i.test(h));

      // Filter to Reference scenario only (avoids inflating storage)
      const targetScenario = params?.scenario ?? 'Reference';

      for (const line of lines.slice(1)) {
        const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''));
        const scenario = scenIdx >= 0 ? cols[scenIdx] : 'Reference';
        if (scenario !== targetScenario) continue;

        const year = cols[yearIdx];
        const prov = CER_PROVINCE_MAP[cols[provIdx]] ?? cols[provIdx];
        const val = parseFloat(cols[valueIdx]);
        const unit = unitIdx >= 0 ? cols[unitIdx] : 'PJ';
        const sector = sectorIdx >= 0 ? cols[sectorIdx] : null;
        const fuel = fuelIdx >= 0 ? cols[fuelIdx] : null;
        const metric = metricIdx >= 0 ? cols[metricIdx] : 'primary_energy_demand_pj';

        if (!Number.isFinite(val)) continue;
        if (!year || !prov) continue;

        records.push({
          metric: metric.toLowerCase().replace(/\s+/g, '_'),
          geography: prov,
          observed_at: `${year}-01-01T00:00:00Z`,
          value: val,
          unit,
          sector: sector ?? null,
          fuel: fuel ?? null,
          technology: null,
          lineage_id: runId,
          source_doc_url: CER_FUTURES_CSV,
          retrieved_at: retrievedAt,
          is_projection: true, // CER Futures = projections
        });
      }
    } catch (err) {
      warnings.push(`CER fetch error: ${String(err)}`);
    }

    return {
      records,
      lineage: {
        connector_id: this.meta.id,
        run_id: runId,
        started_at: retrievedAt,
        status: records.length > 0 ? 'success' : warnings.length > 0 ? 'failed' : 'success',
        records_fetched: records.length,
        records_failed: 0,
        source_url: CER_FUTURES_CSV,
        source_updated_at: null,
        error_message: warnings.length > 0 ? warnings[0] : null,
        payload_hash: payloadHash,
      },
      warnings,
    };
  }
}
