export type DirectPlanCode =
  | 'free'
  | 'consumer_watchdog'
  | 'professional'
  | 'industrial_tier'
  | 'municipal'
  | 'sovereign';

export type WhopPlanCode = 'whop_basic' | 'whop_pro' | 'whop_team';

export interface PlanPrice {
  code: DirectPlanCode | WhopPlanCode;
  price: number;
  currency: 'USD';
  interval: 'month' | 'year' | 'one_time' | 'forever';
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
  consumer_watchdog: { code: 'consumer_watchdog', price: CEIP_PRICING.direct.consumer_watchdog, currency: 'USD', interval: 'month' },
  professional: { code: 'professional', price: CEIP_PRICING.direct.professional, currency: 'USD', interval: 'month' },
  industrial_tier: { code: 'industrial_tier', price: CEIP_PRICING.direct.industrial_tier, currency: 'USD', interval: 'month' },
  municipal: { code: 'municipal', price: CEIP_PRICING.direct.municipal, currency: 'USD', interval: 'month' },
  sovereign: { code: 'sovereign', price: CEIP_PRICING.direct.sovereign, currency: 'USD', interval: 'month' },
  whop_basic: { code: 'whop_basic', price: CEIP_PRICING.whop.whop_basic, currency: 'USD', interval: 'month' },
  whop_pro: { code: 'whop_pro', price: CEIP_PRICING.whop.whop_pro, currency: 'USD', interval: 'month' },
  whop_team: { code: 'whop_team', price: CEIP_PRICING.whop.whop_team, currency: 'USD', interval: 'month' },
};

export function getPlanPrice(code: PlanPrice['code']): PlanPrice {
  return PLAN_PRICES[code];
}

export function formatUsd(price: number): string {
  return `$${price.toLocaleString('en-US')}`;
}
