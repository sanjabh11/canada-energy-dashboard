/**
 * Whop Webhook Handler - Supabase Edge Function
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

// Environment variables
const WHOP_WEBHOOK_SECRET = Deno.env.get('WHOP_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Whop event types we care about
type WhopEventType =
    | 'membership.went_valid'
    | 'membership.went_invalid'
    | 'payment.succeeded'
    | 'payment.failed';

interface WhopWebhookPayload {
    action: WhopEventType;
    data: {
        id: string;
        user_id: string;
        email?: string;
        product_id: string;
        status: string;
        valid: boolean;
        license_key?: string;
        metadata?: Record<string, string>;
        created_at: number;
        expires_at?: number;
    };
}

// Tier mapping based on Whop product IDs
const PRODUCT_TIER_MAP: Record<string, string> = {
    'pass_WATCHDOG_PRODUCT_ID': 'basic',
    'pass_BASIC_PRODUCT_ID': 'basic',
    'pass_PRO_PRODUCT_ID': 'pro',
    'pass_TEAM_PRODUCT_ID': 'team'
};

serve(async (req) => {
    // Only accept POST
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Get raw body for signature verification
        const rawBody = await req.text();

        // Verify signature (HMAC-SHA256)
        const signature = req.headers.get('whop-signature');
        if (!await verifySignature(rawBody, signature, WHOP_WEBHOOK_SECRET)) {
            console.error('[whop-webhook] Invalid signature');
            return new Response('Invalid signature', { status: 401 });
        }

        // Parse payload
        const payload: WhopWebhookPayload = JSON.parse(rawBody);
        console.log(`[whop-webhook] Received event: ${payload.action}`);

        // Initialize Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Check idempotency (have we processed this event before?)
        const eventId = `${payload.action}_${payload.data.id}_${payload.data.created_at}`;
        const { data: existingEvent } = await supabase
            .from('webhook_events')
            .select('id')
            .eq('event_id', eventId)
            .single();

        if (existingEvent) {
            console.log(`[whop-webhook] Duplicate event, skipping: ${eventId}`);
            return new Response(JSON.stringify({ status: 'duplicate' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Process the event
        let result: { success: boolean; message: string };

        switch (payload.action) {
            case 'membership.went_valid':
                result = await handleMembershipActivated(supabase, payload);
                break;
            case 'membership.went_invalid':
                result = await handleMembershipDeactivated(supabase, payload);
                break;
            case 'payment.succeeded':
                result = await handlePaymentSucceeded(supabase, payload);
                break;
            case 'payment.failed':
                result = await handlePaymentFailed(supabase, payload);
                break;
            default:
                console.log(`[whop-webhook] Unhandled event type: ${payload.action}`);
                result = { success: true, message: 'Event type not handled' };
        }

        // Record event for idempotency
        await supabase.from('webhook_events').insert({
            event_id: eventId,
            event_type: payload.action,
            provider: 'whop',
            processed_at: new Date().toISOString(),
            success: result.success,
            payload: rawBody
        });

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[whop-webhook] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleMembershipActivated(
    supabase: any,
    payload: WhopWebhookPayload
): Promise<{ success: boolean; message: string }> {
    const { data } = payload;

    // Determine tier from product
    const tier = PRODUCT_TIER_MAP[data.product_id] || 'basic';

    // Get internal user ID from metadata (if we injected it during checkout)
    const internalUserId = data.metadata?.user_id || data.user_id;

    // Calculate expiry (Whop uses Unix timestamps)
    const expiryDate = data.expires_at
        ? new Date(data.expires_at * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

    // Upsert entitlement record
    const { error } = await supabase
        .from('entitlements')
        .upsert({
            user_id: internalUserId,
            whop_user_id: data.user_id,
            tier,
            status: 'active',
            provider: 'whop',
            provider_id: data.id,
            product_id: data.product_id,
            expiry_date: expiryDate,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'whop_user_id'
        });

    if (error) {
        console.error('[whop-webhook] Entitlement upsert error:', error);
        return { success: false, message: error.message };
    }

    console.log(`[whop-webhook] Activated membership for user ${internalUserId}, tier: ${tier}`);
    return { success: true, message: `Membership activated: ${tier}` };
}

async function handleMembershipDeactivated(
    supabase: any,
    payload: WhopWebhookPayload
): Promise<{ success: boolean; message: string }> {
    const { data } = payload;

    const { error } = await supabase
        .from('entitlements')
        .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
        })
        .eq('whop_user_id', data.user_id);

    if (error) {
        console.error('[whop-webhook] Deactivation error:', error);
        return { success: false, message: error.message };
    }

    console.log(`[whop-webhook] Deactivated membership for Whop user ${data.user_id}`);
    return { success: true, message: 'Membership deactivated' };
}

async function handlePaymentSucceeded(
    supabase: any,
    payload: WhopWebhookPayload
): Promise<{ success: boolean; message: string }> {
    const { data } = payload;

    // Log payment for records
    await supabase.from('payments').insert({
        whop_payment_id: data.id,
        whop_user_id: data.user_id,
        product_id: data.product_id,
        status: 'succeeded',
        provider: 'whop',
        created_at: new Date().toISOString()
    });

    console.log(`[whop-webhook] Payment succeeded for Whop user ${data.user_id}`);
    return { success: true, message: 'Payment recorded' };
}

async function handlePaymentFailed(
    supabase: any,
    payload: WhopWebhookPayload
): Promise<{ success: boolean; message: string }> {
    const { data } = payload;

    // Update entitlement status
    await supabase
        .from('entitlements')
        .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
        })
        .eq('whop_user_id', data.user_id);

    console.log(`[whop-webhook] Payment failed for Whop user ${data.user_id}`);
    return { success: true, message: 'Payment failure recorded' };
}

// ============================================================================
// SIGNATURE VERIFICATION (HMAC-SHA256)
// ============================================================================
//
// WHY THIS MATTERS FOR WHOP ECOSYSTEM:
// 
// 1. SECURITY: Prevents malicious actors from spoofing webhook events.
//    Without verification, anyone could POST fake "payment.succeeded" events.
//
// 2. INTEGRITY: Ensures the payload hasn't been tampered with in transit.
//    HMAC creates a cryptographic hash that changes if any byte is modified.
//
// 3. AUTHENTICATION: Proves the webhook came from Whop (they have the secret).
//    Only Whop servers can generate a valid signature.
//
// 4. WHOP COMPLIANCE: Required per whop_criterias.md Section 6.2:
//    "Signature Verification: Strictly validate the whop-signature header."
//
// HOW IT WORKS:
// - Whop signs each webhook with: HMAC-SHA256(payload, webhook_secret)
// - We receive: { payload, signature in header }
// - We recompute: HMAC-SHA256(payload, our_secret)
// - If signatures match → authentic webhook
// ============================================================================

/**
 * Verify Whop webhook signature using HMAC-SHA256
 * 
 * @param payload - Raw request body as string
 * @param signature - Value from 'whop-signature' header
 * @param secret - WHOP_WEBHOOK_SECRET from environment
 * @returns Promise<boolean> - true if signature is valid
 */
