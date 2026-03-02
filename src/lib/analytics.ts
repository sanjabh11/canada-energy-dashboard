export interface AttributionContext {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  ref?: string;
  landingPath?: string;
  capturedAt: string;
}

export interface FunnelEventRecord {
  event: string;
  props: Record<string, unknown>;
  at: string;
}

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

const ATTRIBUTION_STORAGE_KEY = 'ceip_funnel_attribution';
const EVENT_LOG_STORAGE_KEY = 'ceip_funnel_events';
const MAX_STORED_EVENTS = 250;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getAttributionContext(): AttributionContext | null {
  if (typeof window === 'undefined') return null;
  return safeParse<AttributionContext | null>(localStorage.getItem(ATTRIBUTION_STORAGE_KEY), null);
}

export function bootstrapFunnelAttribution(): AttributionContext | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source') || params.get('source') || params.get('oc_source') || undefined;
  const medium = params.get('utm_medium') || params.get('oc_medium') || undefined;
  const campaign = params.get('utm_campaign') || params.get('campaign') || params.get('oc_campaign') || undefined;
  const content = params.get('utm_content') || undefined;
  const term = params.get('utm_term') || undefined;

  const hasAttribution = Boolean(source || medium || campaign || content || term);
  if (!hasAttribution) {
    return getAttributionContext();
  }

  const attribution: AttributionContext = {
    source,
    medium,
    campaign,
    content,
    term,
    ref: document.referrer || undefined,
    landingPath: `${window.location.pathname}${window.location.search}`,
    capturedAt: new Date().toISOString(),
  };

  localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}

function persistEvent(record: FunnelEventRecord): void {
  if (typeof window === 'undefined') return;
  const existing = safeParse<FunnelEventRecord[]>(localStorage.getItem(EVENT_LOG_STORAGE_KEY), []);
  existing.push(record);
  const trimmed = existing.slice(-MAX_STORED_EVENTS);
  localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(trimmed));
}

export function getFunnelEventLog(): FunnelEventRecord[] {
  if (typeof window === 'undefined') return [];
  return safeParse<FunnelEventRecord[]>(localStorage.getItem(EVENT_LOG_STORAGE_KEY), []);
}

export function trackEvent(event: string, props: Record<string, unknown> = {}): void {
  const attribution = getAttributionContext();
  const mergedProps: Record<string, unknown> = {
    ...props,
    ...(attribution
      ? {
          attribution_source: attribution.source,
          attribution_medium: attribution.medium,
          attribution_campaign: attribution.campaign,
          attribution_content: attribution.content,
          attribution_term: attribution.term,
        }
      : {}),
  };

  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    window.plausible(event, { props: mergedProps });
  } else if (typeof window !== 'undefined' && import.meta.env.DEV) {
    console.debug(`[Analytics] ${event}`, mergedProps);
  }

  persistEvent({
    event,
    props: mergedProps,
    at: new Date().toISOString(),
  });
}

// Alias for PricingPage.tsx compatibility
export { bootstrapFunnelAttribution as captureAttribution };
