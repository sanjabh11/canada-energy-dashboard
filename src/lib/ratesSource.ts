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
  // Garbage dates parse to NaN and would corrupt the sort; treat them as
  // epoch 0 so malformed rows always lose to any real observed_at.
  const leftTime = new Date(String(left ?? '')).getTime();
  const rightTime = new Date(String(right ?? '')).getTime();
  return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
}

function dedupeByRetailerKey(rows: RetailerRateOfferRow[]): RetailerRateOfferRow[] {
  const seen = new Set<string>();
  const result: RetailerRateOfferRow[] = [];
  for (const row of [...rows].sort((left, right) =>
    compareObservedAtDesc(left.observed_at, right.observed_at),
  )) {
    if (!row.active) continue;
    if (seen.has(row.retailer_key)) continue;
    seen.add(row.retailer_key);
    result.push(row);
  }
  return result;
}

export function getLatestTierMarketRate(rows: TierMarketRateRow[]): TierMarketRateSelection {
  return (
    [...rows]
      // A row without a positive finite credit price is not a usable quote —
      // exclude it so it cannot win "latest" and leak into the UI.
      .filter((row) => {
        const price = Number(row.market_credit_price_cad_per_tonne);
        return Number.isFinite(price) && price > 0;
      })
      .sort((left, right) => compareObservedAtDesc(left.observed_at, right.observed_at))[0] ?? null
  );
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
