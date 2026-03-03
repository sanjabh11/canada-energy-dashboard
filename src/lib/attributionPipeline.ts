import { supabase } from './supabaseClient';
import type { GTMAttributionContract } from './gtm';
import { getAttributionContext } from './analytics';

const SESSION_KEY = 'ceip_gtm_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  localStorage.setItem(SESSION_KEY, generated);
  return generated;
}

export async function persistAttributionEvent(
  eventName: string,
  contract: GTMAttributionContract,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  const attribution = getAttributionContext();

  const payload = {
    event_name: eventName,
    session_id: getSessionId(),
    page_path: window.location.pathname,
    referrer: document.referrer || null,
    channel: contract.channel,
    segment: contract.segment,
    message_variant: contract.message_variant,
    cta: contract.cta,
    campaign_id: contract.campaign_id,
    metadata: {
      attribution_source: attribution?.source ?? null,
      attribution_medium: attribution?.medium ?? null,
      attribution_campaign: attribution?.campaign ?? null,
      attribution_content: attribution?.content ?? null,
      attribution_term: attribution?.term ?? null,
      landing_path: attribution?.landingPath ?? null,
      user_agent: navigator.userAgent,
      ...metadata,
    },
  };

  try {
    const { error } = await supabase.from('attribution_events').insert(payload);
    if (error && import.meta.env.DEV) {
      console.warn('[GTM] Failed to persist attribution event', error.message);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GTM] Attribution persistence skipped', error);
    }
  }
}
