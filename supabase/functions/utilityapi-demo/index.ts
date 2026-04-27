import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsOptions } from "../_shared/cors.ts";
import { handleUtilityApiDemoRequest } from "../_shared/utilityApiDemoEndpoint.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const liveEnabled = (Deno.env.get("UTILITYAPI_DEMO_LIVE_ENABLED") ?? "").toLowerCase() === "true";
  const operatorEmailAllowlist = Deno.env.get("UTILITYAPI_DEMO_OPERATOR_EMAIL_ALLOWLIST") ?? "";
  const monthlyStartBudget = Number(Deno.env.get("UTILITYAPI_DEMO_MONTHLY_START_BUDGET") ?? "10");

  return handleUtilityApiDemoRequest(req, {
    apiToken: Deno.env.get("UTILITYAPI_DEMO_API_TOKEN") ?? "",
    formUid: Deno.env.get("UTILITYAPI_DEMO_FORM_UID") ?? "",
    liveEnabled,
    operatorEmailAllowlist,
    monthlyStartBudget: Number.isFinite(monthlyStartBudget) ? monthlyStartBudget : 10,
  });
});
