/**
 * B05 – ECCC NPRI Connector
 *
 * Fetches facility-level pollution/emissions data from the
 * National Pollutant Release Inventory (NPRI) open data portal.
 *
 * Source: https://pollution-waste.canada.ca/national-release-inventory/
 * NPRI Open Data: https://open.canada.ca/data/en/dataset/1fb7d8d4-7713-4ec6-b957-4a882a84fed3
 * License: Open Government Licence – Canada
 */

import {
  BaseConnector,
  ConnectorMeta,
  DiscoverResult,
  FetchResult,
  NormalizedRecord,
} from './index.ts';

const NPRI_API_BASE =
  'https://services.arcgis.com/ckB9XIVP7WC6p0Ks/arcgis/rest/services/NPRI_Releases_Public/FeatureServer/0/query';
const NPRI_LANDING = 'https://pollution-waste.canada.ca/national-release-inventory/';

export class EcccNpriConnector extends BaseConnector {
  readonly meta: ConnectorMeta = {
    id: 'eccc-npri',
    name: 'ECCC National Pollutant Release Inventory',
    sourceUrl: NPRI_LANDING,
    publisher: 'Environment and Climate Change Canada',
    license:
      'Open Government Licence – Canada (https://open.canada.ca/en/open-government-licence-canada)',
    refreshCadenceHours: 8760, // annual
    jurisdictions: ['CA'],
    metricFamilies: ['facility_ghg_releases_tco2e', 'facility_air_pollutant_releases'],
    requiresAuth: false,
    caveatNotes:
      'NPRI covers facilities above reporting thresholds. ' +
      'Agriculture, residential, and small-emitter sectors may be underrepresented.',
  };

  async discover(): Promise<DiscoverResult> {
    try {
      const url = `${NPRI_API_BASE}?where=1%3D1&returnCountOnly=true&f=json`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!resp.ok)
        return { available: false, sourceLastUpdated: null, message: `HTTP ${resp.status}` };
      const json = (await resp.json()) as { count?: number };
      return {
        available: true,
        sourceLastUpdated: null,
        estimatedRecords: json.count,
        message: `NPRI ArcGIS reachable (${json.count ?? 'unknown'} records)`,
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

    // Limit to energy sector GHG (CO2 equivalent) releases
    const reportYear = params?.year ?? new Date().getFullYear() - 2;
    const where = encodeURIComponent(
      `ReportYear=${reportYear} AND SubstanceName='Total GHG (CO2 equivalent)'`,
    );
    const url = `${NPRI_API_BASE}?where=${where}&outFields=FacilityName,Province,Latitude,Longitude,TotalReleasesToAir,ReportYear,SubstanceName,ReleaseUnits&returnGeometry=false&resultRecordCount=2000&f=json`;

    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        warnings.push(`NPRI HTTP ${resp.status}`);
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

      const json = (await resp.json()) as {
        features?: Array<{ attributes: Record<string, unknown> }>;
      };
      const payloadHash = await this.sha256hex(JSON.stringify(json));

      for (const feature of json.features ?? []) {
        const attrs = feature.attributes;
        const value = parseFloat(String(attrs['TotalReleasesToAir'] ?? ''));
        const province = String(attrs['Province'] ?? 'CA');
        const year = String(attrs['ReportYear'] ?? reportYear);
        const unit = String(attrs['ReleaseUnits'] ?? 'tonnes');

        if (!Number.isFinite(value)) continue;

        records.push({
          metric: 'facility_ghg_releases_tco2e',
          geography: province.toUpperCase().trim(),
          observed_at: `${year}-01-01T00:00:00Z`,
          value,
          unit: unit.toLowerCase().includes('tonne') ? 'tCO2e' : unit,
          sector: 'industrial',
          fuel: null,
          technology: null,
          lineage_id: runId,
          source_doc_url: url,
          retrieved_at: retrievedAt,
          is_projection: false,
        });
      }

      return {
        records,
        lineage: {
          connector_id: this.meta.id,
          run_id: runId,
          started_at: retrievedAt,
          status: 'success',
          records_fetched: records.length,
          records_failed: 0,
          source_url: url,
          source_updated_at: null,
          error_message: null,
          payload_hash: payloadHash,
        },
        warnings,
      };
    } catch (err) {
      warnings.push(`NPRI fetch error: ${String(err)}`);
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
          error_message: String(err),
          payload_hash: null,
        },
        warnings,
      };
    }
  }
}
