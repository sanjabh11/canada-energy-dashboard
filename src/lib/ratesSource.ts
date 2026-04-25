import { supabase } from './supabaseClient';

export interface TierMarketRateRow {
  id?: string;
  source_name: string;
  source_url?: string;
  observed_at: string;
  market_credit_price_cad_per_tonne: number;
  fund_price_cad_per_tonne?: number;
  claim_label?: 'estimated' | 'advisory' | 'validated';
  quality_status?: string;
  metadata?: Record<string, unknown>;
}

export interface RetailerRateOfferRow {
  id?: string;
  source_name: string;
  source_url?: string;
  observed_at: string;
  retailer_key: string;
  retailer_name: string;
  province?: string;
  fixed_rate_cad_per_kwh: number;
  term_months: number;
  cancellation_fee_cad?: number;
  green_option?: boolean;
  promo_text?: string | null;
  active?: boolean;
  claim_label?: 'estimated' | 'advisory' | 'validated';
  metadata?: Record<string, unknown>;
}

export type TierMarketRateSelection = TierMarketRateRow | null;
export type RetailerRateOfferSelection = RetailerRateOfferRow[];

function compareObservedAtDesc(left?: string, right?: string): number {
  return new Date(String(right ?? '')).getTime() - new Date(String(left ?? '')).getTime();
}

function dedupeByRetailerKey(rows: RetailerRateOfferRow[]): RetailerRateOfferRow[] {
  const seen = new Set<string>();
  const result: RetailerRateOfferRow[] = [];
  for (const row of [...rows].sort((left, right) => compareObservedAtDesc(left.observed_at, right.observed_at))) {
    if (!row.active) continue;
    if (seen.has(row.retailer_key)) continue;
    seen.add(row.retailer_key);
    result.push(row);
  }
  return result;
}

export function getLatestTierMarketRate(rows: TierMarketRateRow[]): TierMarketRateSelection {
  return [...rows]
    .sort((left, right) => compareObservedAtDesc(left.observed_at, right.observed_at))
    [0] ?? null;
}

export function getActiveRetailerOffers(rows: RetailerRateOfferRow[]): RetailerRateOfferSelection {
  return dedupeByRetailerKey(rows);
}

export async function fetchLatestTierMarketRate(): Promise<TierMarketRateSelection> {
  try {
    const { data, error } = await supabase
      .from('tier_market_rates')
      .select('*')
      .order('observed_at', { ascending: false })
      .limit(10);

    if (error || !Array.isArray(data)) return null;
    return getLatestTierMarketRate(data as TierMarketRateRow[]);
  } catch {
    return null;
  }
}

export async function fetchActiveRetailerOffers(): Promise<RetailerRateOfferSelection> {
  try {
    const { data, error } = await supabase
      .from('retailer_rate_offers')
      .select('*')
      .eq('active', true)
      .order('observed_at', { ascending: false })
      .limit(200);

    if (error || !Array.isArray(data)) return [];
    return getActiveRetailerOffers(data as RetailerRateOfferRow[]);
  } catch {
    return [];
  }
}

