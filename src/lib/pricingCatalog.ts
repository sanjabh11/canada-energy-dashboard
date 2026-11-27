export type DirectPlanCode =
  'free' | 'consumer_watchdog' | 'professional' | 'industrial_tier' | 'municipal' | 'sovereign';

export type WhopPlanCode = 'whop_basic' | 'whop_pro' | 'whop_team';

export type AlbertaPilotSkuCode =
  'municipal_waste_pilot' | 'gst_planning_estimate' | 'consultant_white_label';

export interface AlbertaPilotSku {
  code: AlbertaPilotSkuCode;
  label: string;
  priceCad: number | { min: number; max: number };
  interval: 'one_time' | 'month';
  status: 'hypothesis_non_validated';
  procurementNote: string;
}

export interface PlanPrice {
  code: DirectPlanCode | WhopPlanCode;
  price: number;
  currency: 'USD';
  interval: 'month' | 'year' | 'one_time' | 'forever';
}

/**
 * Additive CAD hypothesis catalog for the product-value sprint. These entries
 * are not checkout prices, procurement thresholds, or buyer-validated offers.
 * Keep them separate from the USD/Whop plan catalog so existing entitlements
 * and currency tests cannot silently change.
 */
export const ALBERTA_PILOT_SKUS_CAD: Record<AlbertaPilotSkuCode, AlbertaPilotSku> = {
  municipal_waste_pilot: {
    code: 'municipal_waste_pilot',
    label: 'Municipal / waste utility proof pilot',
    priceCad: 2850,
    interval: 'one_time',
    status: 'hypothesis_non_validated',
    procurementNote: 'Entity-specific procurement review required; no universal threshold implied.',
  },
  gst_planning_estimate: {
    code: 'gst_planning_estimate',
    label: 'GST planning estimate for municipal / waste pilot',
    priceCad: 2992.5,
    interval: 'one_time',
    status: 'hypothesis_non_validated',
    procurementNote:
      'Illustrative tax planning only; confirm treatment with the purchasing entity.',
  },
  consultant_white_label: {
    code: 'consultant_white_label',
    label: 'Consultant white-label utility proof pack',
    priceCad: { min: 299, max: 500 },
    interval: 'month',
    status: 'hypothesis_non_validated',
    procurementNote: 'Entity-specific scope, terms, and procurement review required.',
  },
};

export function formatCadHypothesis(sku: AlbertaPilotSku): string {
  if (typeof sku.priceCad === 'number') {
    return `CAD ${sku.priceCad.toLocaleString('en-CA', { minimumFractionDigits: sku.priceCad % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  }
  return `CAD ${sku.priceCad.min.toLocaleString('en-CA')}–${sku.priceCad.max.toLocaleString('en-CA')}`;
}

export const CEIP_PRICING = {
  direct: {
    free: 0,
    consumer_watchdog: 9,
    professional: 149,
    industrial_tier: 1500,
    municipal: 5900,
    sovereign: 2500,
  },
  whop: {
    whop_basic: 29,
    whop_pro: 99,
    whop_team: 299,
  },
  currency: 'USD' as const,
};

export const PLAN_PRICES: Record<PlanPrice['code'], PlanPrice> = {
  free: { code: 'free', price: CEIP_PRICING.direct.free, currency: 'USD', interval: 'forever' },
  consumer_watchdog: {
    code: 'consumer_watchdog',
    price: CEIP_PRICING.direct.consumer_watchdog,
    currency: 'USD',
    interval: 'month',
  },
  professional: {
    code: 'professional',
    price: CEIP_PRICING.direct.professional,
    currency: 'USD',
    interval: 'month',
  },
  industrial_tier: {
    code: 'industrial_tier',
    price: CEIP_PRICING.direct.industrial_tier,
    currency: 'USD',
    interval: 'month',
  },
  municipal: {
    code: 'municipal',
    price: CEIP_PRICING.direct.municipal,
    currency: 'USD',
    interval: 'month',
  },
  sovereign: {
    code: 'sovereign',
    price: CEIP_PRICING.direct.sovereign,
    currency: 'USD',
    interval: 'month',
  },
  whop_basic: {
    code: 'whop_basic',
    price: CEIP_PRICING.whop.whop_basic,
    currency: 'USD',
    interval: 'month',
  },
  whop_pro: {
    code: 'whop_pro',
    price: CEIP_PRICING.whop.whop_pro,
    currency: 'USD',
    interval: 'month',
  },
  whop_team: {
    code: 'whop_team',
    price: CEIP_PRICING.whop.whop_team,
    currency: 'USD',
    interval: 'month',
  },
};

export function getPlanPrice(code: PlanPrice['code']): PlanPrice {
  return PLAN_PRICES[code];
}

/**
 * Format a USD amount with the explicit currency code and no bare `$` — every
 * catalog amount reads "USD 1,500" — code first, no duplicated or bare sign.
 */
export function formatUsd(price: number): string {
  return `USD ${price.toLocaleString('en-US')}`;
}
