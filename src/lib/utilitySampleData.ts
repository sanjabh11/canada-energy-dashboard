// ============================================================================
// Utility Sample Data — Synthetic load profile generators
//
// Provides synthetic utility load data for starter workflows, public system
// samples, and monthly planning inputs. Used for proof-of-workflow demos
// and as fallback data when buyer-supplied data is not yet available.
// ============================================================================

import type {
  UtilityHistoricalLoadRow,
  UtilityInputGranularity,
  UtilityJurisdiction,
  PublicUtilitySampleManifest,
} from './types/utilityForecasting';
import {
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  PUBLIC_SOURCE_TRANSFORM_VERSION,
} from './utilityCsvParser';
import { utilityRowsToCsv } from './utilityCsvSerializer';

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function buildUtilityStarterCsv(
  jurisdiction: UtilityJurisdiction,
  granularity: UtilityInputGranularity = 'hourly',
): string {
  return utilityRowsToCsv(generateUtilityLoadSampleRows(jurisdiction, granularity));
}

export function buildOntarioPublicUtilitySampleCsv(): string {
  return utilityRowsToCsv(generateOntarioPublicUtilitySampleRows());
}

export function buildOntarioPublicUtilitySampleManifestMarkdown(
  manifest: PublicUtilitySampleManifest = ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
): string {
  return [
    `# ${manifest.label}`,
    '',
    `- Manifest ID: ${manifest.id}`,
    `- Jurisdiction: ${manifest.jurisdiction}`,
    `- Source URL: ${manifest.source_url}`,
    `- Source document: ${manifest.source_document}`,
    `- Generated date: ${manifest.generated_date}`,
    `- Sample scope: ${manifest.sample_scope}`,
    `- Source file: ${manifest.source_file}`,
    `- Transform version: ${PUBLIC_SOURCE_TRANSFORM_VERSION}`,
    `- Derivation note: ${manifest.source_derivation_note}`,
    `- Disclaimer: ${manifest.disclaimer}`,
  ].join('\n');
}

