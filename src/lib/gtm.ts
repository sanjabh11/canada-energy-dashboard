import { trackEvent } from './analytics';
import { persistAttributionEvent } from './attributionPipeline';

export type GTMChannel = 'whop' | 'direct' | 'partner' | 'organic' | 'paid';

export type GTMSegment =
  | 'whop_trading'
  | 'whop_business_ai'
  | 'consultancy'
  | 'municipal'
  | 'industrial'
  | 'mixed';

export interface GTMAttributionContract {
  channel: GTMChannel;
  segment: GTMSegment;
  message_variant: string;
  cta: string;
  campaign_id: string;
}

export interface RouteIntentTag extends GTMAttributionContract {
  route_key: 'whop_discover' | 'watchdog' | 'pricing' | 'enterprise';
  route_intent: string;
}

export const CHANNEL_ROLE_MATRIX = {
  whop: 'Wedge + trials + discovery',
  direct: 'Consultancy/municipal/industrial closes',
  partner: 'Referrals + channel leverage',
} as const;

export const ROUTE_INTENT_TAGS: Record<RouteIntentTag['route_key'], RouteIntentTag> = {
  whop_discover: {
    route_key: 'whop_discover',
    route_intent: 'whop_wedge_discovery',
    channel: 'whop',
    segment: 'whop_business_ai',
    message_variant: 'compliance_freshness_benchmark_v1',
    cta: 'start_learning_free',
    campaign_id: 'whop_discover_2026q1',
  },
  watchdog: {
    route_key: 'watchdog',
    route_intent: 'whop_wedge_trial',
    channel: 'whop',
    segment: 'whop_trading',
    message_variant: 'bill_savings_risk_v1',
    cta: 'subscribe_watchdog',
    campaign_id: 'watchdog_2026q1',
  },
  pricing: {
    route_key: 'pricing',
    route_intent: 'direct_offer_selection',
    channel: 'direct',
    segment: 'mixed',
    message_variant: 'compliance_freshness_benchmark_v1',
    cta: 'select_plan',
    campaign_id: 'pricing_2026q1',
  },
  enterprise: {
    route_key: 'enterprise',
    route_intent: 'direct_consult_demo',
    channel: 'direct',
    segment: 'consultancy',
    message_variant: 'consultancy_data_pack_v1',
    cta: 'contact_sales',
    campaign_id: 'enterprise_2026q1',
  },
};

export function trackRouteIntentView(
  routeKey: RouteIntentTag['route_key'],
  extraProps: Record<string, unknown> = {}
): void {
  const routeIntent = ROUTE_INTENT_TAGS[routeKey];
  trackEvent('gtm_route_intent_view', {
    ...routeIntent,
    ...extraProps,
  });

  void persistAttributionEvent('gtm_route_intent_view', routeIntent, extraProps);
}

export function trackRouteIntentCta(
  routeKey: RouteIntentTag['route_key'],
  cta: string,
  extraProps: Record<string, unknown> = {}
): void {
  const routeIntent = ROUTE_INTENT_TAGS[routeKey];
  const payload = {
    ...routeIntent,
    cta,
    ...extraProps,
  };

  trackEvent('gtm_route_intent_cta', payload);
  void persistAttributionEvent('gtm_route_intent_cta', { ...routeIntent, cta }, extraProps);
}
