export type ExportPrincipalType = "api_key" | "jwt_user";

export interface ExportEntitlementResult {
  allowed: boolean;
  status: number;
  reason?: string;
  principalType?: ExportPrincipalType;
  principalId?: string;
  requestedBy?: string | null;
  canForceExport: boolean;
  entitlementSnapshot: Record<string, unknown>;
}

const PAID_API_KEY_TIERS = new Set([
  "basic",
  "starter",
  "pro",
  "team",
  "growth",
  "enterprise",
  "professional",
  "industrial",
  "municipal",
  "sovereign",
]);

const FORCE_EXPORT_TIERS = new Set([
  "pro",
  "team",
  "enterprise",
  "professional",
  "industrial",
  "municipal",
  "sovereign",
]);

function isExpiryValid(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

function isPaidTier(tierRaw: string | null | undefined): boolean {
  if (!tierRaw) return false;
  return PAID_API_KEY_TIERS.has(tierRaw.toLowerCase());
}

function canForceByTier(tierRaw: string | null | undefined): boolean {
  if (!tierRaw) return false;
  return FORCE_EXPORT_TIERS.has(tierRaw.toLowerCase());
}

export async function verifyExportEntitlement(
  req: Request,
  supabase: any
): Promise<ExportEntitlementResult> {
  const apikeyHeader = req.headers.get("apikey")?.trim() || "";
  const authHeader = req.headers.get("authorization")?.trim() || "";

  if (apikeyHeader) {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, api_key, label, is_active, expires_at, tier, created_by")
      .eq("api_key", apikeyHeader)
      .maybeSingle();
    const row = data as any;

    if (error || !row) {
      return {
        allowed: false,
        status: 403,
        reason: "Invalid API key.",
        canForceExport: false,
        entitlementSnapshot: { method: "api_key", valid: false },
      };
    }

    const active = Boolean(row.is_active) && isExpiryValid(row.expires_at ?? null);
    const tier = (row.tier ?? "free").toLowerCase();
    const paid = active && isPaidTier(tier);

    return {
      allowed: paid,
      status: paid ? 200 : 403,
      reason: paid ? undefined : "API key tier is not entitled for official exports.",
      principalType: "api_key",
      principalId: String(row.id),
      requestedBy: row.created_by ?? null,
      canForceExport: active && canForceByTier(tier),
      entitlementSnapshot: {
        method: "api_key",
        key_id: row.id,
        key_label: row.label ?? null,
        tier,
        is_active: row.is_active,
        expires_at: row.expires_at,
      },
    };
  }

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      return {
        allowed: false,
        status: 403,
        reason: "Missing bearer token.",
        canForceExport: false,
        entitlementSnapshot: { method: "jwt", valid: false },
      };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user ?? null;
    if (userError || !user) {
      return {
        allowed: false,
        status: 403,
        reason: "Invalid bearer token.",
        canForceExport: false,
        entitlementSnapshot: { method: "jwt", valid: false },
      };
    }

    const { data: entitlement, error: entitlementError } = await supabase
      .from("entitlements")
      .select("id, tier, status, expiry_date, provider")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const entitlementRow = entitlement as any;

    if (entitlementError || !entitlementRow) {
      return {
        allowed: false,
        status: 403,
        reason: "No active entitlement found for this user.",
        canForceExport: false,
        entitlementSnapshot: {
          method: "jwt",
          user_id: user.id,
          entitlement_found: false,
        },
      };
    }

    const tier = (entitlementRow.tier ?? "free").toLowerCase();
    const entitlementActive = isExpiryValid(entitlementRow.expiry_date ?? null) && tier !== "free";

    return {
      allowed: entitlementActive,
      status: entitlementActive ? 200 : 403,
      reason: entitlementActive ? undefined : "Entitlement is inactive or free tier.",
      principalType: "jwt_user",
      principalId: user.id,
      requestedBy: user.id,
      canForceExport: canForceByTier(tier),
      entitlementSnapshot: {
        method: "jwt",
        user_id: user.id,
        entitlement_id: entitlementRow.id,
        tier,
        status: entitlementRow.status,
        provider: entitlementRow.provider,
        expiry_date: entitlementRow.expiry_date,
      },
    };
  }

  return {
    allowed: false,
    status: 403,
    reason: "Missing API key or bearer token.",
    canForceExport: false,
    entitlementSnapshot: { method: "none", valid: false },
  };
}
