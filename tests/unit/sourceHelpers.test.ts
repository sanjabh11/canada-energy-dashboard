import { describe, expect, it } from 'vitest';
import { getLatestTierMarketRate, getActiveRetailerOffers } from '../../src/lib/ratesSource';
import { getGasBasisTrainingWindow, getMarketSpikeTrainingWindow } from '../../src/lib/timeseriesSource';
import { selectLatestRetainedFeatures } from '../../src/lib/featureRankingsSource';

describe('source helpers', () => {
  it('selects the freshest tier market rate', () => {
    const latest = getLatestTierMarketRate([
      {
        source_name: 'NGX',
        observed_at: '2026-04-01T00:00:00.000Z',
        market_credit_price_cad_per_tonne: 24,
      },
      {
        source_name: 'NGX',
        observed_at: '2026-04-12T00:00:00.000Z',
        market_credit_price_cad_per_tonne: 26,
      },
    ]);

    expect(latest?.market_credit_price_cad_per_tonne).toBe(26);
  });

  it('deduplicates retailer offers by retailer key and keeps the freshest active row', () => {
    const offers = getActiveRetailerOffers([
      {
        source_name: 'UCA',
        observed_at: '2026-04-01T00:00:00.000Z',
        retailer_key: 'direct',
        retailer_name: 'Direct Energy',
        fixed_rate_cad_per_kwh: 0.11,
        term_months: 12,
        active: true,
      },
      {
        source_name: 'UCA',
        observed_at: '2026-04-05T00:00:00.000Z',
        retailer_key: 'direct',
        retailer_name: 'Direct Energy',
        fixed_rate_cad_per_kwh: 0.09,
        term_months: 24,
        active: true,
      },
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0].fixed_rate_cad_per_kwh).toBe(0.09);
  });

  it('returns the requested training windows for market spike and gas basis rows', () => {
    const spikeRows = getMarketSpikeTrainingWindow([
      {
        source_name: 'AESO',
        source_url: 'https://aeso.ca',
        observed_at: '2024-02-01T00:00:00.000Z',
        province: 'AB',
        pool_price_cad_per_mwh: 100,
        demand_mw: 10000,
        reserve_margin_percent: 8,
        wind_generation_mw: 600,
        temperature_c: 0,
      },
      {
        source_name: 'AESO',
        source_url: 'https://aeso.ca',
        observed_at: '2026-01-01T00:00:00.000Z',
        province: 'AB',
        pool_price_cad_per_mwh: 200,
        demand_mw: 11000,
        reserve_margin_percent: 4,
        wind_generation_mw: 200,
        temperature_c: -20,
      },
    ], 730);

    const gasRows = getGasBasisTrainingWindow([
      {
        source_name: 'NGX',
        source_url: 'https://ngx.com',
        observed_at: '2024-02-01T00:00:00.000Z',
        province: 'AB',
        aeco_cad_per_gj: 1.5,
        henry_hub_cad_per_gj: 3,
        pipeline_curtailment_pct: 5,
        storage_deficit_pct: 8,
        temperature_c: -5,
        basis_lag1: 1.3,
        basis_lag7: 1.2,
        spread_cad_per_gj: 1.7,
      },
      {
        source_name: 'NGX',
        source_url: 'https://ngx.com',
        observed_at: '2026-01-01T00:00:00.000Z',
        province: 'AB',
        aeco_cad_per_gj: 1.4,
        henry_hub_cad_per_gj: 3.1,
        pipeline_curtailment_pct: 4,
        storage_deficit_pct: 7,
        temperature_c: -10,
        basis_lag1: 1.4,
        basis_lag7: 1.3,
        spread_cad_per_gj: 1.8,
      },
    ], 730);

    expect(spikeRows).toHaveLength(2);
    expect(gasRows).toHaveLength(2);
  });

  it('reads the latest retained feature rankings for a model key', () => {
    const selected = selectLatestRetainedFeatures([
      {
        model_key: 'svm-rfe-adapter-v1',
        feature_name: 'a',
        rank: 2,
        score: 0.4,
        retained: true,
        calculated_at: '2026-04-01T00:00:00.000Z',
      },
      {
        model_key: 'svm-rfe-adapter-v1',
        feature_name: 'b',
        rank: 1,
        score: 0.8,
        retained: true,
        calculated_at: '2026-04-01T00:00:00.000Z',
      },
      {
        model_key: 'svm-rfe-adapter-v1',
        feature_name: 'c',
        rank: 1,
        score: 0.7,
        retained: true,
        calculated_at: '2026-04-12T00:00:00.000Z',
      },
    ], 'svm-rfe-adapter-v1');

    expect(selected.retainedFeatures).toEqual(['c']);
    expect(selected.calculatedAt).toBe('2026-04-12T00:00:00.000Z');
  });
});
