import { describe, expect, it } from 'vitest';
import {
  analyzeShadowBilling,
  buildShadowBillingDeltaCsv,
  buildStarterShadowBills,
  parseShadowBillingCsv,
} from '../../src/lib/shadowBillingSupport';
import {
  buildShadowBillingFieldMapMarkdown,
  buildShadowBillingMemoDescriptor,
  buildShadowBillingProofBundle,
} from '../../src/lib/shadowBillingProofPack';

describe('shadowBilling proof workflow', () => {
  it('parses uploaded invoices and builds a bounded proof pack', () => {
    const uploaded = parseShadowBillingCsv([
      'billing_period,consumption_kwh,actual_energy_rate_cents_per_kwh,actual_supply_cost_cad,fixed_charge_cad,retailer_name',
      '2026-01,1200,15.4,184.80,22.00,Owner supplied retailer',
    ].join('\n'));

    const summary = analyzeShadowBilling(uploaded);
    const bundle = buildShadowBillingProofBundle('uploaded_bills');
    const descriptor = buildShadowBillingMemoDescriptor(summary, 'uploaded_bills');
    const csv = buildShadowBillingDeltaCsv(summary);

    expect(bundle.artifacts[0].claimLabel).toBe('owner-supplied');
    expect(bundle.artifacts[0].isFallback).toBe(false);
    expect(bundle.artifacts.some((artifact) => artifact.id === 'shadow-billing-field-map')).toBe(true);
    expect(buildShadowBillingFieldMapMarkdown()).toContain('Rider exclusion');
    expect(descriptor.sections[1].body).toContain('This route compares energy supply charges first, because rider-level bill reconstruction is not universal across municipal and retailer invoices.');
    expect(descriptor.sections[1].body).toContain('Rider exclusions, mapping assumptions, and approval notes must be kept with the monthly delta CSV.');
    expect(csv).toContain('delta_vs_rolr_cad');
  });

  it('keeps the starter comparison advisory', () => {
    const summary = analyzeShadowBilling(buildStarterShadowBills());
    const bundle = buildShadowBillingProofBundle('starter_bills');

    expect(summary.rows).toHaveLength(12);
    expect(bundle.artifacts[0].claimLabel).toBe('advisory');
    expect(bundle.artifacts[0].isFallback).toBe(true);
  });
});
