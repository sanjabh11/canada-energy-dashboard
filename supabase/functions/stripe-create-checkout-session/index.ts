import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCorsOptions, withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("EDGE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

const STRIPE_SECRET_KEY = Deno.env.get("Stripe_SecretKey") || Deno.env.get("STRIPE_SECRET_KEY") || "";
const PRICE_EDUBIZ = Deno.env.get("STRIPE_PRICE_EDUBIZ") || "";
const PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO") || "";

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token || !SUPABASE_URL || !ANON_KEY) {
    return null;
  }

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return null;
  }
  return data.user;
}

async function createStripeCheckoutSession(params: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string | null;
  tier: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("line_items[0][price]", params.priceId);
  body.set("line_items[0][quantity]", "1");
  if (params.customerEmail) {
    body.set("customer_email", params.customerEmail);
  }
  body.set("metadata[supabase_tier]", params.tier);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (json && json.error && json.error.message) || "Failed to create Stripe checkout session";
    return { ok: false as const, status: res.status, message };
  }

  return {
    ok: true as const,
    status: res.status,
    url: json?.url as string | undefined,
    id: json?.id as string | undefined,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  if (!SUPABASE_URL || !ANON_KEY) {
    return withCors(
      new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  if (!STRIPE_SECRET_KEY) {
    return withCors(
      new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return withCors(
      new Response(JSON.stringify({ error: "Unauthorized", message: "Missing or invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  if (req.method !== "POST") {
    return withCors(
      new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawTier = typeof body.tier === "string" ? body.tier : "edubiz";
    const tier = rawTier === "pro" ? "pro" : "edubiz";

    let priceId = "";
    if (tier === "edubiz") {
      priceId = PRICE_EDUBIZ;
    } else if (tier === "pro") {
      priceId = PRICE_PRO;
    }

    if (!priceId) {
      return withCors(
        new Response(JSON.stringify({ error: `Stripe price not configured for tier ${tier}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }

    const originHeader = req.headers.get("origin") || "";
    const base = (typeof body.successBase === "string" && body.successBase.length > 0
      ? body.successBase
      : Deno.env.get("FRONTEND_BASE_URL") || originHeader || "http://localhost:5173").replace(/\/$/, "");

    const successUrl = typeof body.successUrl === "string" && body.successUrl.length > 0
      ? body.successUrl
      : `${base}/pricing?checkout=success&tier=${tier}`;

    const cancelUrl = typeof body.cancelUrl === "string" && body.cancelUrl.length > 0
      ? body.cancelUrl
      : `${base}/pricing?checkout=cancelled&tier=${tier}`;

    const session = await createStripeCheckoutSession({
      priceId,
      successUrl,
      cancelUrl,
      customerEmail: (user as any).email || null,
      tier,
    });

    if (!session.ok) {
      return withCors(
        new Response(JSON.stringify({ error: session.message }), {
          status: session.status || 400,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }

    if (!session.url) {
      return withCors(
        new Response(JSON.stringify({ error: "Stripe did not return a checkout URL" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }

    return withCors(
      new Response(JSON.stringify({ url: session.url, id: session.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  } catch (err) {
    console.error("stripe-create-checkout-session error", err);
    return withCors(
      new Response(JSON.stringify({ error: "Failed to create Stripe checkout session" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }
});
