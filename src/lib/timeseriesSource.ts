import { supabase } from './supabaseClient';

export interface MarketSpikeSeriesRow {
  id?: string;
  source_name: string;
  source_url?: string;
  observed_at: string;
  province?: string;
  pool_price_cad_per_mwh: number;
  demand_mw: number;
  reserve_margin_percent: number;
  wind_generation_mw: number;
  temperature_c: number;
  spike_label?: boolean | null;
  metadata?: Record<string, unknown>;
}

export interface GasBasisSeriesRow {
  id?: string;
  source_name: string;
  source_url?: string;
  observed_at: string;
  province?: string;
  aeco_cad_per_gj: number;
  henry_hub_cad_per_gj: number;
  pipeline_curtailment_pct: number;
  storage_deficit_pct: number;
  temperature_c: number;
  basis_lag1: number;
  basis_lag7: number;
  spread_cad_per_gj?: number | null;
  metadata?: Record<string, unknown>;
}

export interface MarketSpikeTrainingRow {
  observed_at: string;
  province: string;
  poolPriceCadPerMwh: number;
  demandMw: number;
  reserveMarginPercent: number;
  windGenerationMw: number;
  temperatureC: number;
  spike: number;
  sourceName: string;
}

export interface GasBasisTrainingRow {
  observed_at: string;
  province: string;
  aecoCadPerGj: number;
  henryHubCadPerGj: number;
  pipelineCurtailmentPct: number;
  storageDeficitPct: number;
  temperatureC: number;
  basisLag1: number;
  basisLag7: number;
  spreadCadPerGj: number;
  sourceName: string;
}

export function getMarketSpikeTrainingWindow(rows: MarketSpikeSeriesRow[], days = 730): MarketSpikeSeriesRow[] {
  if (days <= 0) return [];
  const ordered = [...rows].sort((left, right) => new Date(left.observed_at).getTime() - new Date(right.observed_at).getTime());
  const latest = ordered.at(-1)?.observed_at;
  if (!latest) return [];
  const cutoff = new Date(new Date(latest).getTime() - days * 24 * 60 * 60 * 1000);
  return ordered.filter((row) => new Date(row.observed_at).getTime() >= cutoff.getTime());
}

export function getGasBasisTrainingWindow(rows: GasBasisSeriesRow[], days = 730): GasBasisSeriesRow[] {
  if (days <= 0) return [];
  const ordered = [...rows].sort((left, right) => new Date(left.observed_at).getTime() - new Date(right.observed_at).getTime());
  const latest = ordered.at(-1)?.observed_at;
  if (!latest) return [];
  const cutoff = new Date(new Date(latest).getTime() - days * 24 * 60 * 60 * 1000);
  return ordered.filter((row) => new Date(row.observed_at).getTime() >= cutoff.getTime());
}

export function buildMarketSpikeTrainingRows(rows: MarketSpikeSeriesRow[]): MarketSpikeTrainingRow[] {
  return rows.map((row) => {
    const spike = row.spike_label ?? (
      row.pool_price_cad_per_mwh >= 1000
      || row.reserve_margin_percent <= 5
      || (row.demand_mw >= 11000 && row.wind_generation_mw <= 250)
      || row.temperature_c <= -25
      || row.temperature_c >= 30
    );

    return {
      observed_at: row.observed_at,
      province: (row.province ?? 'AB').toUpperCase(),
      poolPriceCadPerMwh: Number(row.pool_price_cad_per_mwh),
      demandMw: Number(row.demand_mw),
      reserveMarginPercent: Number(row.reserve_margin_percent),
      windGenerationMw: Number(row.wind_generation_mw),
      temperatureC: Number(row.temperature_c),
      spike: spike ? 1 : 0,
      sourceName: row.source_name,
    };
  });
}

export function buildGasBasisTrainingRows(rows: GasBasisSeriesRow[]): GasBasisTrainingRow[] {
  return rows.map((row) => {
    const spreadCadPerGj = Number.isFinite(Number(row.spread_cad_per_gj))
      ? Number(row.spread_cad_per_gj)
      : (
        Number(row.henry_hub_cad_per_gj) - Number(row.aeco_cad_per_gj)
        + (Number(row.pipeline_curtailment_pct) * 0.015)
        + (Number(row.storage_deficit_pct) * 0.02)
        + (Math.max(0, -Number(row.temperature_c)) * 0.004)
        + (Number(row.basis_lag1) * 0.22)
        + (Number(row.basis_lag7) * 0.11)
      );

    return {
      observed_at: row.observed_at,
      province: (row.province ?? 'AB').toUpperCase(),
      aecoCadPerGj: Number(row.aeco_cad_per_gj),
      henryHubCadPerGj: Number(row.henry_hub_cad_per_gj),
      pipelineCurtailmentPct: Number(row.pipeline_curtailment_pct),
      storageDeficitPct: Number(row.storage_deficit_pct),
      temperatureC: Number(row.temperature_c),
      basisLag1: Number(row.basis_lag1),
      basisLag7: Number(row.basis_lag7),
      spreadCadPerGj: Number(spreadCadPerGj),
      sourceName: row.source_name,
    };
  });
}

export async function fetchMarketSpikeTrainingWindow(days = 730): Promise<MarketSpikeTrainingRow[]> {
  try {
    const { data, error } = await supabase
      .from('market_spike_series')
      .select('*')
      .order('observed_at', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return buildMarketSpikeTrainingRows(getMarketSpikeTrainingWindow(data as MarketSpikeSeriesRow[], days));
  } catch {
    return [];
  }
}

export async function fetchGasBasisTrainingWindow(days = 730): Promise<GasBasisTrainingRow[]> {
  try {
    const { data, error } = await supabase
      .from('gas_basis_series')
      .select('*')
      .order('observed_at', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return buildGasBasisTrainingRows(getGasBasisTrainingWindow(data as GasBasisSeriesRow[], days));
  } catch {
    return [];
  }
}

