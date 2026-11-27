// Allowlist for persisted tier-simulator request bodies. The endpoint is
// unauthenticated, so only scenario-meaningful fields may reach
// ml_alert_evaluations — arbitrary caller fields are dropped.
const TIER_INPUT_KEYS = new Set([
  "annualEmissionsTonnes", "annual_emissions_tonnes",
  "benchmarkExceedanceTonnes", "benchmark_exceedance_tonnes",
  "directInvestmentCapexCad", "direct_investment_capex_cad",
  "complianceYear", "compliance_year",
  "asOfDate", "as_of_date",
  "discountRate", "discount_rate",
  "creditAssumptions", "credit_assumptions",
]);

const TIER_ASSUMPTION_KEYS = new Set([
  "fundPriceCadPerTonne", "fund_price_cad_per_tonne",
  "marketCreditPriceCadPerTonne", "market_credit_price_cad_per_tonne",
  "directInvestmentCreditRate", "direct_investment_credit_rate",
  "lastVerifiedAt", "last_verified_at",
]);

// Scalar length caps — unbounded caller strings must not reach persisted
// input_payload or (via engine metadata) result_payload. Scenario scalars are
// small; a generous cap still bounds the stored row.
const MAX_TOP_LEVEL_STRING = 512;
const MAX_ASSUMPTION_STRING = 64;

const isScalarValue = (value: unknown): boolean =>
  value == null || ["string", "number", "boolean"].includes(typeof value);

const isBoundedScalar = (value: unknown, maxString: number): boolean =>
  isScalarValue(value) && (typeof value !== "string" || value.length <= maxString);

const pickKeys = (
  obj: unknown,
  allowed: Set<string>,
  scalarOnly = false,
  maxString = MAX_TOP_LEVEL_STRING,
): Record<string, unknown> =>
  obj && typeof obj === "object" && !Array.isArray(obj)
    ? Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).filter(
          ([key, value]) =>
            allowed.has(key) && (!scalarOnly || isBoundedScalar(value, maxString)),
        ),
      )
    : {};

const pickScenarioFields = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(pickKeys(obj, TIER_INPUT_KEYS)).filter(
      // Non-container keys carry scalars only — no arrays/objects into the DB.
      ([key, value]) =>
        key === "creditAssumptions" ||
        key === "credit_assumptions" ||
        isBoundedScalar(value, MAX_TOP_LEVEL_STRING),
    ),
  );

export function sanitizeTierInputPayload(body: Record<string, unknown>): Record<string, unknown> {
  const clean = pickScenarioFields(body);
  if (clean.creditAssumptions != null) {
    clean.creditAssumptions = pickKeys(clean.creditAssumptions, TIER_ASSUMPTION_KEYS, true, MAX_ASSUMPTION_STRING);
  }
  if (clean.credit_assumptions != null) {
    clean.credit_assumptions = pickKeys(clean.credit_assumptions, TIER_ASSUMPTION_KEYS, true, MAX_ASSUMPTION_STRING);
  }
  return clean;
}
