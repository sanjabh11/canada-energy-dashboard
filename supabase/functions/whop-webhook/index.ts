/**
 * Whop Webhook Handler - Supabase Edge Function (thin bootstrap).
 *
 * All request behavior lives in ./handler.ts (Deno-free, unit-testable
 * under vitest). This file only wires Deno-specific pieces: `serve`,
 * env reads, and the real service-role Supabase client.
 *
 * WHOP PORTABILITY PATTERN (whop_criterias.md Section 6.2):
 * "Build a robust webhook handler for Whop events:
 *  - membership.activated
 *  - membership.deactivated
 *  - payment.succeeded
 *
 * Signature Verification: Strictly validate the whop-signature header.
 * Idempotency: Ensure the handler can process the same webhook twice."
 *
 * Endpoint: POST /functions/v1/whop-webhook
 *
 * Setup in Whop Dashboard:
 *   1. Go to Developer Settings → Webhooks
 *   2. Add endpoint: https://your-project.supabase.co/functions/v1/whop-webhook
 *   3. Copy webhook secret to WHOP_WEBHOOK_SECRET env var
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    handleWhopWebhookRequest,
    type WhopWebhookConfig,
} from './handler.ts';

// Whop product_id → canonical tier map, sourced from VITE_WHOP_PRODUCT_*
// env vars (the same vars the frontend uses to build checkout links).
function buildProductTierMap(): Record<string, string> {
    const map: Record<string, string> = {};

    const basicProductId = Deno.env.get('VITE_WHOP_PRODUCT_BASIC');
    const proProductId = Deno.env.get('VITE_WHOP_PRODUCT_PRO');
    const teamProductId = Deno.env.get('VITE_WHOP_PRODUCT_TEAM');

    if (basicProductId) map[basicProductId] = 'basic';
    if (proProductId) map[proProductId] = 'pro';
    if (teamProductId) map[teamProductId] = 'team';

    return map;
}

/**
 * Build the handler config from the Deno env. Env is read per-request
 * (not at module load) so operator changes take effect on the next
 * invocation.
 */
function configFromDenoEnv(): WhopWebhookConfig {
    const fetchImpl = fetch;
    return {
        whopWebhookSecret: Deno.env.get('WHOP_WEBHOOK_SECRET') || '',
        supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
        supabaseServiceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        productTierMap: buildProductTierMap(),
        fetchImpl,
        createClient: (supabaseUrl, serviceRoleKey) =>
            createClient(supabaseUrl, serviceRoleKey, {
                global: { fetch: fetchImpl },
            }),
    };
}

serve((req) => handleWhopWebhookRequest(req, configFromDenoEnv()));