async function verifySignature(
    payload: string,
    signature: string | null,
    secret: string
): Promise<boolean> {
    // If no secret configured, skip verification (dev mode only)
    if (!secret) {
        console.warn('[whop-webhook] ⚠️ No WHOP_WEBHOOK_SECRET set, skipping verification (DEV MODE)');
        return true;
    }

    // Signature must be present in production
    if (!signature) {
        console.error('[whop-webhook] ❌ Missing whop-signature header');
        return false;
    }

    try {
        // Parse the signature header
        // Whop format: "v1=<hex_signature>" or just "<hex_signature>"
        let signatureHex = signature;
        if (signature.startsWith('v1=')) {
            signatureHex = signature.substring(3);
        } else if (signature.includes('=')) {
            // Handle "sha256=<hex>" format
            signatureHex = signature.split('=')[1];
        }

        // Convert secret and payload to bytes
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const payloadData = encoder.encode(payload);

        // Import the secret key for HMAC
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify']
        );

        // Compute HMAC-SHA256
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);

        // Convert to hex string
        const computedSignatureHex = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Timing-safe comparison
        const isValid = timingSafeEqual(computedSignatureHex, signatureHex.toLowerCase());

        if (!isValid) {
            console.error('[whop-webhook] ❌ Signature mismatch');
            console.error(`  Expected: ${computedSignatureHex.substring(0, 20)}...`);
            console.error(`  Received: ${signatureHex.substring(0, 20)}...`);
        } else {
            console.log('[whop-webhook] ✅ Signature verified successfully');
        }

        return isValid;

    } catch (error) {
        console.error('[whop-webhook] Signature verification error:', error);
        return false;
    }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

