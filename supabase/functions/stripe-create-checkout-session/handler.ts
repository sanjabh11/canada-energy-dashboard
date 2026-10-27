/**
 * Stripe Checkout Session — testable request handler.
 *
 * Split from index.ts so the module stays importable under Node/vitest:
 * this file must NEVER import `https://`/`npm:` specifiers (Deno-only
 * modules live in index.ts, which wires env + Supabase auth + rate
 * limiting and delegates here).
 *
 * Kill switch (Codex audit — checkout must be default-off):
 *   `config.checkoutEnabled` is the raw CEIP_CHECKOUT_ENABLED env value.
 *   It must equal EXACTLY the string "true" for a checkout session to be
 *   creatable. Anything else — unset, "", "1", "TRUE", "yes" — returns
 *   403 { error: "checkout_disabled" } as the FIRST check in the handler,
 *   before auth, Supabase, or Stripe network calls, so even valid
 *   credentials cannot create a session while disabled.
 */
import { handleCorsOptions, withCors } from "../_shared/cors.ts";

export interface StripeCheckoutUser {
  id?: string;
  email?: string | null;
}

export interface StripeCheckoutConfig {
  /** Raw CEIP_CHECKOUT_ENABLED env value — hard gate, must be exactly 'true'. */
  checkoutEnabled: string | undefined;
  /**
   * Legacy inner gate (STRIPE_CHECKOUT_ENABLED env value, exactly 'true').
   * Kept as a second default-off switch; both must be enabled.
   */
  stripeCheckoutEnabled: string | undefined;
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripeSecretKey: string;
  priceEdubiz: string;
  pricePro: string;
  /** Raw FRONTEND_BASE_URL env value; validated before use. */
  frontendBaseUrl: string;
  /** Injectable fetch for the Stripe API call — tests assert it is never invoked while gated. */
  fetchImpl?: typeof fetch;
  /**
   * Injectable bearer-token verification (production wires this to
   * Supabase `auth.getUser`). Missing impl fails closed (401).
   */
  verifyBearerToken?: (token: string) => Promise<StripeCheckoutUser | null>;
}

/**
 * The hard gate decision. True ONLY for the exact string 'true' —
 * no truthiness, no case-folding, no coercion.
 */
export function isCheckoutEnabled(config: StripeCheckoutConfig): boolean {
  return config.checkoutEnabled === "true";
}

/** 403 denial emitted while checkout is disabled. */
export function checkoutDisabledResponse(req: Request): Response {
  return withCors(
    new Response(JSON.stringify({ error: "checkout_disabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
    req,
  );
}

async function getUserFromRequest(
  req: Request,
  config: StripeCheckoutConfig,
): Promise<StripeCheckoutUser | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token || !config.supabaseUrl || !config.supabaseAnonKey || !config.verifyBearerToken) {
    return null;
  }
  return config.verifyBearerToken(token);
}

async function createStripeCheckoutSession(
  params: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail: string | null;
    tier: string;
  },
  config: StripeCheckoutConfig,
) {
  const fetchImpl = config.fetchImpl ?? fetch;
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

  const res = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
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

export async function handleStripeCheckoutRequest(
  req: Request,
  config: StripeCheckoutConfig,
): Promise<Response> {
  // CEIP hard kill switch — the FIRST check, before CORS preflight
  // handling, auth, Supabase, or any Stripe call. A deployed function can
  // never create a real checkout session unless the operator sets
  // CEIP_CHECKOUT_ENABLED=true explicitly.
  if (!isCheckoutEnabled(config)) {
    return checkoutDisabledResponse(req);
  }

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
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

  // Sales-assisted/manual billing remains the only enabled path. An operator
  // must make an explicit server-side change before this handler can create
  // a checkout session. (Legacy gate — CEIP_CHECKOUT_ENABLED above is the
  // primary switch; both must be enabled.)
  if (config.stripeCheckoutEnabled !== "true") {
    return withCors(
      new Response(JSON.stringify({ error: "Checkout is not enabled" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return withCors(
      new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  if (!config.stripeSecretKey) {
    return withCors(
      new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  const user = await getUserFromRequest(req, config);
  if (!user) {
    return withCors(
      new Response(JSON.stringify({ error: "Unauthorized", message: "Missing or invalid session" }), {
        status: 401,
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
      priceId = config.priceEdubiz;
    } else if (tier === "pro") {
      priceId = config.pricePro;
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

    let base: URL;
    try {
      base = new URL(config.frontendBaseUrl);
    } catch {
      return withCors(
        new Response(JSON.stringify({ error: "Checkout return origin is not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }
    const localDev = base.hostname === "localhost" || base.hostname === "127.0.0.1";
    if (
      (base.protocol !== "https:" && !(localDev && base.protocol === "http:"))
      || base.username
      || base.password
      || base.pathname !== "/"
      || base.search
      || base.hash
    ) {
      return withCors(
        new Response(JSON.stringify({ error: "Checkout return origin is invalid" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }

    const returnUrl = (checkout: "success" | "cancelled") => {
      const url = new URL("/pricing", base.origin);
      url.searchParams.set("checkout", checkout);
      url.searchParams.set("tier", tier);
      return url.toString();
    };
    const successUrl = returnUrl("success");
    const cancelUrl = returnUrl("cancelled");

    const session = await createStripeCheckoutSession(
      {
        priceId,
        successUrl,
        cancelUrl,
        customerEmail: user.email || null,
        tier,
      },
      config,
    );

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
  } catch {
    console.error("stripe-create-checkout-session failed");
    return withCors(
      new Response(JSON.stringify({ error: "Failed to create Stripe checkout session" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }
}
