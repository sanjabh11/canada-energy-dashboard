/**
 * Whop Webhook Handler — testable request handler.
 *
 * Split from index.ts so the module stays importable under Node/vitest:
 * this file must NEVER import `https://`/`npm:` specifiers or touch the
 * `Deno` global. Deno-only wiring (env reads, `serve`, the real
 * service-role Supabase client) lives in index.ts, which delegates to
 * `handleWhopWebhookRequest` here.
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
 */

// Whop event types we care about
export type WhopEventType =
    | 'membership.went_valid'
    | 'membership.went_invalid'
    | 'payment.succeeded'
    | 'payment.failed';

export interface WhopWebhookPayload {
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

/**
 * Minimal structural surface of the supabase-js client this handler uses.
 * The query-builder return is intentionally `any` so tests can inject a
 * lightweight recording stub without replicating PostgREST generics.
 */
export interface WhopSupabaseClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(table: string): any;
}

/**
 * Factory for the service-role Supabase client. index.ts wires this to
 * supabase-js `createClient`; tests inject a stub that records calls.
 */
export type WhopSupabaseClientFactory = (
    supabaseUrl: string,
    serviceRoleKey: string,
) => WhopSupabaseClient;

export interface WhopWebhookConfig {
    /** Raw WHOP_WEBHOOK_SECRET env value — empty/unset fails closed (401). */
    whopWebhookSecret: string;
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
    /**
     * Whop product_id → canonical tier (free/basic/pro/team), parsed from
     * VITE_WHOP_PRODUCT_* env vars in index.ts. Unknown product_ids fall
     * back to 'free' at dispatch time.
     */
    productTierMap: Record<string, string>;
    /**
     * Injectable fetch — index.ts forwards it to the Supabase client
     * factory (global.fetch) so network calls can be stubbed in tests.
     */
    fetchImpl?: typeof fetch;
    /** Service-role Supabase client factory (createClient in prod, stub in tests). */
    createClient: WhopSupabaseClientFactory;
}

export async function handleWhopWebhookRequest(
    req: Request,
    config: WhopWebhookConfig,
): Promise<Response> {
    // Only accept POST
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Get raw body for signature verification
        const rawBody = await req.text();

        // Verify signature (HMAC-SHA256) — BEFORE parsing or dispatching
        const signature = req.headers.get('whop-signature');
        if (!await verifySignature(rawBody, signature, config.whopWebhookSecret)) {
            console.error('[whop-webhook] Invalid signature');
            return new Response('Invalid signature', { status: 401 });
        }

        // Parse payload
        const payload: WhopWebhookPayload = JSON.parse(rawBody);
        console.log(`[whop-webhook] Received event: ${payload.action}`);

        // Initialize Supabase client
        const supabase = config.createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

        // Check idempotency (have we processed this event before?)
        const eventId = `${payload.action}_${payload.data.id}_${payload.data.created_at}`;
        const { data: existingEvent } = await supabase
            .from('webhook_events')
            .select('id')
            .eq('event_id', eventId)
            .single();

        if (existingEvent) {
            console.log('[whop-webhook] Duplicate event, skipping');
            return new Response(JSON.stringify({ status: 'duplicate' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Process the event
        let result: { success: boolean; message: string };

        switch (payload.action) {
            case 'membership.went_valid':
                result = await handleMembershipActivated(supabase, payload, config);
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
                // Deliberately no 'verify_token' action: end-user token
                // verification lives in the whop-verify-access function.
                // An unauthenticated POST here already fails the
                // whop-signature check above; a signed-but-unknown action
                // is acknowledged as unhandled without echoing payload data.
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
            // Keep only the identifier needed for idempotency. The raw event
            // may contain email, user identifiers, or license data.
            payload: null
        });

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch {
        console.error('[whop-webhook] Request failed');
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleMembershipActivated(
    supabase: WhopSupabaseClient,
    payload: WhopWebhookPayload,
    config: WhopWebhookConfig,
): Promise<{ success: boolean; message: string }> {
    const { data } = payload;

    // Map product to tier (canonical tier model: free/basic/pro/team)
    const productId = data.product_id;
    const tier = config.productTierMap[productId] || 'free';

    // Validate tier is canonical
    if (!['free', 'basic', 'pro', 'team'].includes(tier)) {
        console.warn(`[Whop Webhook] Unknown tier '${tier}' for product ${productId}, defaulting to free`);
    }

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
        console.error('[whop-webhook] Entitlement upsert failed');
        return { success: false, message: error.message };
    }

    console.log(`[whop-webhook] Membership activated; tier: ${tier}`);
    return { success: true, message: `Membership activated: ${tier}` };
}

async function handleMembershipDeactivated(
    supabase: WhopSupabaseClient,
    payload: WhopWebhookPayload,
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
        console.error('[whop-webhook] Deactivation failed');
        return { success: false, message: error.message };
    }

    console.log('[whop-webhook] Membership deactivated');
    return { success: true, message: 'Membership deactivated' };
}

async function handlePaymentSucceeded(
    supabase: WhopSupabaseClient,
    payload: WhopWebhookPayload,
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

    console.log('[whop-webhook] Payment succeeded');
    return { success: true, message: 'Payment recorded' };
}

async function handlePaymentFailed(
    supabase: WhopSupabaseClient,
    payload: WhopWebhookPayload,
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

    console.log('[whop-webhook] Payment failed');
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
    // Never skip verification — reject if secret is not configured
    if (!secret) {
        console.error('[whop-webhook] WHOP_WEBHOOK_SECRET not configured — rejecting webhook');
        return false;
    }

    // Signature must be present in production
    if (!signature) {
        console.error('[whop-webhook] Missing whop-signature header');
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
            console.error('[whop-webhook] Signature mismatch');
        } else {
            console.log('[whop-webhook] Signature verified successfully');
        }

        return isValid;

    } catch {
        console.error('[whop-webhook] Signature verification error');
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
