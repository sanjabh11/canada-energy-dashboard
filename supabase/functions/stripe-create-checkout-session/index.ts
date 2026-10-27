import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import {
  checkoutDisabledResponse,
  handleStripeCheckoutRequest,
  isCheckoutEnabled,
  type StripeCheckoutConfig,
} from "./handler.ts";

/**
 * Build the handler config from the Deno env. Env is read per-request
 * (not at module load) so operator changes take effect on the next
 * invocation.
 */
function configFromDenoEnv(): StripeCheckoutConfig {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("EDGE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

  return {
    // Hard kill switch: must be EXACTLY the string "true" to enable.
    checkoutEnabled: Deno.env.get("CEIP_CHECKOUT_ENABLED"),
    // Legacy inner gate, kept as a second default-off switch.
    stripeCheckoutEnabled: Deno.env.get("STRIPE_CHECKOUT_ENABLED"),
    supabaseUrl,
    supabaseAnonKey: anonKey,
    stripeSecretKey: Deno.env.get("Stripe_SecretKey") || Deno.env.get("STRIPE_SECRET_KEY") || "",
    priceEdubiz: Deno.env.get("STRIPE_PRICE_EDUBIZ") || "",
    pricePro: Deno.env.get("STRIPE_PRICE_PRO") || "",
    frontendBaseUrl: Deno.env.get("FRONTEND_BASE_URL") || "",
    verifyBearerToken: async (token) => {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data, error } = await authClient.auth.getUser();
      if (error || !data?.user) {
        return null;
      }
      return data.user;
    },
  };
}

serve(async (req) => {
  const config = configFromDenoEnv();

  // CEIP_CHECKOUT_ENABLED gate at the very top — before rate limiting,
  // auth, Supabase, or Stripe — so even valid credentials cannot create a
  // checkout session while disabled. (The handler re-checks internally so
  // direct invocation cannot bypass it.)
  if (!isCheckoutEnabled(config)) {
    return checkoutDisabledResponse(req);
  }

  const rl = applyRateLimit(req, 'stripe-create-checkout-session');
  if (rl.response) return rl.response;

  return handleStripeCheckoutRequest(req, config);
});
