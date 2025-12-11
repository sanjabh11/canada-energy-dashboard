/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events to update user tiers after payment.
 * Endpoint: /functions/v1/stripe-webhook
 * 
 * Events handled:
 * - checkout.session.completed: Updates user tier after successful payment
 * - customer.subscription.updated: Handles tier changes
 * - customer.subscription.deleted: Downgrades user to free tier
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const STRIPE_SECRET_KEY = Deno.env.get("Stripe_SecretKey") || Deno.env.get("STRIPE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface StripeEvent {
    id: string;
    type: string;
    data: {
        object: Record<string, unknown>;
    };
}

/**
 * Verify Stripe webhook signature
 */
async function verifyStripeSignature(
    payload: string,
    signature: string,
    secret: string
): Promise<boolean> {
    if (!secret) {
        console.warn("No webhook secret configured, skipping signature verification");
        return true; // Skip verification if no secret (development only)
    }

    try {
        const parts = signature.split(",");
        const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
        const v1Signature = parts.find((p) => p.startsWith("v1="))?.slice(3);

        if (!timestamp || !v1Signature) {
            console.error("Invalid signature format");
            return false;
        }

        const signedPayload = `${timestamp}.${payload}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBytes = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(signedPayload)
        );

        const expectedSignature = Array.from(new Uint8Array(signatureBytes))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        return expectedSignature === v1Signature;
    } catch (error) {
        console.error("Signature verification error:", error);
        return false;
    }
}

/**
 * Get customer email from Stripe session
 */
async function getCustomerEmail(customerId: string): Promise<string | null> {
    if (!STRIPE_SECRET_KEY || !customerId) return null;

    try {
        const response = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
            headers: {
                Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            },
        });

        if (!response.ok) return null;
        const customer = await response.json();
        return customer.email || null;
    } catch (error) {
        console.error("Error fetching customer:", error);
        return null;
    }
}

/**
 * Update user tier in database
 */
async function updateUserTier(email: string, tier: string): Promise<boolean> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Supabase not configured");
        return false;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    // First, find the user by email in auth.users
    const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);

    if (userError || !users || users.length === 0) {
        // Try edubiz_users table directly
        const { data: edubizUsers, error: edubizError } = await supabase
            .from("edubiz_users")
            .update({ tier, updated_at: new Date().toISOString() })
            .eq("user_id", email) // Some systems store email as user_id
            .select();

        if (edubizError) {
            console.error("Error updating edubiz_users by email:", edubizError);
            return false;
        }

        if (edubizUsers && edubizUsers.length > 0) {
            console.log(`Updated tier for user ${email} to ${tier}`);
            return true;
        }

        console.warn(`No user found for email: ${email}`);
        return false;
    }

    const userId = users[0].id;

    // Update edubiz_users table
    const { error: updateError } = await supabase
        .from("edubiz_users")
        .upsert({
            user_id: userId,
            tier,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "user_id",
        });

    if (updateError) {
        console.error("Error updating edubiz_users:", updateError);
        return false;
    }

    console.log(`Updated tier for user ${userId} (${email}) to ${tier}`);
    return true;
}

serve(async (req) => {
    // Only allow POST
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const payload = await req.text();
        const signature = req.headers.get("stripe-signature") || "";

        // Verify signature
        const isValid = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET);
        if (!isValid) {
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const event: StripeEvent = JSON.parse(payload);
        console.log(`Received Stripe event: ${event.type}`);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Record<string, unknown>;
                const customerEmail = session.customer_email as string | null;
                const customerId = session.customer as string | null;
                const metadata = session.metadata as Record<string, string> | null;
                const tier = metadata?.supabase_tier || "edubiz";

                let email = customerEmail;
                if (!email && customerId) {
                    email = await getCustomerEmail(customerId);
                }

                if (email) {
                    const success = await updateUserTier(email, tier);
                    if (success) {
                        console.log(`✅ Checkout completed: ${email} upgraded to ${tier}`);
                    } else {
                        console.error(`❌ Failed to update tier for ${email}`);
                    }
                } else {
                    console.error("No customer email found in checkout session");
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Record<string, unknown>;
                const customerId = subscription.customer as string | null;
                const status = subscription.status as string;

                if (customerId && status === "active") {
                    const email = await getCustomerEmail(customerId);
                    if (email) {
                        // Determine tier from price/product (simplified)
                        const tier = "edubiz"; // Default, could parse from subscription items
                        await updateUserTier(email, tier);
                        console.log(`✅ Subscription updated: ${email} -> ${tier}`);
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Record<string, unknown>;
                const customerId = subscription.customer as string | null;

                if (customerId) {
                    const email = await getCustomerEmail(customerId);
                    if (email) {
                        await updateUserTier(email, "free");
                        console.log(`✅ Subscription cancelled: ${email} -> free`);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Webhook error:", error);
        return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