export function generateUtilityLoadSampleRows(
  jurisdiction: UtilityJurisdiction,
  granularity: UtilityInputGranularity = 'hourly',
): UtilityHistoricalLoadRow[] {
  if (granularity === 'monthly') {
    return generateMonthlySampleRows(jurisdiction);
  }

  const feederProfiles = jurisdiction === 'Ontario'
    ? [
        { geography_id: 'ON-FEEDER-1', customer_class: 'residential', share: 0.34, temperatureBias: 1.15, customerCount: 5100 },
        { geography_id: 'ON-FEEDER-2', customer_class: 'commercial', share: 0.26, temperatureBias: 0.85, customerCount: 1850 },
        { geography_id: 'ON-FEEDER-3', customer_class: 'industrial', share: 0.22, temperatureBias: 0.55, customerCount: 240 },
        { geography_id: 'ON-FEEDER-4', customer_class: 'mixed', share: 0.18, temperatureBias: 0.90, customerCount: 1320 },
      ]
    : [
        { geography_id: 'AB-FEEDER-1', customer_class: 'residential', share: 0.29, temperatureBias: 1.25, customerCount: 4800 },
        { geography_id: 'AB-FEEDER-2', customer_class: 'commercial', share: 0.23, temperatureBias: 0.92, customerCount: 1710 },
        { geography_id: 'AB-FEEDER-3', customer_class: 'industrial', share: 0.31, temperatureBias: 0.65, customerCount: 190 },
        { geography_id: 'AB-FEEDER-4', customer_class: 'mixed', share: 0.17, temperatureBias: 0.95, customerCount: 1180 },
      ];

  const rows: UtilityHistoricalLoadRow[] = [];
  const start = Date.UTC(2025, 0, 1, 0, 0, 0);
  const hours = 24 * 21;
  const baseMw = jurisdiction === 'Ontario' ? 82 : 74;

  for (let hourIndex = 0; hourIndex < hours; hourIndex += 1) {
    const timestamp = new Date(start + hourIndex * 3600_000);
    const month = timestamp.getUTCMonth();
    const hour = timestamp.getUTCHours();
    const weekday = timestamp.getUTCDay();

    const temperature = buildSampleTemperature(jurisdiction, month, hourIndex);
    const seasonalMultiplier = 1 + Math.sin((month / 12) * Math.PI * 2) * (jurisdiction === 'Ontario' ? 0.05 : 0.04);
    const dailyProfile = 0.82
      + Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI) * 0.28)
      + Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI) * 0.18);
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.91 : 1;
    const weatherSensitivity = jurisdiction === 'Ontario'
      ? Math.max(0, 18 - temperature) * 0.55 + Math.max(0, temperature - 24) * 0.25
      : Math.max(0, 16 - temperature) * 0.48 + Math.max(0, temperature - 25) * 0.22;
    const totalDemand = baseMw * seasonalMultiplier * dailyProfile * weekendFactor + weatherSensitivity;

    for (const feeder of feederProfiles) {
      const feederDemand = totalDemand * feeder.share * (1 + weatherSensitivity * 0.002 * feeder.temperatureBias);
      const grossLoad = feederDemand * 1.03;
      const netLoad = grossLoad - (jurisdiction === 'Ontario' ? 0.6 : 0.8) * Math.max(0, Math.sin(((hour - 10) / 24) * Math.PI));

      rows.push({
        timestamp: timestamp.toISOString(),
        geography_level: 'feeder',
        geography_id: feeder.geography_id,
        customer_class: feeder.customer_class,
        demand_mw: round(feederDemand, 3),
        weather_zone: jurisdiction === 'Ontario' ? 'south' : 'central',
        temperature_c: round(temperature, 2),
        net_load_mw: round(netLoad, 3),
        gross_load_mw: round(grossLoad, 3),
        customer_count: feeder.customerCount,
        source_system: 'starter_dataset',
        feeder_id: feeder.geography_id,
        quality_flags: [],
      });
    }
  }

  return rows;
}

export function generateOntarioPublicUtilitySampleRows(): UtilityHistoricalLoadRow[] {
  const zoneProfiles = [
    { geography_id: 'ON-PUBLIC-SYSTEM-GTA', weather_zone: 'gta', share: 0.42, customerCount: 2_280_000, commercialBias: 1.08 },
    { geography_id: 'ON-PUBLIC-SYSTEM-SOUTHWEST', weather_zone: 'southwest', share: 0.24, customerCount: 1_160_000, commercialBias: 0.98 },
    { geography_id: 'ON-PUBLIC-SYSTEM-EAST', weather_zone: 'east', share: 0.20, customerCount: 920_000, commercialBias: 0.94 },
    { geography_id: 'ON-PUBLIC-SYSTEM-NORTH', weather_zone: 'north', share: 0.14, customerCount: 360_000, commercialBias: 0.88 },
  ];
  const rows: UtilityHistoricalLoadRow[] = [];
  const start = Date.UTC(2025, 0, 6, 0, 0, 0);
  const hours = 24 * 28;

  for (let hourIndex = 0; hourIndex < hours; hourIndex += 1) {
    const timestamp = new Date(start + hourIndex * 3600_000);
    const hour = timestamp.getUTCHours();
    const day = timestamp.getUTCDay();
    const temperature = 1.5
      + Math.sin((hourIndex / hours) * Math.PI * 2) * 4.8
      - Math.max(0, Math.sin(((hourIndex - 80) / hours) * Math.PI * 2)) * 3.2
      + Math.sin((hour / 24) * Math.PI * 2) * 1.6;
    const morningRamp = Math.max(0, Math.sin(((hour - 5) / 24) * Math.PI)) * 0.12;
    const eveningRamp = Math.max(0, Math.sin(((hour - 16) / 24) * Math.PI)) * 0.22;
    const businessDay = day === 0 || day === 6 ? 0.91 : 1;
    const coldLoad = Math.max(0, 14 - temperature) * 285;
    const publicSystemDemandMw = 14_900 * businessDay * (0.93 + morningRamp + eveningRamp) + coldLoad;

    for (const zone of zoneProfiles) {
      const zoneDemand = publicSystemDemandMw * zone.share * zone.commercialBias;
      const grossLoad = zoneDemand * 1.025;
      const behindMeterOffset = Math.max(0, Math.sin(((hour - 9) / 24) * Math.PI)) * zone.share * 180;

      rows.push({
        timestamp: timestamp.toISOString(),
        geography_level: 'system',
        geography_id: zone.geography_id,
        customer_class: 'mixed',
        demand_mw: round(zoneDemand, 3),
        weather_zone: zone.weather_zone,
        temperature_c: round(temperature, 2),
        net_load_mw: round(grossLoad - behindMeterOffset, 3),
        gross_load_mw: round(grossLoad, 3),
        customer_count: zone.customerCount,
        source_system: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id,
        quality_flags: [],
      });
    }
  }

  return rows;
}

function generateMonthlySampleRows(jurisdiction: UtilityJurisdiction): UtilityHistoricalLoadRow[] {
  const rows: UtilityHistoricalLoadRow[] = [];
  const feeders = jurisdiction === 'Ontario'
    ? [
        { geography_id: 'ON-SUB-1', customer_class: 'residential', share: 0.4, customerCount: 5200 },
        { geography_id: 'ON-SUB-2', customer_class: 'commercial', share: 0.35, customerCount: 1800 },
        { geography_id: 'ON-SUB-3', customer_class: 'industrial', share: 0.25, customerCount: 230 },
      ]
    : [
        { geography_id: 'AB-SUB-1', customer_class: 'residential', share: 0.36, customerCount: 4700 },
        { geography_id: 'AB-SUB-2', customer_class: 'commercial', share: 0.28, customerCount: 1650 },
        { geography_id: 'AB-SUB-3', customer_class: 'industrial', share: 0.36, customerCount: 195 },
      ];
  const start = Date.UTC(2024, 0, 1, 0, 0, 0);
  const baseDemand = jurisdiction === 'Ontario' ? 79 : 71;

  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const timestamp = new Date(Date.UTC(2024 + Math.floor(monthIndex / 12), monthIndex % 12, 1)).toISOString();
    const seasonal = 1 + Math.sin(((monthIndex % 12) / 12) * Math.PI * 2) * 0.07;
    const trend = 1 + monthIndex * 0.006;

    for (const feeder of feeders) {
      rows.push({
        timestamp,
        geography_level: 'substation',
        geography_id: feeder.geography_id,
        customer_class: feeder.customer_class,
        demand_mw: round(baseDemand * seasonal * trend * feeder.share, 3),
        weather_zone: jurisdiction === 'Ontario' ? 'south' : 'central',
        temperature_c: null,
        net_load_mw: null,
        gross_load_mw: null,
        customer_count: feeder.customerCount,
        source_system: 'starter_dataset',
        substation_id: feeder.geography_id,
        quality_flags: [],
      });
    }
  }

  return rows;
}

function buildSampleTemperature(
  jurisdiction: UtilityJurisdiction,
  month: number,
  hourIndex: number,
): number {
  const seasonalBase = jurisdiction === 'Ontario'
    ? [-6, -4, 1, 8, 15, 20, 24, 23, 18, 11, 4, -2][month] ?? 10
    : [-8, -6, 0, 7, 13, 18, 22, 21, 16, 9, 1, -5][month] ?? 9;
  const synopticWave = Math.sin(hourIndex / 36) * 3.2;
  const dailyWave = Math.sin((hourIndex % 24) / 24 * Math.PI * 2) * 4.5;
  return seasonalBase + synopticWave + dailyWave;
}
